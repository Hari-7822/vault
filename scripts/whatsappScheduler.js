import cron from 'node-cron';
import User from '../models/User.js';
import { sendDeliveryReminderMessage, sendMidWeekCheckMessage } from '../services/whatsappService.js';

// IST is UTC+5:30
// 12:00 PM IST = 06:30 UTC
// 06:00 PM IST = 12:30 UTC

async function sendBulkWithDelay(users, sendFn, label) {
  let sent = 0, failed = 0;
  for (const user of users) {
    if (!user.phone?.trim()) { failed++; continue; }
    const result = await sendFn(user.phone, { name: user.name });
    if (result.ok) {
      sent++;
    } else {
      failed++;
      console.error(`[${label}] ❌ ${user.name} (${user.phone}): ${result.error}`);
    }
    await new Promise(r => setTimeout(r, 120));
  }
  console.log(`[${label}] ✅ sent: ${sent}, failed: ${failed}, total: ${users.length}`);
}

// Mid-week check — every Wednesday at 12:00 PM IST (06:30 UTC)
cron.schedule('30 6 * * 3', async () => {
  console.log('[Cron] 🕛 Running mid-week check (Wednesday 12PM IST)');
  try {
    const users = await User.find({
      role: 'customer',
      'subscription.isActive': true,
      phone: { $exists: true, $ne: null, $ne: '' },
    }).select('name phone');

    if (!users.length) return console.log('[Cron] No active subscribers for mid-week check');
    await sendBulkWithDelay(users, sendMidWeekCheckMessage, 'MidWeekCheck');
  } catch (err) {
    console.error('[Cron] Mid-week check error:', err.message);
  }
}, { timezone: 'UTC' });

// Delivery reminder — every day at 6:00 PM IST (12:30 UTC)
cron.schedule('30 12 * * *', async () => {
  console.log('[Cron] 🕕 Running delivery reminder (6PM IST)');
  try {
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayDay = nowIST.getUTCDay(); // 0-6

    const users = await User.find({
      role: 'customer',
      'subscription.isActive': true,
      'subscription.deliveryDays': todayDay,
      'subscription.pauseUntil': { $not: { $gt: nowIST } },
      phone: { $exists: true, $ne: null, $ne: '' },
    }).select('name phone');

    if (!users.length) return console.log(`[Cron] No deliveries scheduled for day ${todayDay}`);
    await sendBulkWithDelay(users, sendDeliveryReminderMessage, 'DeliveryReminder');
  } catch (err) {
    console.error('[Cron] Delivery reminder error:', err.message);
  }
}, { timezone: 'UTC' });

export function startWhatsAppScheduler() {
  console.log('[Cron] ✅ WhatsApp scheduler started');
  console.log('[Cron] → Mid-week check: every Wednesday 12:00 PM IST');
  console.log('[Cron] → Delivery reminder: every day 6:00 PM IST (delivery days only)');
}