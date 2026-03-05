import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { GoogleGenAI } from "@google/genai";

const firebaseConfig = {
  apiKey: "AIzaSyBAtFKmOC6ufo5yWSUXax61rvm8eN4rAWs",
  authDomain: "pakuacv.firebaseapp.com",
  projectId: "pakuacv",
  storageBucket: "pakuacv.firebasestorage.app",
  messagingSenderId: "890675399253",
  appId: "1:890675399253:web:fe4f2c0eb58e5d4a79e2dc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Gemini AI
export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default app;
