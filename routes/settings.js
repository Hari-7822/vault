import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getSetting, updateSetting, checkPincodeAvailability, getUnavailablePincodes } from '../controllers/settingController.js';

const router = express.Router();

router.get('/unavailablePincodes', protect, authorize('admin'), getUnavailablePincodes);
router.get('/deliveryPincodes/check', checkPincodeAvailability);
router.get('/:key', getSetting);
router.put('/:key', protect, authorize('admin'), updateSetting);

export default router;