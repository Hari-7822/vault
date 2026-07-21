import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
    sendBulkMessage,
    previewRecipients,
    sendSingleMessage,
    sendOrderConfirmed,
    sendDeliveryReminder,
    sendMidWeekCheck,
    sendPaymentUpdate,
    sendBulkDeliveryReminder,
    handleWebhookVerification,
    handleIncomingWebhook
} from '../controllers/whatsappController.js';

const router = express.Router();

router.post('/send', protect, authorize('admin'), sendBulkMessage);
router.post('/send-single', protect, authorize('admin'), sendSingleMessage);
router.get('/preview', protect, authorize('admin'), previewRecipients);

router.post('/templates/order-confirmed', protect, authorize('admin'), sendOrderConfirmed);
router.post('/templates/delivery-reminder', protect, authorize('admin'), sendDeliveryReminder);
router.post('/templates/mid-week-check', protect, authorize('admin'), sendMidWeekCheck);
router.post('/templates/payment-update', protect, authorize('admin'), sendPaymentUpdate);
router.post('/templates/bulk-delivery-reminder', protect, authorize('admin'), sendBulkDeliveryReminder);
router.get('/webhook', handleWebhookVerification);
router.post('/webhook', handleIncomingWebhook);


export default router;