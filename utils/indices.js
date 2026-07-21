import '../env.js' 

import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

async function safeCreateIndex(collectionName, keySpec, options = {}) {
  const collection = db.collection(collectionName);
  const indexName = options.name || Object.keys(keySpec).map(k => `${k}_${keySpec[k]}`).join('_');

  try {
    await collection.createIndex(keySpec, options);
    console.log(`${collectionName}.${indexName}`);
  } catch (err) {
    if (err.code === 85 || err.code === 86) {
      try {
        await collection.dropIndex(indexName);
        console.log(`Dropped conflicting index: ${collectionName}.${indexName}`);
        await collection.createIndex(keySpec, options);
        console.log(`${collectionName}.${indexName} (recreated)`);
      } catch (dropErr) {
        console.warn(`Could not recreate ${collectionName}.${indexName}: ${dropErr.message}`);
      }
    } else {
      console.warn(`${collectionName}.${indexName}: ${err.message}`);
    }
  }
}

console.log('\nVegetables');
await safeCreateIndex('vegetables', { name: 1 });
await safeCreateIndex('vegetables', { category: 1 });
await safeCreateIndex('vegetables', { isActive: 1 });
await safeCreateIndex('vegetables', { category: 1, isActive: 1 }, { name: 'category_1_isActive_1' });

console.log('\nInventory');
await safeCreateIndex('inventories', { vegetable: 1 }, { unique: true });
await safeCreateIndex('inventories', { stockQuantity: 1 });

console.log('\nOrders');
await safeCreateIndex('orders', { customer: 1 });
await safeCreateIndex('orders', { status: 1 });
await safeCreateIndex('orders', { paymentStatus: 1 });
await safeCreateIndex('orders', { deliveryDate: 1 });
await safeCreateIndex('orders', { orderDate: -1 });
await safeCreateIndex('orders', { customer: 1, paymentStatus: 1 }, { name: 'customer_1_paymentStatus_1' });
await safeCreateIndex('orders', { customer: 1, status: 1 },        { name: 'customer_1_status_1' });

console.log('\nUsers');
await safeCreateIndex('users', { email: 1 }, { unique: true, sparse: true });
await safeCreateIndex('users', { role: 1 });
await safeCreateIndex('users', { 'subscription.isActive': 1 },           { name: 'subscription_isActive_1' });
await safeCreateIndex('users', { 'subscription.nextDeliveryDate': 1 },   { name: 'subscription_nextDeliveryDate_1' });
await safeCreateIndex('users', { 'appSubscription.status': 1 },          { name: 'appSubscription_status_1' });

console.log('\nSupport Chats');
await safeCreateIndex('supportchats', { customer: 1 });
await safeCreateIndex('supportchats', { createdAt: -1 });
await safeCreateIndex('supportchats', { customer: 1, createdAt: -1 }, { name: 'customer_1_createdAt_-1' });

console.log('\nCoupons');
await safeCreateIndex('coupons', { code: 1 },     { unique: true });
await safeCreateIndex('coupons', { isActive: 1 });

console.log('\nCategories');
await safeCreateIndex('categories', { name: 1 });
await safeCreateIndex('categories', { isActive: 1 });

console.log('\nSystem Settings');
await safeCreateIndex('systemsettings', { key: 1 }, { unique: true });

console.log('\nAll indexes created successfully\n');
await mongoose.disconnect();