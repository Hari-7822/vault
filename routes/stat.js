import express from 'express';
import { getPublicStats } from '../controllers/adminController.js';

const router = express.Router();
router.get('/', getPublicStats);
export default router;