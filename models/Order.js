import mongoose from 'mongoose';
const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: String,
    productSubtitle: String,
    quantity: { type: Number, required: true, min: 1 },
    priceAtPurchase: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    fileFormats: [String],
    licenseType: String
  }],
  totalAmount: { type: Number, required: true },
  orderNumber: { type: String, unique: true },
  billingAddress: {
    name: String,
    email: String,
    phone: String,
    company: String,
    country: String,
    vatNumber: String,
  },
  downloadUrls: [{
    fileFormat: String,
    url: String,
    expiresAt: Date,
    downloadCount: Number,
  }],
  downloadLimit: { type: Number, default: 3 },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'cancelled', 'refunded'], default: 'pending' },
  paymentMethod: { type: String, enum: ['card', 'upi', 'paypal', 'razorpay'] },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  notes: String,
  orderDate: { type: Date, default: Date.now },
  completedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
}, { timestamps: true });
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD-${String(count + 1).padStart(6, '0')}`;
  }
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((total, item) => total + item.subtotal, 0);
  }
  next();
});
export default mongoose.model('Order', orderSchema);