/**
 * Cleanup script: Delete all delivered orders with totalAmount = 0
 * Run: node cleanup-zero-orders.js
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Order from '../models/Order.js';

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const zeroOrders = await Order.find({ status: 'delivered', totalAmount: 0, paymentStatus: 'pending' });
  console.log(`Found ${zeroOrders.length} orders with totalAmount = 0`);

  if (zeroOrders.length > 0) {
    const result = await Order.deleteMany({ status: 'delivered', totalAmount: 0, paymentStatus: 'pending' });
    console.log(`Deleted ${result.deletedCount} zero-amount orders`);
  }

  await mongoose.disconnect();
  console.log('Done');
}

cleanup().catch(err => { console.error('Error:', err.message); process.exit(1); });
