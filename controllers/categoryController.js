import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { getCache, setCache, clearCache, TTL } from '../utils/cache.js';
export const getCategories = async (req, res) => {
  try {
    const cacheKey = `categories:${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json(cached);
    const { isActive } = req.query;
    let query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    const categories = await Category.find(query).sort({ name: 1 }).lean();
    for (const cat of categories) {
      const count = await Product.countDocuments({ category: cat.name, isActive: true });
      cat.productCount = count;
    }
    const result = { success: true, count: categories.length, data: categories };
    setCache(cacheKey, result, TTL.LONG);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching categories', error: error.message });
  }
};
export const createCategory = async (req, res) => {
  try {
    const categoryData = req.body;
    if (req.file) categoryData.imageUrl = req.file.path;
    const category = await Category.create(categoryData);
    clearCache('categories:');
    res.status(201).json({ success: true, message: 'Category created successfully', data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category with this name already exists' });
    }
    res.status(500).json({ success: false, message: 'Error creating category', error: error.message });
  }
};
export const updateCategory = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) updateData.imageUrl = req.file.path;
    if (updateData.name) {
      updateData.slug = updateData.name.toLowerCase().replace(/\s+/g, '-');
    }
    const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    clearCache('categories:');
    res.status(200).json({ success: true, message: 'Category updated successfully', data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category with this name already exists' });
    }
    res.status(500).json({ success: false, message: 'Error updating category', error: error.message });
  }
};
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    clearCache('categories:');
    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting category', error: error.message });
  }
};