"use client";

import { createContext, useContext, useEffect, useState } from "react";
// TODO: Replace with real Firebase imports once Firebase is properly initialized
// For now, we're using mock/null implementations
let User: any = null;
let signInWithEmailAndPassword: any = null;
let createUserWithEmailAndPassword: any = null;
let signOut: any = null;
let onAuthStateChanged: any = null;
let sendPasswordResetEmail: any = null;

// Try to import Firebase functions if available
try {
  const firebase = require("firebase/auth");
  User = firebase.User;
  signInWithEmailAndPassword = firebase.signInWithEmailAndPassword;
  createUserWithEmailAndPassword = firebase.createUserWithEmailAndPassword;
  signOut = firebase.signOut;
  onAuthStateChanged = firebase.onAuthStateChanged;
  sendPasswordResetEmail = firebase.sendPasswordResetEmail;
} catch (e) {
  console.warn("Firebase auth not available - using mocks");
}

import { auth } from "@/lib/firebase";
import { createUserProfile } from "@/services/firebaseService";

interface AuthContextType {
  user: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If auth is not available (Firebase not initialized), set loading to false
    if (!auth) {
      console.warn("Firebase auth not available - using mock auth");
      setLoading(false);
      return;
    }

    if (!onAuthStateChanged) {
      console.warn("onAuthStateChanged not available");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      if (!auth) {
        console.warn("Firebase auth not available - skipping sign in");
        return;
      }
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      if (!auth) {
        console.warn("Firebase auth not available - skipping sign up");
        return;
      }
      console.log("Starting sign up process for:", email);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("Firebase auth user created:", userCredential.user.uid);
      
      // Create user profile in Firestore
      await createUserProfile(userCredential.user.uid, email);
      console.log("Sign up process completed successfully");
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (!auth) {
        console.warn("Firebase auth not available - skipping logout");
        return;
      }
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      if (!auth) {
        console.warn("Firebase auth not available - skipping password reset");
        return;
      }
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    logout,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
