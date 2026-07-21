import Order from "../models/Order.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import { getCache, setCache, clearCache, TTL } from "../utils/cache.js";
import { sendOrderConfirmedMessage } from "../services/whatsappService.js";
function invalidateOrderCaches(userId) {
  clearCache("orders:admin");
  clearCache(`orders:user:${userId}`);
  clearCache(`billing:current:${userId}`);
  clearCache("billing:payment_status");
}
export const getOrders = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const cacheKey = isAdmin
      ? `orders:admin:status:${req.query.status || "all"}`
      : `orders:user:${req.user.id}:status:${req.query.status || "all"}`;
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json(cached);
    let query = {};
    if (!isAdmin) query.customer = req.user.id;
    if (req.query.status) query.status = req.query.status;
    const orders = await Order.find(query)
      .populate("customer", "name email phone")
      .populate("items.product", "title subtitle imageUrl fileFormats")
      .sort({ orderDate: -1 });
    const result = { success: true, count: orders.length, data: orders };
    setCache(cacheKey, result, TTL.SHORT);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: error.message,
    });
  }
};
export const getOrderById = async (req, res) => {
  try {
    const cacheKey = `orders:id:${req.params.id}`;
    const cached = getCache(cacheKey);
    if (cached) {
      if (req.user.role !== "admin" && cached.data.customer._id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view this order",
        });
      }
      return res.status(200).json(cached);
    }
    const order = await Order.findById(req.params.id)
      .populate("customer", "name email phone")
      .populate("items.product", "title subtitle imageUrl fileFormats");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (req.user.role !== "admin" && order.customer._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }
    const result = { success: true, data: order };
    setCache(cacheKey, result, TTL.SHORT);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching order",
      error: error.message,
    });
  }
};
export const createOrder = async (req, res) => {
  try {
    const { items, billingAddress, paymentMethod, notes } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: "Order must contain at least one item" });
    }
    const orderItems = [];
    let subtotal = 0;
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`,
        });
      }
      const price = product.salePrice || product.price;
      const quantity = item.quantity || 1;
      const itemSubtotal = price * quantity;
      orderItems.push({
        product: product._id,
        productName: product.title,
        productSubtitle: product.subtitle || "",
        quantity,
        priceAtPurchase: price,
        subtotal: itemSubtotal,
        fileFormats: product.fileFormats || [],
        licenseType: product.licenseType || "Commercial",
      });
      subtotal += itemSubtotal;
    }
    const taxRate = 0.20;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;
    const order = await Order.create({
      customer: req.user.id,
      items: orderItems,
      totalAmount,
      billingAddress: {
        name: billingAddress?.name || req.user.name,
        email: billingAddress?.email || req.user.email,
        phone: billingAddress?.phone || req.user.phone,
        company: billingAddress?.company || "",
        country: billingAddress?.country || "United States",
        vatNumber: billingAddress?.vatNumber || "",
      },
      paymentMethod,
      notes,
      status: "pending",
      paymentStatus: "pending",
    });
    await order.populate([
      { path: "items.product", select: "title subtitle imageUrl fileFormats" },
      { path: "customer", select: "name email phone" },
    ]);
    invalidateOrderCaches(req.user.id);
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
    if (order.customer?.phone) {
      sendOrderConfirmedMessage(order.customer.phone, {
        name: order.customer.name,
        orderId: order.orderNumber || order._id,
        items: order.items.map(item => ({
          name: item.productName,
          quantity: item.quantity,
        })),
        amount: order.totalAmount,
        address: "Digital delivery",
        payment: order.paymentMethod || "Online",
      }).catch(e => console.error("[WhatsApp] Order confirmation failed:", e.message));
    }
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating order",
      error: error.message,
    });
  }
};
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const validStatuses = ["pending", "processing", "completed", "cancelled", "refunded"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    order.status = status;
    if (status === "completed") {
      order.completedAt = new Date();
      order.paymentStatus = "paid";
    } else if (status === "cancelled") {
      order.cancelledAt = new Date();
    }
    await order.save();
    invalidateOrderCaches(order.customer.toString());
    clearCache(`orders:id:${req.params.id}`);
    res.status(200).json({
      success: true,
      message: "Order status updated",
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating order status",
      error: error.message,
    });
  }
};
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (req.user.role !== "admin" && order.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this order",
      });
    }
    if (!["pending", "processing"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel order in current status",
      });
    }
    order.status = "cancelled";
    order.cancelledAt = new Date();
    await order.save();
    invalidateOrderCaches(order.customer.toString());
    clearCache(`orders:id:${req.params.id}`);
    res.status(200).json({
      success: true,
      message: "Order cancelled",
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error cancelling order",
      error: error.message,
    });
  }
};
export const downloadFile = async (req, res) => {
  try {
    const { id, format } = req.params;
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (req.user.role !== "admin" && order.customer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    if (order.status !== "completed" && req.user.role !== "admin") {
      return res.status(400).json({ success: false, message: "Order must be completed" });
    }
    const product = await Product.findById(order.items[0]?.product);
    if (!product || !product.fileUrl) {
      return res.status(404).json({ success: false, message: "File not available" });
    }
    product.downloadCount = (product.downloadCount || 0) + 1;
    await product.save();
    const downloadUrl = product.fileUrl;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (!order.downloadUrls) order.downloadUrls = [];
    order.downloadUrls.push({
      fileFormat: format || "STL",
      url: downloadUrl,
      expiresAt,
      downloadCount: 1,
    });
    await order.save();
    res.status(200).json({
      success: true,
      downloadUrl,
      expiresAt,
      message: "File ready for download",
    });
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ success: false, message: "Error downloading file", error: error.message });
  }
};
export const getDashboardStats = async (req, res) => {
  try {
    const cacheKey = "admin:dashboard:stats";
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json(cached);
    const [totalOrders, totalRevenue, totalUsers, totalProducts] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([{ $match: { status: "completed" } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
      User.countDocuments({ role: "customer" }),
      Product.countDocuments({ isActive: true }),
    ]);
    const recentOrders = await Order.find()
      .populate("customer", "name email")
      .sort({ orderDate: -1 })
      .limit(5)
      .lean();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const revenueByMonth = await Order.aggregate([
      { $match: { status: "completed", orderDate: { $gte: sixMonthsAgo } } },
      { $group: { _id: { month: { $month: "$orderDate" }, year: { $year: "$orderDate" } }, revenue: { $sum: "$totalAmount" } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    const totalRevenueValue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;
    const result = {
      success: true,
      stats: {
        totalOrders,
        totalRevenue: totalRevenueValue,
        totalUsers,
        totalProducts,
      },
      recentOrders,
      revenueByMonth,
    };
    setCache(cacheKey, result, TTL.SHORT);
    res.status(200).json(result);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ success: false, message: "Error fetching stats", error: error.message });
  }
};