import dotenv from 'dotenv';
dotenv.config();
import { admin, initialized } from '../config/firebase.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import fs from 'fs';

async function testPush() {
  const log = [];
  log.push('Firebase initialized: ' + initialized);

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({ role: 'customer', fcmTokens: { $exists: true, $not: { $size: 0 } } });
    log.push('Users with tokens: ' + users.length);

    let allTokens = [];
    users.forEach(user => {
      log.push('User: ' + user.email + ' tokens: ' + user.fcmTokens.length);
      allTokens.push(...user.fcmTokens);
    });
    allTokens = [...new Set(allTokens)];
    log.push('Total unique tokens: ' + allTokens.length);

    for (let i = 0; i < allTokens.length; i++) {
      try {
        const response = await admin.messaging().send({
          notification: {
            title: 'Test Notification',
            body: 'Push notifications are working!'
          },
          token: allTokens[i]
        });
        log.push('Token ' + (i+1) + ': SUCCESS - ' + response);
      } catch (err) {
        log.push('Token ' + (i+1) + ': FAILED - ' + err.code + ' - ' + err.message);
      }
    }
  } catch (err) {
    log.push('ERROR: ' + err.message);
  }

  fs.writeFileSync('test-push-result.json', JSON.stringify(log, null, 2));
  console.log('done');
  process.exit(0);
}

testPush();
