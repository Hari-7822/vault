import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import supportUpload from '../middleware/supportUpload.js';
import {
  sendMessage,
  sendImage,
  replyAsAdmin,
  getMyChats,
  getAllChats
} from '../controllers/supportController.js';

const router = express.Router();

router.post('/send', protect, sendMessage);
router.post('/send-image', protect, (req, res, next) => {
  supportUpload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, sendImage);
router.get('/my-chats', protect, getMyChats);

router.get('/admin/all', protect, authorize('admin'), getAllChats);
router.post('/admin/reply', protect, authorize('admin'), replyAsAdmin);

export default router;