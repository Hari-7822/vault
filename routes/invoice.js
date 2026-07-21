import express from 'express';
import {
  downloadInvoice,
  downloadWeeklySummary,
  downloadDailyRequirements,
  downloadDeliveryList,
  downloadAdminUserInvoice,
  downloadAdminUserWeeklySummary,
} from '../controllers/pdfController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/invoice', protect, downloadInvoice);
router.post('/weekly-summary', protect, downloadWeeklySummary);
router.get('/daily-requirements', protect, authorize('admin'), downloadDailyRequirements);
router.get('/delivery-list', protect, authorize('admin'), downloadDeliveryList);
router.get('/admin/user-invoice/:userId', protect, authorize('admin'), downloadAdminUserInvoice);
router.get('/admin/user-weekly-summary/:userId', protect, authorize('admin'), downloadAdminUserWeeklySummary);

export default router;