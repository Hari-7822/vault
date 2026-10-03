import User from '../models/User.js';
import { admin, initialized } from './firebase.js';

export async function sendNotificationToAllCustomers(title, body) {
  if (!initialized) { console.log('🔔 [FCM] Firebase not initialized, skipping notification'); return; }
  try {
    const users = await User.find({ role: 'customer', fcmTokens: { $exists: true, $not: { $size: 0 } } });
    let tokens = [];
    users.forEach(user => { if (user.fcmTokens && Array.isArray(user.fcmTokens)) tokens.push(...user.fcmTokens); });
    tokens = [...new Set(tokens)];
    console.log(`🔔 [FCM] Sending "${title}" to ${tokens.length} token(s)`);
    if (tokens.length === 0) return;
    const chunkSize = 500;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);
      const response = await admin.messaging().sendEachForMulticast({ notification: { title, body }, tokens: chunk });
      console.log(`🔔 [FCM] Sent! Success: ${response.successCount}, Failed: ${response.failureCount}`);
    }
  } catch (error) {
    console.error('🔔 [FCM] Error sending notification:', error.message);
  }
}