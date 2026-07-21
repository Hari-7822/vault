import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Banner from './models/ecom/Banner.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const banners = await Banner.find({ isActive: true }).lean();
  console.log('All active banners:', banners);
  
  const filter1 = { isActive: true, $or: [{ type: 'home' }, { type: { $exists: false } }] };
  const adminDb = mongoose.connection.db.admin();
  const dbs = await adminDb.listDatabases();
  console.log("Databases:", dbs.databases.map(d => d.name));
  
  process.exit(0);
}
run();
