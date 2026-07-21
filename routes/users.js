import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { updateProfile, changePassword, addAddress, updateAddress, deleteAddress, setDefaultAddress, manageAppSubscription, cancelAppSubscription, getAllUsers, adminUpdateUser, adminDeleteUser, selfDeleteAccount, registerFcmToken, removeFcmToken, togglePayNow } from '../controllers/userController.js';
import upload from '../middleware/upload.js';
import { sendCustomPushNotification } from '../controllers/userController.js';

const router = express.Router();
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);
router.post('/addresses', protect, addAddress);
router.put('/addresses/:index', protect, updateAddress);
router.delete('/addresses/:index', protect, deleteAddress);
router.put('/addresses/:index/default', protect, setDefaultAddress);
router.post('/app-subscription', protect, manageAppSubscription);
router.post('/app-subscription/cancel', protect, cancelAppSubscription);
router.delete('/me', protect, selfDeleteAccount);          // self-service deletion

router.get('/admin/all', protect, authorize('admin'), getAllUsers);
router.put('/admin/:id', protect, authorize('admin'), adminUpdateUser);
router.put('/admin/:id/pay-now', protect, authorize('admin'), togglePayNow);
router.delete('/admin/:id', protect, authorize('admin'), adminDeleteUser);

// Push Notification Broadcasting
router.post('/admin/notify', protect, authorize('admin'), upload.single('image'), sendCustomPushNotification);

// FCM push notification tokens
router.post('/fcm-token', protect, registerFcmToken);
router.delete('/fcm-token', protect, removeFcmToken);
export default router;

