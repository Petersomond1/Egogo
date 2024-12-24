import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "egogo-chat.firebaseapp.com",
  projectId: "egogo-chat",
  storageBucket: "egogo-chat.firebasestorage.app",
  messagingSenderId: "623150398949",
  appId: "1:623150398949:web:30dbce3b0950375355030c"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);  // Pass the app instance
export const db = getFirestore(app);   // Pass the app instance
export const storage = getStorage(app);    // Pass the app instance