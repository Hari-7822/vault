import admin from '../config/firebaseAdmin.js';
import User from '../models/User.js';

/**
 * Send push notification to specific FCM tokens.
 * Automatically removes invalid/expired tokens from the user.
 */
export const sendPushNotification = async (userId, title, body, data = {}, imageUrl = null) => {
    if (!admin.apps.length) {
        console.warn('Firebase not initialized — skipping push notification');
        return { success: false, reason: 'firebase_not_initialized' };
    }

    try {
        const user = await User.findById(userId).select('fcmTokens name');
        if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
            console.log(`No FCM tokens for user ${userId} — skipping notification`);
            return { success: false, reason: 'no_tokens' };
        }

        const tokens = [...new Set(user.fcmTokens)]; // dedupe
        
        const notificationPayload = { title, body };
        if (imageUrl) {
            notificationPayload.imageUrl = imageUrl;
        }

        const message = {
            notification: notificationPayload,
            data: {
                ...data,
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'high_importance_channel',
                    icon: 'launcher_icon',
                    color: '#4CAF50',
                    sound: 'default',
                    ...(imageUrl && { imageUrl }),
                },
            },
            apns: {
                payload: {
                    aps: { sound: 'default', badge: 1 },
                },
                ...(imageUrl && {
                    fcm_options: { image: imageUrl }
                })
            },
        };

        let successCount = 0;
        let failedTokens = [];

        // Send to each token individually to track failures
        for (const token of tokens) {
            try {
                await admin.messaging().send({ ...message, token });
                successCount++;
            } catch (err) {
                console.warn(`FCM send failed for token ${token.substring(0, 20)}...: ${err.code}`);
                if (
                    err.code === 'messaging/invalid-registration-token' ||
                    err.code === 'messaging/registration-token-not-registered'
                ) {
                    failedTokens.push(token);
                }
            }
        }

        // Remove invalid tokens
        if (failedTokens.length > 0) {
            await User.findByIdAndUpdate(userId, {
                $pull: { fcmTokens: { $in: failedTokens } },
            });
            console.log(`Removed ${failedTokens.length} invalid FCM tokens for user ${userId}`);
        }

        console.log(`Push notification sent to ${user.name}: ${successCount}/${tokens.length} successful`);
        return { success: successCount > 0, sent: successCount, total: tokens.length };
    } catch (error) {
        console.error('Error sending push notification:', error.message);
        return { success: false, reason: error.message };
    }
};

/**
 * Send "Payment Due" notification after a delivery is marked complete.
 */
export const notifyPaymentDue = async (userId, amount) => {
    const formattedAmount = `₹${Number(amount).toFixed(0)}`;
    return sendPushNotification(
        userId,
        '🧾 Payment Due',
        `Your delivery of ${formattedAmount} is complete! Tap to pay now.`,
        { type: 'payment_due', screen: 'billing', amount: String(amount) }
    );
};

/**
 * Send payment reminder to a user with pending bills.
 */
export const notifyPaymentReminder = async (userId, amount) => {
    const formattedAmount = `₹${Number(amount).toFixed(0)}`;
    return sendPushNotification(
        userId,
        '⏰ Payment Reminder',
        `You have ${formattedAmount} pending payment for this week's deliveries. Pay now to avoid delays!`,
        { type: 'payment_reminder', screen: 'billing', amount: String(amount) }
    );
};
