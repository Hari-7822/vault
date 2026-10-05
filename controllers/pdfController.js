import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import {
  generateInvoicePDF,
  generateWeeklySummaryPDF,
  generateDailyRequirementsPDF,
  generateDeliveryListPDF,
} from '../services/pdfService.js';

function formatDateForFile(dateStr) {
  try {
    return new Date(dateStr)
      .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      .replace(/ /g, '_');
  } catch { return 'date'; }
}

export const downloadInvoice = async (req, res) => {
  try {
    const { paymentId, date, plan, items = [] } = req.body;

    const deliveryFee = Number(req.body.deliveryFee) || 0;
    const platformFee = Number(req.body.platformFee) || 0;
    const packagingFee = Number(req.body.packagingFee) || 0;
    const shippingFee = Number(req.body.shippingFee) || 0;

    if (!date)
      return res.status(400).json({ success: false, message: 'date is required' });

    const subtotal = items.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0);
    const total = subtotal + deliveryFee + platformFee + packagingFee + shippingFee;

    const pdf = await generateInvoicePDF({
      paymentId, date, plan, items,
      subtotal, deliveryFee, platformFee, packagingFee, shippingFee, total,
    });

    res.setHeader('Content-Type', 'application/pdf');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${timestamp}.pdf"`);
    res.setHeader('Content-Length', Buffer.byteLength(pdf));
    return res.end(pdf);
  } catch (error) {
    console.error('Invoice generation error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate invoice' });
  }
};

export const downloadWeeklySummary = async (req, res) => {
  try {
    const { dateRange, invoiceNo, date, plan, items = [] } = req.body;

    const deliveryFee = Number(req.body.deliveryFee) || 0;
    const platformFee = Number(req.body.platformFee) || 0;
    const packagingFee = Number(req.body.packagingFee) || 0;
    const shippingFee = Number(req.body.shippingFee) || 0;

    if (!dateRange)
      return res.status(400).json({ success: false, message: 'dateRange is required' });

    const totalAmount =
      items.reduce((sum, i) => sum + Number(i.subtotal), 0) +
      deliveryFee + platformFee + packagingFee + shippingFee;

    const pdf = await generateWeeklySummaryPDF({
      dateRange, invoiceNo, date, plan, items,
      deliveryFee, platformFee, packagingFee, shippingFee, totalAmount,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="weekly_summary_${dateRange.replace(/\s/g, '_')}.pdf"`);
    res.setHeader('Content-Length', Buffer.byteLength(pdf));
    return res.end(pdf);
  } catch (error) {
    console.error('Weekly summary generation error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate weekly summary' });
  }
};

export const downloadDailyRequirements = async (req, res) => {
  try {
    const { date } = req.body;
    if (!date)
      return res.status(400).json({ success: false, message: 'date is required (YYYY-MM-DD)' });

    const dateStr = date.split('T')[0];
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    const nextDay = new Date(targetDate);
    nextDay.setUTCDate(targetDate.getUTCDate() + 1);

    const orderRequirements = await Order.aggregate([
      {
        $match: {
          status: { $in: ['pending', 'processing'] },
          orderDate: { $gte: targetDate, $lt: nextDay },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          quantity: { $sum: '$items.quantity' },
        },
      },
    ]);

    if (!orderRequirements.length)
      return res.status(200).json({ success: true, message: 'No deliveries scheduled for this day', count: 0 });

    const productIds = orderRequirements.map(r => r._id);
    const products = await Product.find({ _id: { $in: productIds } }).select('title');
    const productMap = Object.fromEntries(products.map(p => [String(p._id), p]));

    const items = orderRequirements
      .map(r => {
        const product = productMap[String(r._id)];
        if (!product) return null;
        return { name: product.title, unit: 'pcs', quantity: r.quantity };
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));

    const pdf = await generateDailyRequirementsPDF({ date: dateStr, items });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="daily_requirements_${formatDateForFile(dateStr)}.pdf"`);
    res.setHeader('Content-Length', Buffer.byteLength(pdf));
    return res.end(pdf);
  } catch (error) {
    console.error('Daily requirements PDF error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate PDF' });
  }
};

export const downloadAdminUserInvoice = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

    const user = await User.findById(userId).select('name email phone customerNumber').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const orders = await Order.find({ customer: userId, status: { $ne: 'cancelled' } })
      .populate('items.product', 'title')
      .sort({ orderDate: 1 });

    if (!orders.length)
      return res.status(200).json({ success: true, message: 'No orders found for this user', count: 0 });

    const allItems = [];
    let totalAmount = 0;
    orders.forEach(order => {
      const d = new Date(order.orderDate);
      const delDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      order.items.forEach(item => {
        allItems.push({
          name: item.productName || item.product?.title || 'Deleted Item',
          quantity: item.quantity,
          unit: 'pcs',
          price: item.priceAtPurchase,
          subtotal: item.subtotal,
          deliveryDate: delDateStr,
        });
      });
      totalAmount += order.totalAmount;
    });

    const invoiceNo = `ADM-${userId.toString().slice(-6).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const today = new Date();

    const pdf = await generateWeeklySummaryPDF({
      dateRange: `All Orders — ${user.name}`,
      invoiceNo,
      date: today.toISOString(),
      plan: `Customer: ${user.name}${user.customerNumber ? ` (#${user.customerNumber})` : ''}`,
      items: allItems,
      deliveryFee: 0,
      platformFee: 0,
      packagingFee: 0,
      shippingFee: 0,
      totalAmount,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${user.name.replace(/\s+/g, '_')}_${formatDateForFile(today.toISOString())}.pdf"`);
    res.setHeader('Content-Length', Buffer.byteLength(pdf));
    return res.end(pdf);
  } catch (error) {
    console.error('Admin user invoice error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate user invoice' });
  }
};

export const downloadAdminUserWeeklySummary = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

    const user = await User.findById(userId).select('name customerNumber').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const today = new Date();
    const currentDay = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      customer: userId,
      status: { $ne: 'cancelled' },
      orderDate: { $gte: startOfWeek, $lte: endOfWeek },
    })
      .populate('items.product', 'title')
      .sort({ orderDate: 1 });

    if (!orders.length)
      return res.status(200).json({ success: true, message: 'No orders for this user this week', count: 0 });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateRange = `${String(startOfWeek.getDate()).padStart(2, '0')} ${months[startOfWeek.getMonth()]} — ${String(endOfWeek.getDate()).padStart(2, '0')} ${months[endOfWeek.getMonth()]} ${endOfWeek.getFullYear()}`;

    let vegTotal = 0;
    const allItems = [];
    orders.forEach(order => {
      const d = new Date(order.orderDate);
      const delDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      order.items.forEach(item => {
        allItems.push({
          name: item.productName || item.product?.title || 'Deleted Item',
          quantity: item.quantity,
          unit: 'pcs',
          price: item.priceAtPurchase,
          subtotal: item.subtotal,
          deliveryDate: delDateStr,
        });
        vegTotal += item.subtotal;
      });
    });

    const totalAmount = vegTotal;
    const invoiceNo = `WKS-${userId.toString().slice(-6).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    const pdf = await generateWeeklySummaryPDF({
      dateRange,
      invoiceNo,
      date: today.toISOString(),
      plan: `Customer: ${user.name}${user.customerNumber ? ` (#${user.customerNumber})` : ''}`,
      items: allItems,
      deliveryFee: 0,
      platformFee: 0,
      packagingFee: 0,
      shippingFee: 0,
      totalAmount,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="weekly_summary_${user.name.replace(/\s+/g, '_')}_${formatDateForFile(today.toISOString())}.pdf"`);
    res.setHeader('Content-Length', Buffer.byteLength(pdf));
    return res.end(pdf);
  } catch (error) {
    console.error('Admin weekly summary error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate weekly summary' });
  }
};

export const downloadDeliveryList = async (req, res) => {
  try {
    const { date } = req.body;
    if (!date)
      return res.status(400).json({ success: false, message: 'date is required (YYYY-MM-DD)' });

    const dateStr = date.split('T')[0];
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    const nextDay = new Date(targetDate);
    nextDay.setUTCDate(targetDate.getUTCDate() + 1);

    const orders = await Order.find({
      orderDate: { $gte: targetDate, $lt: nextDay },
      status: { $nin: ['cancelled'] },
    })
      .populate('customer', 'name phone addresses')
      .populate('items.product', 'title')
      .lean();

    if (!orders.length)
      return res.status(200).json({ success: true, message: 'No deliveries scheduled for this day', count: 0 });

    const deliveries = orders
      .map(order => {
        const customer = order.customer;
        if (!customer) return null;
        const address = customer.addresses?.find(a => a.isDefault) || customer.addresses?.[0];
        const items = (order.items || [])
          .map(item => ({
            name: item.productName || item.product?.title || 'Deleted Item',
            unit: 'pcs',
            quantity: item.quantity,
            type: 'Order',
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        return { customerName: customer.name, phone: customer.phone, address, items };
      })
      .filter(Boolean)
      .sort((a, b) => a.customerName.localeCompare(b.customerName));

    const pdf = await generateDeliveryListPDF({ date: dateStr, deliveries });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="delivery_list_${formatDateForFile(dateStr)}.pdf"`);
    res.setHeader('Content-Length', Buffer.byteLength(pdf));
    return res.end(pdf);
  } catch (error) {
    console.error('Delivery list PDF error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate PDF' });
  }
};