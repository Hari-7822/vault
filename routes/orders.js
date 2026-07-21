import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  downloadFile,
} from '../controllers/orderController.js';
const router = express.Router();
router.get('/', protect, getOrders);
router.get('/:id', protect, getOrderById);
router.post('/', protect, createOrder);
router.put('/:id/status', protect, authorize('admin'), updateOrderStatus);
router.delete('/:id', protect, cancelOrder);
router.get('/:id/download/:format', protect, downloadFile);
export default router;