import mongoose from 'mongoose';
import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import { getCache, setCache, clearCache, TTL } from '../utils/cache.js';
export const getWishlist = async (req, res) => {
  try {
    const cacheKey = `wishlist:${req.user.id}`;
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json(cached);
    let wishlist = await Wishlist.findOne({ user: req.user.id }).populate({
      path: 'products.product',
      select: 'title subtitle price imageUrl category badge emoji specs',
    });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user.id, products: [] });
    }
    const result = { success: true, count: wishlist.products.length, data: wishlist };
    setCache(cacheKey, result, TTL.SHORT);
    res.status(200).json(result);
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ success: false, message: 'Error fetching wishlist', error: error.message });
  }
};
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    let wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user.id, products: [] });
    }
    const exists = wishlist.products.some(p => p.product.toString() === productId);
    if (exists) {
      return res.status(400).json({ success: false, message: 'Product already in wishlist' });
    }
    wishlist.products.push({ product: productId });
    await wishlist.save();
    clearCache(`wishlist:${req.user.id}`);
    res.status(200).json({
      success: true,
      message: 'Added to wishlist',
      count: wishlist.products.length,
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ success: false, message: 'Error adding to wishlist', error: error.message });
  }
};
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }
    const initialLength = wishlist.products.length;
    wishlist.products = wishlist.products.filter(p => p.product.toString() !== productId);
    if (wishlist.products.length === initialLength) {
      return res.status(404).json({ success: false, message: 'Product not in wishlist' });
    }
    await wishlist.save();
    clearCache(`wishlist:${req.user.id}`);
    res.status(200).json({
      success: true,
      message: 'Removed from wishlist',
      count: wishlist.products.length,
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ success: false, message: 'Error removing from wishlist', error: error.message });
  }
};
export const clearWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id });
    if (wishlist) {
      wishlist.products = [];
      await wishlist.save();
    }
    clearCache(`wishlist:${req.user.id}`);
    res.status(200).json({
      success: true,
      message: 'Wishlist cleared',
    });
  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({ success: false, message: 'Error clearing wishlist', error: error.message });
  }
};