import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const firebaseConfig = {
    apiKey: "API_KEY",
    authDomain: "AUTH_DOMAIN",
    projectId: "vault-d028e",
    storageBucket: "STORAGE_BUCKET",
    messagingSenderId: "MESSAGING_SENDER_ID",
    appId: "APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

window.FirebaseGoogle = {
    async signIn() {
        const result = await signInWithPopup(auth, provider);
        const idToken = await result.user.getIdToken();
        return {
            idToken,
            email: result.user.email,
            name: result.user.displayName,
            photoUrl: result.user.photoURL,
        };
    },
    async signOut() {
        await signOut(auth);
    },
};