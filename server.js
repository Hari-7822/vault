import './env.js';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cron from 'node-cron';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import settingRoutes from './routes/settings.js';
import supportRoutes from './routes/support.js';
import categoryRoutes from './routes/categories.js';
import couponRoutes from './routes/coupons.js';
import whatsappRoutes from './routes/whatsapp.js';
import bannerRoutes from './routes/banners.js';
import pdfRoutes from './routes/invoice.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import wishlistRoutes from './routes/wishlist.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import { startPaymentReminderCron } from './scripts/paymentReminderCron.js';
import { startWhatsAppScheduler } from './scripts/whatsappScheduler.js';
import { cleanupExpiredMemberships } from './scripts/cleanExpiredMemberships.js';
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));
app.use((req, res, next) => {
  const start = Date.now();
  const bodyLog = Object.keys(req.body).length ? req.body : (Object.keys(req.query).length ? req.query : null);
  console.log(`\n[${req.method}] ${req.originalUrl} REQUEST:`, bodyLog ? bodyLog : '');
  const originalJson = res.json;
  res.json = function (body) {
    const duration = Date.now() - start;
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`[${req.method}] ${req.originalUrl} SUCCESS ${res.statusCode} - ${duration}ms`);
    } else {
      console.log(`[${req.method}] ${req.originalUrl} ERROR ${res.statusCode} - ${duration}ms:`, body);
    }
    return originalJson.call(this, body);
  };
  next();
});
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/admin', adminRoutes);
app.get('/', (req, res) => {
  res.json({
    message: 'The Vault API',
    version: '1.0.0',
    status: 'operational',
  });
});
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin portal available at http://localhost:${PORT}/admin.html`);
  // startPaymentReminderCron();
  // startWhatsAppScheduler();
  // cron.schedule('0 * * * *', () => {
    // cleanupExpiredMemberships().catch(console.error);
  // });
});