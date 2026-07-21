import Order from '../models/Order.js';
import User from '../models/User.js';
import SystemSetting from '../models/SystemSetting.js';
import { notifyPaymentReminder } from '../services/notificationService.js';
import { sendPaymentUpdateMessage } from '../services/whatsappService.js';
import { createPaymentLink } from '../services/razorpayService.js';
import { getCache, setCache } from '../utils/cache.js';

const REMINDER_INTERVAL_MS = 6 * 60 * 60 * 1000;

function getWeekDateRange() {
  const now   = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  return `${fmt(start)} - ${fmt(end)}`;
}

async function runPaymentReminders() {
  try {
    const paymentSetting = await SystemSetting.findOne({ key: 'isWeekendPaymentEnabled' });
    if (paymentSetting?.value !== true) {
      console.log('[PaymentReminder] Payment not enabled — skipping');
      return;
    }

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const unpaidOrders = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'pending',
          createdAt: { $gte: startOfWeek },
          status: 'delivered',
        },
      },
      {
        $group: {
          _id: '$customer',
          totalPending:  { $sum: '$totalAmount' },
          orderCount:    { $sum: 1 },
          latestOrderId: { $last: '$_id' },
        },
      },
    ]);

    if (!unpaidOrders.length) {
      console.log('[PaymentReminder] No users with pending payments');
      return;
    }

    console.log(`[PaymentReminder] Sending reminders to ${unpaidOrders.length} users`);

    const weekDates = getWeekDateRange();

    for (const entry of unpaidOrders) {
      const cacheKey = `reminder_sent:${entry._id}`;
      if (getCache(cacheKey)) continue;

      // Push notification (fire and forget)
      notifyPaymentReminder(entry._id.toString(), entry.totalPending)
        .catch(e => console.error(`[PaymentReminder] Push failed for ${entry._id}: ${e.message}`));

      // WhatsApp with Razorpay link
      try {
        const user = await User.findById(entry._id).select('name phone email');

        if (!user?.phone?.trim()) {
          console.log(`[PaymentReminder] No phone for user ${entry._id} — skipping WhatsApp`);
        } else {
          const invoiceId = entry.latestOrderId.toString();
          const amount    = Number(entry.totalPending).toFixed(0);
          let razorpayShortUrl = null;

          try {
            const link = await createPaymentLink({
              amount:       entry.totalPending,
              customerName: user.name,
              email:        user.email || undefined,
              phone:        user.phone,
              description:  `Payment for week ${weekDates}`,
              referenceId:  invoiceId,
            });
            razorpayShortUrl = link.short_url;
            console.log(`[PaymentReminder] Razorpay link for ${user.name}: ${razorpayShortUrl}`);
          } catch (rzpErr) {
            console.error(`[PaymentReminder] Razorpay link failed for ${user.name}: ${rzpErr.message}`);
          }

          const result = await sendPaymentUpdateMessage(user.phone, {
            name: user.name,
            invoiceId,
            weekDates,
            amount: `₹${amount}`,
            razorpayShortUrl,
          });

          if (result.ok) {
            console.log(`[PaymentReminder] ✅ WhatsApp sent to ${user.name}`);
          } else {
            console.error(`[PaymentReminder] ❌ WhatsApp failed for ${user.name}: ${result.error}`);
          }
        }
      } catch (err) {
        console.error(`[PaymentReminder] Error for ${entry._id}: ${err.message}`);
      }

      setCache(cacheKey, true, 5 * 60 * 60);
    }

    console.log('[PaymentReminder] Reminder batch complete');
  } catch (error) {
    console.error('[PaymentReminder] Error:', error.message);
  }
}

export function startPaymentReminderCron() {
  console.log(`[PaymentReminder] Scheduler started — running every ${REMINDER_INTERVAL_MS / 3600000}h`);
  setTimeout(() => runPaymentReminders(), 30_000);
  setInterval(() => runPaymentReminders(), REMINDER_INTERVAL_MS);
}