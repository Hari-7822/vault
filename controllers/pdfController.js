import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import {
  generateInvoicePDF,
  generateWeeklySummaryPDF,
  generateDailyRequirementsPDF,
  generateDeliveryListPDF,
} from '../services/pdfService.js';

function getDayIndexIST(dateStr) {
  const d = new Date(dateStr);
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.getUTCDay();
}

/** Returns the human-readable selling-unit label, e.g. "500g", "1 kg", "bunch". */
function resolveUnitLabel(vegUnit, sellingQuantity, sellingUnit) {
  if (sellingQuantity && sellingUnit) {
    const sep = (sellingUnit === 'g' || sellingUnit === 'kg') ? '' : ' ';
    return `${sellingQuantity}${sep}${sellingUnit}`;
  }
  return vegUnit || 'pcs';
}

/** Batch-fetch inventory records → { vegetableId: { sellingQuantity, sellingUnit } } */
async function buildInvMap(vegetableIds) {
  const invs = await Inventory.find(
    { vegetable: { $in: Array.from(vegetableIds) } },
  ).select('vegetable sellingQuantity sellingUnit');
  const map = {};
  invs.forEach(inv => {
    map[inv.vegetable.toString()] = {
      sellingQuantity: inv.sellingQuantity || null,
      sellingUnit: inv.sellingUnit || null,
    };
  });
  return map;
}

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

    const deliveryFee  = Number(req.body.deliveryFee)  || 0;
    const platformFee  = Number(req.body.platformFee)  || 0;
    const packagingFee = Number(req.body.packagingFee) || 0;
    const shippingFee  = Number(req.body.shippingFee)  || 0;

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

    const deliveryFee  = Number(req.body.deliveryFee)  || 0;
    const platformFee  = Number(req.body.platformFee)  || 0;
    const packagingFee = Number(req.body.packagingFee) || 0;
    const shippingFee  = Number(req.body.shippingFee)  || 0;

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

    // Normalize to UTC midnight to avoid IST timezone offset shifting the date
    const dateStr = date.split('T')[0]; // e.g. "2026-05-14"
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    const nextDay = new Date(targetDate);
    nextDay.setUTCDate(targetDate.getUTCDate() + 1);

    // Query by nextDeliveryDate falling on the target day (same logic as getDailyRequirements)
    const users = await User.find({
      'subscription.isActive': true,
      'subscription.nextDeliveryDate': { $gte: targetDate, $lt: nextDay },
      $or: [
        { 'subscription.pauseUntil': null },
        { 'subscription.pauseUntil': { $lte: targetDate } },
      ],
    }).select('subscription.recurringBasket');

    // Also aggregate one-off Order items for the same day
    const orderRequirements = await Order.aggregate([
      {
        $match: {
          status: { $in: ['pending', 'confirmed', 'preparing'] },
          deliveryDate: { $gte: targetDate, $lt: nextDay },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.vegetable',
          quantity: { $sum: '$items.quantity' },
        },
      },
    ]);

    const aggregated = {};
    for (const user of users) {
      for (const item of user.subscription?.recurringBasket || []) {
        const id = String(item.vegetable);
        if (!aggregated[id]) aggregated[id] = { quantity: 0 };
        aggregated[id].quantity += Number(item.quantity);
      }
    }
    for (const row of orderRequirements) {
      const id = String(row._id);
      if (!aggregated[id]) aggregated[id] = { quantity: 0 };
      aggregated[id].quantity += Number(row.quantity);
    }

    if (!Object.keys(aggregated).length)
      return res.status(200).json({ success: true, message: 'No deliveries scheduled for this day', count: 0 });

    const vegetableIds = Object.keys(aggregated);
    const vegetables   = await Vegetable.find({ _id: { $in: vegetableIds } }).select('name unit');
    const vegMap       = Object.fromEntries(vegetables.map(v => [String(v._id), v]));

    const items = vegetableIds
      .map(id => {
        const veg = vegMap[id];
        if (!veg) return null;
        return { name: veg.name, unit: veg.unit, quantity: aggregated[id].quantity };
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
      .populate('items.vegetable', 'name unit')
      .sort({ deliveryDate: 1, orderDate: 1 });

    if (!orders.length)
      return res.status(200).json({ success: true, message: 'No orders found for this user', count: 0 });

    // Build invMap for correct selling unit labels (e.g. "500g")
    const vegIds = new Set();
    orders.forEach(o => o.items.forEach(i => { if (i.vegetable?._id) vegIds.add(i.vegetable._id.toString()); }));
    const invMap = await buildInvMap(vegIds);

    // Flatten all items into weeklySummary-style with deliveryDate key
    const allItems = [];
    let totalAmount = 0;
    orders.forEach(order => {
      const delDate = new Date(order.deliveryDate || order.orderDate);
      const yyyy = delDate.getFullYear();
      const mm = String(delDate.getMonth() + 1).padStart(2, '0');
      const dd = String(delDate.getDate()).padStart(2, '0');
      const delDateStr = `${yyyy}-${mm}-${dd}`;

      order.items.forEach(item => {
        const vegId = item.vegetable?._id?.toString();
        const inv = vegId ? invMap[vegId] : null;
        allItems.push({
          name: item.vegetable?.name || 'Deleted Item',
          quantity: item.quantity,
          unit: resolveUnitLabel(item.vegetable?.unit, inv?.sellingQuantity, inv?.sellingUnit),
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

    const user = await User.findById(userId).select('name customerNumber subscription').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Current week window (Monday–Sunday), same as getCurrentBilling
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
      $or: [
        { deliveryDate: { $gte: startOfWeek, $lte: endOfWeek } },
        { orderDate:   { $gte: startOfWeek, $lte: endOfWeek } },
      ],
    })
      .populate('items.vegetable', 'name unit')
      .sort({ deliveryDate: 1, orderDate: 1 });

    if (!orders.length)
      return res.status(200).json({ success: true, message: 'No orders for this user this week', count: 0 });

    // Per-user fee overrides (fall back to 0 when not set)
    const sub = user.subscription || {};
    const deliveryFee  = (sub.deliveryFee  ?? 0) * orders.length;
    const shippingFee  = (sub.shippingFee  ?? 0) * orders.length;
    const packagingFee = (sub.packagingFee ?? 0) * orders.length;
    const platformFee  = (sub.platformFee  ?? 0) * orders.length;

    // Build date-range label
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dateRange = `${String(startOfWeek.getDate()).padStart(2,'0')} ${months[startOfWeek.getMonth()]} — ${String(endOfWeek.getDate()).padStart(2,'0')} ${months[endOfWeek.getMonth()]} ${endOfWeek.getFullYear()}`;

    // Build invMap for correct selling unit labels (e.g. "500g")
    const vegIdsW = new Set();
    orders.forEach(o => o.items.forEach(i => { if (i.vegetable?._id) vegIdsW.add(i.vegetable._id.toString()); }));
    const invMapW = await buildInvMap(vegIdsW);

    // Flatten items
    let vegTotal = 0;
    const allItems = [];
    orders.forEach(order => {
      const d = new Date(order.deliveryDate || order.orderDate);
      const delDateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      order.items.forEach(item => {
        const vegId = item.vegetable?._id?.toString();
        const inv = vegId ? invMapW[vegId] : null;
        allItems.push({
          name: item.vegetable?.name || 'Deleted Item',
          quantity: item.quantity,
          unit: resolveUnitLabel(item.vegetable?.unit, inv?.sellingQuantity, inv?.sellingUnit),
          price: item.priceAtPurchase,
          subtotal: item.subtotal,
          deliveryDate: delDateStr,
        });
        vegTotal += item.subtotal;
      });
    });

    const totalAmount = vegTotal + deliveryFee + shippingFee + packagingFee + platformFee;
    const invoiceNo = `WKS-${userId.toString().slice(-6).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    const pdf = await generateWeeklySummaryPDF({
      dateRange,
      invoiceNo,
      date: today.toISOString(),
      plan: `Customer: ${user.name}${user.customerNumber ? ` (#${user.customerNumber})` : ''}`,
      items: allItems,
      deliveryFee,
      platformFee,
      packagingFee,
      shippingFee,
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

    // Normalize to UTC midnight so IST timezone offsets from Flutter don't shift the date
    const dateStr = date.split('T')[0];
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    const nextDay = new Date(targetDate);
    nextDay.setUTCDate(targetDate.getUTCDate() + 1);

    // Query by nextDeliveryDate matching the target day (same logic as getUpcomingDeliveries)
    const users = await User.find({
      'subscription.isActive': true,
      'subscription.nextDeliveryDate': { $gte: targetDate, $lt: nextDay },
      $or: [
        { 'subscription.pauseUntil': null },
        { 'subscription.pauseUntil': { $lte: targetDate } },
      ],
    }).select('name phone addresses subscription');

    if (!users.length)
      return res.status(200).json({ success: true, message: 'No deliveries scheduled for this day', count: 0 });

    const allVegIds = [
      ...new Set(
        users.flatMap(u => (u.subscription?.recurringBasket || []).map(i => String(i.vegetable)))
      ),
    ];

    const vegetables = await Vegetable.find({ _id: { $in: allVegIds } }).select('name unit');
    const vegMap     = Object.fromEntries(vegetables.map(v => [String(v._id), v]));

    const deliveries = users
      .map(user => {
        const basket = user.subscription?.recurringBasket || [];
        if (!basket.length) return null;

        const addrId      = user.subscription?.deliveryAddressId;
        const defaultAddr = user.addresses?.find(a => a.isDefault) || user.addresses?.[0];
        const address     = addrId
          ? user.addresses?.find(a => String(a._id) === String(addrId)) || defaultAddr
          : defaultAddr;

        const items = basket
          .map(item => {
            const veg = vegMap[String(item.vegetable)];
            if (!veg) return null;
            return { name: veg.name, unit: veg.unit, quantity: item.quantity, type: 'Order' };
          })
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name));

        return { customerName: user.name, phone: user.phone, address, items };
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
