import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyAtqQ2LhXXaZllPLer05JqEEOORfTgfwCg",
  authDomain: "vault-d028e.firebaseapp.com",
  projectId: "vault-d028e",
  storageBucket: "vault-d028e.firebasestorage.app",
  messagingSenderId: "403468698190",
  appId: "1:403468698190:web:e35410c8e4d3ae6f59b91f",
  measurementId: "G-JJFH2LNHRX"
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