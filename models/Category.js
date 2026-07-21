import mongoose from 'mongoose';
const categorySchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please provide category name'], unique: true, trim: true },
  nameTamil: { type: String, trim: true, default: '' },
  slug: { type: String, unique: true, trim: true },
  description: { type: String, trim: true },
  icon: { type: String },
  productCount: { type: Number, default: 0 },
  imageUrl: { type: String, default: 'https://placehold.co/1000x1000/png?text=No+Image' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
categorySchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-');
  }
  this.updatedAt = Date.now();
  next();
});
export default mongoose.model('Category', categorySchema);