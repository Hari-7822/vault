import admin from 'firebase-admin';

let initialized = admin.apps.length > 0;

if (!initialized) {
  try {
    let credential = null;
    let source = null;

    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
      source = 'individual env vars';
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
      source = 'FIREBASE_SERVICE_ACCOUNT_JSON';
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH && process.env.VERCEL !== '1') {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      credential = admin.credential.cert(JSON.parse(fs.readFileSync(filePath, 'utf8')));
      source = 'service account file';
    }

    if (credential) {
      admin.initializeApp({ credential });
      initialized = true;
      console.log('Firebase initialized from', source);
    } else {
      console.error('Firebase error: no credentials found. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY on Vercel.');
    }
  } catch (e) {
    console.error('Firebase init failed:', e.message);
  }
}

export default admin;
export { initialized };