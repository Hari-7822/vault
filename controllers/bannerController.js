import mongoose from 'mongoose';
import Banner from '../models/Banner.js';
import { getCache, setCache, clearCache, TTL } from '../utils/cache.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const getActiveBanners = async (req, res) => {
  try {
    const type = req.query.type || 'home';
    const cacheKey = `banners:active:${type}`;
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json(cached);

    const filter = { isActive: true };
    if (type === 'home') {
      filter.$or = [{ type: 'home' }, { type: { $exists: false } }];
    } else {
      filter.type = type;
    }

    const banners = await Banner.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .lean();

    const response = { success: true, count: banners.length, data: banners };
    setCache(cacheKey, response, TTL.LONG);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching active banners', error: error.message });
  }
};

export const getAllBanners = async (req, res) => {
  try {
    const type = req.query.type;
    const filter = {};
    if (type === 'home') {
      filter.$or = [{ type: 'home' }, { type: { $exists: false } }];
    } else if (type) {
      filter.type = type;
    }

    const banners = await Banner.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: banners.length, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching all banners', error: error.message });
  }
};

export const createBanner = async (req, res) => {
  try {
    const bannerData = { ...req.body };

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Banner image is required' });
    }
    
    bannerData.imageUrl = req.file.path;

    const banner = await Banner.create(bannerData);

    clearCache('banners:');

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: banner
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating banner', error: error.message });
  }
};

export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid banner ID' });
    }

    const updateData = { ...req.body };

    if (req.file) {
      updateData.imageUrl = req.file.path;
    }

    const banner = await Banner.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    clearCache('banners:');

    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: banner
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating banner', error: error.message });
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid banner ID' });
    }

    const banner = await Banner.findByIdAndDelete(id);

    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    clearCache('banners:');

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting banner', error: error.message });
  }
};