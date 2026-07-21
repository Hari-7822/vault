import mongoose from 'mongoose';
const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1, min: 1 },
    addedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });
cartSchema.index({ user: 1 });
const Cart = mongoose.model('Cart', cartSchema);
export default Cart;