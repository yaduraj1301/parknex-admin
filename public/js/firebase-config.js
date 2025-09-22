import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyBh0XI8p736BK2Zn-PuC9r2FbDNBSddWRE",
  authDomain: "parknex-admin.firebaseapp.com",
  projectId: "parknex-admin",
  storageBucket: "parknex-admin.firebasestorage.app",
  messagingSenderId: "1018594733850",
  appId: "1:1018594733850:web:91a7f78628eb5e089846a3",
  measurementId: "G-0ETW3XZN2E"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);