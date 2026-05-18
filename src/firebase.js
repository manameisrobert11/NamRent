import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC1nEz-kAcD_yXpcCSARlwqad2Vthxecps",
  authDomain: "namrent-a9e8b.firebaseapp.com",
  projectId: "namrent-a9e8b",
  storageBucket: "namrent-a9e8b.firebasestorage.app",
  messagingSenderId: "146711166782",
  appId: "1:146711166782:web:50b0f943d92bc4322ef66f",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();