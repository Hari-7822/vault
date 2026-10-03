import admin from 'firebase-admin';
import { createRequire } from 'module';
import fs from 'fs';

if (!admin.apps.length) {
  try {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = admin.credential.cert(serviceAccount);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      const raw = fs.readFileSync(filePath, 'utf8');
      credential = admin.credential.cert(JSON.parse(raw));
    } else {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      });
    }

    admin.initializeApp({ credential });
    console.log('Firebase initialized');
  } catch (e) {
    console.error('Firebase init failed:', e.message);
  }
}

export default admin;
