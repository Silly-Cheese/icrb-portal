import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import {
  getAuth,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAUjDXbH1YuVpLZY_pDTR3UAoEvp2cmank",
  authDomain: "icrb-portal.firebaseapp.com",
  projectId: "icrb-portal",
  storageBucket: "icrb-portal.firebasestorage.app",
  messagingSenderId: "521257639950",
  appId: "1:521257639950:web:e9020d0892ad8d017e9c5f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

await setPersistence(auth, browserLocalPersistence);

export {
  auth,
  db,
  collection,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  getDocs,
  onAuthStateChanged,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signOut,
  updateDoc
};