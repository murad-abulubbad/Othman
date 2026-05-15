import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc, 
    deleteDoc, 
    doc,
    updateDoc,
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCslThkqYCCNWRnp81P5_l2AY3gZkvFAgA",
  authDomain: "othmanforgaming.firebaseapp.com",
  projectId: "othmanforgaming",
  storageBucket: "othmanforgaming.firebasestorage.app",
  messagingSenderId: "373163148442",
  appId: "1:373163148442:web:1cb9617e58e6db0c2b8b23",
  measurementId: "G-NDJJSN8J4L"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// تصدير الأدوات التي سنحتاجها في الكود الآخر
export { app, db, collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy };