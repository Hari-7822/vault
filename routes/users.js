import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  updateProfile,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getAllUsers,
  adminUpdateUser,
  adminDeleteUser,
  selfDeleteAccount,
  registerFcmToken,
  removeFcmToken,
  sendCustomPushNotification,
} from '../controllers/userController.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);
router.post('/addresses', protect, addAddress);
router.put('/addresses/:index', protect, updateAddress);
router.delete('/addresses/:index', protect, deleteAddress);
router.put('/addresses/:index/default', protect, setDefaultAddress);
router.delete('/me', protect, selfDeleteAccount);

router.get('/admin/all', protect, authorize('admin'), getAllUsers);
router.put('/admin/:id', protect, authorize('admin'), adminUpdateUser);
router.delete('/admin/:id', protect, authorize('admin'), adminDeleteUser);
router.post('/admin/notify', protect, authorize('admin'), upload.single('image'), sendCustomPushNotification);

router.post('/fcm-token', protect, registerFcmToken);
router.delete('/fcm-token', protect, removeFcmToken);

export default router;