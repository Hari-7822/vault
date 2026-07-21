
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from '../models/User.js';

async function checkTokens() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({ fcmTokens: { $exists: true, $not: { $size: 0 } } });
    console.log(`Found ${users.length} users with FCM tokens.`);
    users.forEach(u => {
      console.log(`User: ${u.email} - Tokens: ${u.fcmTokens.length}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkTokens();
