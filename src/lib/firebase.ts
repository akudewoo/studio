// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration, directly embedded
const firebaseConfig = {
  apiKey: "AIzaSyC5Nz9l6wcUs5c-HqsrhR6kXJmar-dX0j4",
  authDomain: "alur-distribusi.firebaseapp.com",
  projectId: "alur-distribusi",
  storageBucket: "alur-distribusi.firebasestorage.app",
  messagingSenderId: "844802255380",
  appId: "1:844802255380:web:5485d5ed43717bd6c29501"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
