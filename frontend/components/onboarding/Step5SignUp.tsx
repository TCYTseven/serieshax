"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { saveOnboardingToSupabase } from "@/lib/onboarding-service";
import { createClient } from "@/lib/supabase-client";

interface Step5SignUpProps {
  onNext: () => void;
  onSkip: () => void;
}

export default function Step5SignUp({ onNext, onSkip }: Step5SignUpProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignIn, setIsSignIn] = useState(false);
  const { signUp, signIn } = useAuth();
  const { data: onboardingData } = useOnboarding();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (!isSignIn) {
      // Sign up validation
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      if (isSignIn) {
        // Sign in existing user
        await signIn(email, password);
      } else {
        // Sign up new user
        await signUp(email, password);
      }

      // Wait a bit for session to be established
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get the user ID after auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (user && !userError) {
        // Save onboarding data from localStorage to Supabase
        await saveOnboardingToSupabase(user.id, onboardingData);
        
        // Clear localStorage since it's now in Supabase
        localStorage.removeItem("onboarding_data");
        
        // Proceed to completion screen
        onNext();
      } else {
        setError(
          isSignIn
            ? "Unable to sign in. Please check your credentials."
            : "Account created but unable to sign in. Please try signing in."
        );
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(
        err.message ||
          (isSignIn
            ? "Failed to sign in. Please try again."
            : "Failed to create account. Please try again.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-light tracking-tight text-white">
            {isSignIn ? "Sign In" : "Create Your Account"}
          </h2>
          <p className="text-white/60 text-sm font-light tracking-wide">
            {isSignIn
              ? "Welcome back! Sign in to continue"
              : "Save your preferences and access Social Oracle anytime"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              classNames={{
                base: "w-full",
                input: "text-white",
                inputWrapper: "bg-black/40 border-white/10 hover:border-white/20 focus-within:border-[#0084ff]",
                label: "text-white/70 text-xs uppercase tracking-wider font-light",
              }}
              variant="bordered"
              radius="none"
              size="lg"
              isDisabled={isLoading}
            />

            <Input
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              classNames={{
                base: "w-full",
                input: "text-white",
                inputWrapper: "bg-black/40 border-white/10 hover:border-white/20 focus-within:border-[#0084ff]",
                label: "text-white/70 text-xs uppercase tracking-wider font-light",
              }}
              variant="bordered"
              radius="none"
              size="lg"
              isDisabled={isLoading}
            />

            {!isSignIn && (
              <Input
                type="password"
                label="Confirm Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                classNames={{
                  base: "w-full",
                  input: "text-white",
                  inputWrapper: "bg-black/40 border-white/10 hover:border-white/20 focus-within:border-[#0084ff]",
                  label: "text-white/70 text-xs uppercase tracking-wider font-light",
                }}
                variant="bordered"
                radius="none"
                size="lg"
                isDisabled={isLoading}
              />
            )}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full bg-[#0084ff] text-white font-light tracking-wide"
              radius="none"
              size="lg"
              isLoading={isLoading}
              isDisabled={isLoading}
            >
              {isLoading
                ? isSignIn
                  ? "Signing In..."
                  : "Creating Account..."
                : isSignIn
                ? "Sign In"
                : "Create Account"}
            </Button>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignIn(!isSignIn);
                  setError(null);
                }}
                className="text-white/50 text-xs font-light tracking-wide hover:text-white/70 transition-colors"
                disabled={isLoading}
              >
                {isSignIn
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>

            <button
              type="button"
              onClick={onSkip}
              className="w-full text-center text-white/30 text-xs font-light tracking-wide hover:text-white/50 transition-colors"
              disabled={isLoading}
            >
              Skip for now
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

