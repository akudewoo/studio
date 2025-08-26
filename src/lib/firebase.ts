// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "alur-distribusi",
  "appId": "1:844802255380:web:5485d5ed43717bd6c29501",
  "storageBucket": "alur-distribusi.firebasestorage.app",
  "apiKey": "AIzaSyC5Nz9l6wcUs5c-HqsrhR6kXJmar-dX0j4",
  "authDomain": "alur-distribusi.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "844802255380"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
