"use client";

import { createContext, useContext, useState } from "react";

interface User {
  uid: string;
  email: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    console.log("Mock sign in:", email);
    setUser({ uid: "mock-uid", email });
  };

  const signUp = async (email: string, password: string) => {
    console.log("Mock sign up:", email);
    setUser({ uid: "mock-uid", email });
  };

  const logout = async () => {
    console.log("Mock logout");
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    console.log("Mock password reset:", email);
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
