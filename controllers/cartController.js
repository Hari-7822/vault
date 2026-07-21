import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { getCache, setCache, clearCache, TTL } from '../utils/cache.js';
export const getCart = async (req, res) => {
  try {
    const cacheKey = `cart:${req.user.id}`;
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json(cached);
    let cart = await Cart.findOne({ user: req.user.id }).populate({
      path: 'items.product',
      select: 'title subtitle price salePrice imageUrl category fileFormats',
    });
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }
    let subtotal = 0;
    const items = cart.items.map(item => {
      const product = item.product;
      const price = product.salePrice || product.price || 0;
      subtotal += price * item.quantity;
      return {
        ...item.toObject(),
        price,
        total: price * item.quantity,
      };
    });
    const result = {
      success: true,
      items,
      subtotal,
      count: cart.items.length,
    };
    setCache(cacheKey, result, TTL.SHORT);
    res.status(200).json(result);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Error fetching cart', error: error.message });
  }
};
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }
    const existingItem = cart.items.find(item => item.product.toString() === productId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }
    await cart.save();
    clearCache(`cart:${req.user.id}`);
    res.status(200).json({
      success: true,
      message: 'Added to cart',
      count: cart.items.length,
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, message: 'Error adding to cart', error: error.message });
  }
};
export const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    if (quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
    }
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
    const item = cart.items.find(item => item.product.toString() === productId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }
    item.quantity = quantity;
    await cart.save();
    clearCache(`cart:${req.user.id}`);
    res.status(200).json({
      success: true,
      message: 'Cart updated',
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ success: false, message: 'Error updating cart', error: error.message });
  }
};
export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
    const initialLength = cart.items.length;
    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    if (cart.items.length === initialLength) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }
    await cart.save();
    clearCache(`cart:${req.user.id}`);
    res.status(200).json({
      success: true,
      message: 'Removed from cart',
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ success: false, message: 'Error removing from cart', error: error.message });
  }
};
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    clearCache(`cart:${req.user.id}`);
    res.status(200).json({
      success: true,
      message: 'Cart cleared',
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, message: 'Error clearing cart', error: error.message });
  }
};