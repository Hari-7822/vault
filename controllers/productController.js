import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { getCache, setCache, clearCache, TTL } from '../utils/cache.js';
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
export const getProducts = async (req, res) => {
  try {
    const cacheKey = `products:list:${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json(cached);
    const { category, search, minPrice, maxPrice, sort, isActive, page = 1, limit = 50 } = req.query;
    const query = {};
    if (category && category !== 'all') query.category = category;
    if (search) query.$text = { $search: search };
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    else if (sort === 'price_desc') sortOption = { price: -1 };
    else if (sort === 'newest') sortOption = { createdAt: -1 };
    else if (sort === 'popular') sortOption = { downloadCount: -1 };
    else if (sort === 'rating') sortOption = { rating: -1 };
    const [products, totalCount] = await Promise.all([
      Product.find(query).sort(sortOption).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(query),
    ]);
    const response = {
      success: true,
      data: products,
      pagination: { page: parseInt(page), limit: limitNum, total: totalCount, pages: Math.ceil(totalCount / limitNum) },
    };
    setCache(cacheKey, response, TTL.MEDIUM);
    res.status(200).json(response);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Error fetching products', error: error.message });
  }
};
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }
    const cacheKey = `product:${id}`;
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json(cached);
    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const related = await Product.find({
      category: product.category,
      _id: { $ne: id },
      isActive: true,
    }).limit(4).lean();
    const response = { success: true, data: product, related };
    setCache(cacheKey, response, TTL.SHORT);
    res.status(200).json(response);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Error fetching product', error: error.message });
  }
};
export const createProduct = async (req, res) => {
  try {
    const productData = {
      ...req.body,
      imageUrl: req.file?.path || req.body.imageUrl || null,
    };
    if (typeof productData.specs === 'string') {
      productData.specs = productData.specs.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (typeof productData.fileFormats === 'string') {
      productData.fileFormats = productData.fileFormats.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    }
    if (typeof productData.compatibleMetals === 'string') {
      productData.compatibleMetals = productData.compatibleMetals.split(',').map(s => s.trim()).filter(Boolean);
    }
    const product = await Product.create(productData);
    if (product.category) {
      await Category.findOneAndUpdate(
        { name: product.category },
        { $inc: { productCount: 1 } },
        { upsert: true }
      );
    }
    clearCache('products:list');
    clearCache('categories:');
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    console.error('Create product error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Product with this title already exists' });
    }
    res.status(500).json({ success: false, message: 'Error creating product', error: error.message });
  }
};
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }
    const updateData = { ...req.body };
    if (req.file) updateData.imageUrl = req.file.path;
    if (typeof updateData.specs === 'string') {
      updateData.specs = updateData.specs.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (typeof updateData.fileFormats === 'string') {
      updateData.fileFormats = updateData.fileFormats.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    }
    if (typeof updateData.compatibleMetals === 'string') {
      updateData.compatibleMetals = updateData.compatibleMetals.split(',').map(s => s.trim()).filter(Boolean);
    }
    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    clearCache('products:list');
    clearCache(`product:${id}`);
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    console.error('Update product error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Product with this title already exists' });
    }
    res.status(500).json({ success: false, message: 'Error updating product', error: error.message });
  }
};
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    if (product.category) {
      await Category.findOneAndUpdate(
        { name: product.category },
        { $inc: { productCount: -1 } }
      );
    }
    await Product.findByIdAndDelete(id);
    clearCache('products:list');
    clearCache(`product:${id}`);
    clearCache('categories:');
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Error deleting product', error: error.message });
  }
};
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20 } = req.query;
    const cacheKey = `products:category:${category}:${limit}`;
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json(cached);
    const products = await Product.find({
      category: { $regex: new RegExp(`^${category}$`, 'i') },
      isActive: true,
    })
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();
    const response = { success: true, count: products.length, data: products };
    setCache(cacheKey, response, TTL.MEDIUM);
    res.status(200).json(response);
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({ success: false, message: 'Error fetching products', error: error.message });
  }
};
export const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const cacheKey = `products:featured:${limit}`;
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json(cached);
    const products = await Product.find({
      isFeatured: true,
      isActive: true,
    })
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();
    const response = { success: true, count: products.length, data: products };
    setCache(cacheKey, response, TTL.MEDIUM);
    res.status(200).json(response);
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ success: false, message: 'Error fetching featured products', error: error.message });
  }
};
export const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
    }
    const cacheKey = `products:search:${q}`;
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json(cached);
    const products = await Product.find(
      { $text: { $search: q }, isActive: true },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(20)
      .lean();
    const response = { success: true, count: products.length, data: products };
    setCache(cacheKey, response, TTL.SHORT);
    res.status(200).json(response);
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ success: false, message: 'Error searching products', error: error.message });
  }
};
export const getAdminProducts = async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category = category;
    if (status) query.isActive = status === 'active';
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Product.countDocuments(query),
    ]);
    res.status(200).json({
      success: true,
      data: products,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Get admin products error:', error);
    res.status(500).json({ success: false, message: 'Error fetching products', error: error.message });
  }
};