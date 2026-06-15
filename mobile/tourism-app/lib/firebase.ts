import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDiOVHpYngNeEtt9uq8rtvM0dHxO6Uuq7g",
  authDomain: "ai-tourism-app-724f8.firebaseapp.com",
  projectId: "ai-tourism-app-724f8",
  storageBucket: "ai-tourism-app-724f8.firebasestorage.app",
  messagingSenderId: "647735978896",
  appId: "1:647735978896:web:3430a935cdf3b62e466115",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };