import cron from 'node-cron';
import User from '../models/User.js';
import { sendDeliveryReminderMessage, sendMidWeekCheckMessage } from '../services/whatsappService.js';

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

cron.schedule('30 6 * * 3', async () => {
  console.log('[Cron] 🕛 Running mid-week check (Wednesday 12PM IST)');
  try {
    const users = await User.find({
      role: 'customer',
      phone: { $exists: true, $ne: null, $ne: '' },
    }).select('name phone');

    if (!users.length) return console.log('[Cron] No customers for mid-week check');
    await sendBulkWithDelay(users, sendMidWeekCheckMessage, 'MidWeekCheck');
  } catch (err) {
    console.error('[Cron] Mid-week check error:', err.message);
  }
}, { timezone: 'UTC' });

cron.schedule('30 12 * * *', async () => {
  console.log('[Cron] 🕕 Running delivery reminder (6PM IST)');
  try {
    const users = await User.find({
      role: 'customer',
      phone: { $exists: true, $ne: null, $ne: '' },
    }).select('name phone');

    if (!users.length) return console.log('[Cron] No customers for delivery reminder');
    await sendBulkWithDelay(users, sendDeliveryReminderMessage, 'DeliveryReminder');
  } catch (err) {
    console.error('[Cron] Delivery reminder error:', err.message);
  }
}, { timezone: 'UTC' });

export function startWhatsAppScheduler() {
  console.log('[Cron] WhatsApp scheduler started');
}