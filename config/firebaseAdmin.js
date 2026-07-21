/**
 * Firebase Admin SDK — used server-side to verify Firebase ID tokens
 * (issued after client-side phone number OTP is confirmed).
 *
 * Priority order for credentials:
 * 1. FIREBASE_SERVICE_ACCOUNT_JSON env var (stringified JSON)
 * 2. FIREBASE_SERVICE_ACCOUNT_PATH env var (path to JSON file)
 * 3. Individual FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY env vars
 */
import admin from 'firebase-admin';
import { createRequire } from 'module';
import fs from 'fs';

if (!admin.apps.length) {
  try {
    let credential;

    // Option 1: full JSON string in env
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = admin.credential.cert(serviceAccount);

    // Option 2: path to JSON file (already set in .env as FIREBASE_SERVICE_ACCOUNT_PATH)
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      const raw = fs.readFileSync(filePath, 'utf8');
      credential = admin.credential.cert(JSON.parse(raw));

    // Option 3: individual env vars
    } else {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      });
    }

    admin.initializeApp({ credential });
    console.log('✅ Firebase Admin SDK initialized');
  } catch (e) {
    console.error('❌ Firebase Admin SDK init failed:', e.message);
    // Don't crash the server — phoneLogin will return 401 if admin is not available
  }
}

export default admin;
