import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  getDashboardStats,
  getAdminOrders,
  adminUpdateOrderStatus,
} from '../controllers/adminController.js';
import {
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import {
  getAllUsers,
  adminDeleteUser,
  adminUpdateUser,
} from '../controllers/userController.js';
import {
  getAllChats,
  replyAsAdmin,
} from '../controllers/supportController.js';
const router = express.Router();
router.use(protect);
router.use(authorize('admin'));
router.get('/dashboard/stats', getDashboardStats);
router.get('/products', getAdminProducts);
router.post('/products', upload.single('image'), createProduct);
router.put('/products/:id', upload.single('image'), updateProduct);
router.delete('/products/:id', deleteProduct);
router.get('/orders', getAdminOrders);
router.put('/orders/:id/status', adminUpdateOrderStatus);
router.get('/users', getAllUsers);
router.put('/users/:id', adminUpdateUser);
router.delete('/users/:id', adminDeleteUser);
router.get('/support', getAllChats);
router.post('/support/reply', replyAsAdmin);
export default router;