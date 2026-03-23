import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAUjDXbH1YuVpLZY_pDTR3UAoEvp2cmank',
  authDomain: 'icrb-portal.firebaseapp.com',
  projectId: 'icrb-portal',
  storageBucket: 'icrb-portal.firebasestorage.app',
  messagingSenderId: '521257639950',
  appId: '1:521257639950:web:e9020d0892ad8d017e9c5f'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };