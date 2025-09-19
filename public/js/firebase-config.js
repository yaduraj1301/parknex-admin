import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyBDG2sJZF5Z2T3ABa0bJ_dOF2E_CDZvRFk",
  authDomain: "parknex-e6cea.firebaseapp.com",
  projectId: "parknex-e6cea",
  storageBucket: "parknex-e6cea.firebasestorage.app",
  messagingSenderId: "830756459271",
  appId: "1:830756459271:web:f2c5591a282887a10b6ba2",
  measurementId: "G-VN0P6KKP50"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);