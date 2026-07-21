import User from '../models/User.js';
import Order from '../models/Order.js';

export const cleanupExpiredMemberships = async () => {
    try {
        const now = new Date();
        
        const expiredUsers = await User.find({
            'appSubscription.endDate': { $lt: now },
            'subscription.isActive': true
        });
        
        console.log(`Found ${expiredUsers.length} users with expired membership but active delivery`);
        
        for (const user of expiredUsers) {
            console.log(`Auto-cancelling delivery for user ${user._id} (${user.name})`);
            
            user.subscription.isActive = false;
            user.subscription.cancelledAt = now;
            user.subscription.nextDeliveryDate = null;
            
            if (user.appSubscription) {
                user.appSubscription.status = 'cancelled';
            }
            
            await Order.updateMany(
                {
                    customer: user._id,
                    status: { $in: ['pending', 'confirmed', 'preparing'] }
                },
                {
                    status: 'cancelled',
                    cancellationReason: 'Membership expired'
                }
            );
            
            await user.save();
            
            if (global.invalidateSubscriptionCaches) {
                global.invalidateSubscriptionCaches(user._id);
            }
        }
        
        console.log(`Cleaned up ${expiredUsers.length} expired memberships`);
    } catch (error) {
        console.error('Cleanup job error:', error);
    }
};