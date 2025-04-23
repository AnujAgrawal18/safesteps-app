import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // Import Firebase Auth

const firebaseConfig = {
    apiKey: "AIzaSyCRYgcUdqLIaZG5izPHQkGLlIc5FPVdgpg",
    authDomain: "safesteps-app-34f8e.firebaseapp.com",
    projectId: "safesteps-app-34f8e",
    storageBucket: "safesteps-app-34f8e.firebasestorage.app",
    messagingSenderId: "899099313426",
    appId: "1:899099313426:web:df4335f096b7d29708dfcb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Initialize Firebase Auth

export { db, auth };
