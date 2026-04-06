import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const requiredKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);
const hasPlaceholderKey = requiredKeys.some((key) =>
  String(firebaseConfig[key] || "").includes("...")
);

if (missingKeys.length || hasPlaceholderKey) {
  console.error("[Firebase] Configuracao invalida detectada.", {
    missingKeys,
    hasPlaceholderKey,
    projectId: firebaseConfig.projectId || null,
    authDomain: firebaseConfig.authDomain || null,
  });
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
