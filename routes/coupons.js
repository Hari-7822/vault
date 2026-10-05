import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {getAllCoupons, createCoupon, applyCoupon, updateCoupon, deleteCoupon} from '../controllers/couponController.js';

const router = express.Router();
router.get('/', protect, authorize('admin'), getAllCoupons);
router.post('/', protect, authorize('admin'), createCoupon);
router.post('/apply', protect, applyCoupon);
router.put('/:id', protect, authorize('admin'), updateCoupon);
router.delete('/:id', protect, authorize('admin'), deleteCoupon);

export default router;