import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { getCache, setCache, clearCache, TTL } from '../utils/cache.js';

export const getPublicStats = async (req, res) => {
  try {
    const cacheKey = 'stats:public';
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json(cached);

    const [totalProducts, totalUsers] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'customer' }),
    ]);

    const result = {
      success: true,
      totalProducts,
      totalUsers,
      totalCountries: 52,
      successRate: 99.4,
    };
    setCache(cacheKey, result, TTL.MEDIUM);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const cacheKey = 'admin:dashboard:stats';
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json(cached);

    const [totalOrders, totalRevenue, totalUsers, totalProducts] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments({ isActive: true }),
    ]);

    const recentOrders = await Order.find()
      .populate('customer', 'name email')
      .sort({ orderDate: -1 })
      .limit(5)
      .lean();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const revenueByMonth = await Order.aggregate([
      { $match: { status: 'completed', orderDate: { $gte: sixMonthsAgo } } },
      { $group: { _id: { month: { $month: '$orderDate' }, year: { $year: '$orderDate' } }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
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
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Error fetching stats', error: error.message });
  }
};

export const getAdminOrders = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'billingAddress.name': { $regex: search, $options: 'i' } },
        { 'billingAddress.email': { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customer', 'name email phone')
        .populate('items.product', 'title imageUrl')
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get admin orders error:', error);
    res.status(500).json({ success: false, message: 'Error fetching orders', error: error.message });
  }
};

export const adminUpdateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    if (notes) order.notes = notes;
    if (status === 'completed') {
      order.completedAt = new Date();
      order.paymentStatus = 'paid';
    } else if (status === 'cancelled') {
      order.cancelledAt = new Date();
    }
    await order.save();

    clearCache(`orders:id:${id}`);
    clearCache('admin:dashboard:stats');

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order,
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Error updating order', error: error.message });
  }
};