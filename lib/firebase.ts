// TODO: Firebase imports will be enabled once dependencies are properly installed
// Temporary placeholder to allow app to build while npm install completes

import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

export const auth = null as unknown as Auth;
export const db = null as unknown as Firestore;

// Mock functions for development
export const initializeApp = () => {};
export const getAuth = () => null;
export const getFirestore = () => null;

const firebaseStubs = { auth, db };

export default firebaseStubs;
