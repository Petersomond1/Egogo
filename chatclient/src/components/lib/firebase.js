import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: "import.meta.env.VITE_FIREBASE_API_KEY",
  authDomain: "egogo-chat.firebaseapp.com",
  projectId: "egogo-chat",
  storageBucket: "egogo-chat.firebasestorage.app",
  messagingSenderId: "623150398949",
  appId: "1:623150398949:web:30dbce3b0950375355030c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth();  //To authenticate users
export const db = getFirestore();   //To store chat messages, user data, etc.
export const storage = getStorage();    //To store images, videos, etc.