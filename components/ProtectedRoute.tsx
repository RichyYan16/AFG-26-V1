"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import AuthForm from "@/components/AuthForm";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-950 flex items-center justify-center">
        <div className="text-emerald-200">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-emerald-950 flex items-center justify-center p-4">
        <AuthForm />
      </div>
    );
  }

  return <>{children}</>;
}
