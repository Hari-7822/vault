import mongoose from 'mongoose';
const productSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Product title is required'], trim: true },
  subtitle: { type: String, trim: true },
  category: {
    type: String,
    enum: ['Engagement Ring', 'Ring', 'Pendant', 'Earrings', 'Bangle', 'Necklace', 'Bracelet'],
    required: [true, 'Category is required'],
  },
  description: { type: String, trim: true },
  price: { type: Number, required: [true, 'Price is required'], min: 0 },
  salePrice: { type: Number, min: 0 },
  specs: [{ type: String, trim: true }],
  badge: { type: String, enum: ['', 'Popular', 'New', 'Exclusive', 'Best Seller'], default: '' },
  emoji: { type: String, default: '💎' },
  wireSymbol: { type: String, default: '◇' },
  imageUrl: { type: String },
  additionalImages: [{ type: String }],
  fileFormats: [{ type: String, enum: ['STL', '3DM', 'OBJ', 'ZPR', 'STEP', 'IGES'] }],
  licenseType: { type: String, enum: ['Commercial', 'Personal', 'Enterprise'], default: 'Commercial' },
  fileUrl: { type: String },
  downloadCount: { type: Number, default: 0 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  estimatedWeight: String,
  shankDiameter: String,
  stoneSize: String,
  settingType: String,
  wallThickness: String,
  compatibleMetals: [String],
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
}, { timestamps: true });
productSchema.index({ title: 'text', subtitle: 'text', description: 'text' });
productSchema.index({ category: 1, price: 1 });
const Product = mongoose.model('Product', productSchema);
export default Product;