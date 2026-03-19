import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCvkMUSpU5aHtC1RwuN9aaIHkqgJeXisGE",
  authDomain: "vip-travel-email.firebaseapp.com",
  projectId: "vip-travel-email",
  storageBucket: "vip-travel-email.firebasestorage.app",
  messagingSenderId: "343497275120",
  appId: "1:343497275120:web:47f2606da3ac240a5e7435",
  measurementId: "G-R1M9FF0KG4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
