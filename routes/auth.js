import express from 'express';
import { protect } from "../middleware/auth.js";
import { register, login, googleLogin, getMe, registerFcmToken, phoneLogin } from '../controllers/authController.js';
const router = express.Router();
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);
router.post('/fcm-token', protect, registerFcmToken);

router.post('/phone/verify', phoneLogin);
export default router;
