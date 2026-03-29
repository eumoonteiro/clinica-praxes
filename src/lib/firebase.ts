import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDT5Eps6NENiV3kUYNblY55O6bqgzF1yzc",
  authDomain: "praxispsicanaliticaoficial.firebaseapp.com",
  projectId: "praxispsicanaliticaoficial",
  storageBucket: "praxispsicanaliticaoficial.firebasestorage.app",
  messagingSenderId: "223236399739",
  appId: "1:223236399739:web:746da2d1c3d05e1ed838de",
  measurementId: "G-Y1PDDH929T"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
