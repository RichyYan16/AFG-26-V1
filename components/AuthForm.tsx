"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Mail, Lock, User, X } from "lucide-react";

interface AuthFormProps {
  onClose?: () => void;
  initialMode?: 'signin' | 'signup';
}

export default function AuthForm({ onClose, initialMode = 'signin' }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          return;
        }
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      onClose?.();
    } catch (error: any) {
      setError(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    try {
      await resetPassword(email);
      setError("");
      alert("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      setError(error.message || "Failed to send reset email");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-emerald-950/90 rounded-2xl border border-emerald-800 backdrop-blur relative">
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-emerald-400 hover:text-emerald-200 hover:bg-emerald-800/50 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      )}
      
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-emerald-50 mb-2">
          {isSignUp ? "Create Account" : "Welcome Back"}
        </h2>
        <p className="text-emerald-300 text-sm">
          {isSignUp 
            ? "Sign up to start tracking your progress" 
            : "Sign in to access your dashboard"
          }
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-950/60 border border-rose-700 rounded-lg text-rose-200 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-emerald-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full pl-10 pr-3 py-3 bg-emerald-900/50 border border-emerald-700 rounded-lg text-emerald-50 placeholder-emerald-400 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:border-transparent"
            required
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-emerald-400" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full pl-10 pr-10 py-3 bg-emerald-900/50 border border-emerald-700 rounded-lg text-emerald-50 placeholder-emerald-400 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:border-transparent"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-emerald-400 hover:text-emerald-200"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {isSignUp && (
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-emerald-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full pl-10 pr-3 py-3 bg-emerald-900/50 border border-emerald-700 rounded-lg text-emerald-50 placeholder-emerald-400 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:border-transparent"
              required
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-lime-300 text-emerald-950 font-semibold rounded-lg hover:bg-lime-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Please wait..." : (isSignUp ? "Create Account" : "Sign In")}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-emerald-300">
        {isSignUp ? (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError("");
              }}
              className="text-lime-300 hover:text-lime-200 font-medium"
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError("");
              }}
              className="text-lime-300 hover:text-lime-200 font-medium"
            >
              Sign up
            </button>
            <br />
            <button
              type="button"
              onClick={handlePasswordReset}
              className="text-lime-300 hover:text-lime-200 font-medium mt-2"
            >
              Forgot password?
            </button>
          </>
        )}
      </div>
    </div>
  );
}
