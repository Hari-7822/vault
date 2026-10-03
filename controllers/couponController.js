import Coupon from '../models/Coupon.js';
import { getCache, setCache, clearCache, TTL } from '../utils/cache.js';

export const getAllCoupons = async (req, res) => {
  try {
    const cacheKey = 'coupons:all';
    const cached = getCache(cacheKey);
    if (cached) return res.json({ success: true, coupons: cached });

    const coupons = await Coupon.find().sort({ createdAt: -1 });
    setCache(cacheKey, coupons, TTL.MEDIUM);
    res.json({ success: true, coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const { code, description, discountType, discountValue, minOrderValue, maxUses, perUserLimit, expiresAt, isActive } = req.body;
    if (!code || !discountType || discountValue === undefined || !expiresAt) {
      return res.status(400).json({ success: false, message: 'code, discountType, discountValue, and expiresAt are required' });
    }
    const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existing) return res.status(400).json({ success: false, message: 'Coupon code already exists' });

    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      description,
      discountType,
      discountValue,
      minOrderValue: minOrderValue || 0,
      maxUses: maxUses || 0,
      perUserLimit: perUserLimit || 1,
      expiresAt: new Date(expiresAt),
      isActive: isActive !== false
    });

    clearCache('coupons:');
    res.status(201).json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const applyCoupon = async (req, res) => {
  try {
    const { code, basketTotal } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Coupon code is required' });

    const couponCacheKey = `coupons:code:${code.toUpperCase().trim()}`;
    let coupon = getCache(couponCacheKey);
    if (!coupon) {
      coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
      if (coupon) setCache(couponCacheKey, coupon, TTL.SHORT);
    }

    if (!coupon || !coupon.isActive) {
      return res.status(404).json({ success: false, message: 'Invalid or inactive coupon code' });
    }
    if (coupon.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'This coupon has expired' });
    }
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ success: false, message: 'This coupon has reached its maximum usage limit' });
    }

    const orderTotal = parseFloat(basketTotal) || 0;
    if (orderTotal < coupon.minOrderValue) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value of ₹${coupon.minOrderValue} required to use this coupon`
      });
    }

    const userUsage = coupon.usedBy.find(u => u.userId.toString() === req.user.id);
    if (userUsage && userUsage.usedCount >= coupon.perUserLimit) {
      return res.status(400).json({
        success: false,
        message: 'You have already used this coupon the maximum number of times'
      });
    }

    const discountAmount = coupon.discountType === 'flat'
      ? Math.min(coupon.discountValue, orderTotal)
      : Math.round((orderTotal * coupon.discountValue) / 100 * 100) / 100;

    const grandTotal = Math.max(0, orderTotal - discountAmount);

    res.json({
      success: true,
      message: 'Coupon applied successfully!',
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      grandTotal,
      description: coupon.description
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { ...req.body, code: req.body.code ? req.body.code.toUpperCase().trim() : undefined },
      { new: true, runValidators: true }
    );
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    clearCache('coupons:');
    res.json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    clearCache('coupons:');
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};