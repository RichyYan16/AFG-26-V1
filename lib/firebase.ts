import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Debug: Check if environment variables are loaded
console.log("Firebase config:", firebaseConfig);
console.log("Environment variables:", {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "SET" : "NOT SET",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "SET" : "NOT SET",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "SET" : "NOT SET",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "SET" : "NOT SET",
});

// Validate required fields
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
  console.error("Missing required Firebase configuration:");
  console.error("- API Key:", firebaseConfig.apiKey ? "SET" : "MISSING");
  console.error("- Auth Domain:", firebaseConfig.authDomain ? "SET" : "MISSING");
  console.error("- Project ID:", firebaseConfig.projectId ? "SET" : "MISSING");
  console.error("- App ID:", firebaseConfig.appId ? "SET" : "MISSING");
  throw new Error("Firebase configuration not found. Please check your .env.local file.");
}

// Initialize Firebase
let app: any;
let auth: any;
let db: any;

try {
  app = initializeApp(firebaseConfig);
  console.log("Firebase app initialized successfully");
  
  // Initialize Firebase services
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error: any) {
  console.error("Firebase initialization error:", error);
  throw new Error(`Firebase initialization failed: ${(error as Error).message}`);
}

export default app;
export { auth, db };
