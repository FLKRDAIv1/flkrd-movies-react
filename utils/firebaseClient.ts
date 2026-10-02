import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "flkrd-studio",
  appId: "1:91033445719:web:06976417c85b6487b30a12",
  storageBucket: "flkrd-studio.firebasestorage.app",
  apiKey: "AIzaSyDgud7UiPBG0G5_Szd1Q-xEABduME_2pCc",
  authDomain: "flkrd-studio.firebaseapp.com",
  messagingSenderId: "91033445719",
  measurementId: "G-KXEYB1NNJR"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
