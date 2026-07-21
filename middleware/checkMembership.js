import User from '../models/User.js';
import Order from '../models/Order.js';

export const requireActiveMembership = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const appEndDate = user.appSubscription?.endDate;
        const now = new Date();
        
        if (appEndDate && new Date(appEndDate) < now && user.subscription?.isActive) {
            user.subscription.isActive = false;
            user.subscription.cancelledAt = now;
            user.subscription.nextDeliveryDate = null;
            if (user.appSubscription) {
                user.appSubscription.status = 'cancelled';
            }
            await Order.updateMany(
                {
                    customer: req.user.id,
                    status: { $in: ['pending', 'confirmed', 'preparing'] }
                },
                {
                    status: 'cancelled',
                    cancellationReason: 'Membership expired'
                }
            );
            await user.save();
            
            return res.status(403).json({ 
                success: false, 
                message: 'Your app membership has expired. Please renew to continue deliveries.',
                code: 'MEMBERSHIP_EXPIRED'
            });
        }
        
        const isActive = user.appSubscription?.status === 'active_trial' || 
                        user.appSubscription?.status === 'active_monthly';
        
        if (!isActive && appEndDate && new Date(appEndDate) >= now) {
            user.appSubscription.status = 'active_monthly';
            await user.save();
        } else if (!isActive && (!appEndDate || new Date(appEndDate) < now)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Active app membership required to access this feature',
                code: 'MEMBERSHIP_REQUIRED'
            });
        }
        
        next();
    } catch (error) {
        console.error('Membership check error:', error);
        res.status(500).json({ success: false, message: 'Error checking membership' });
    }
};