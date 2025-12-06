"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase-client";

export default function ProfileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const loadUserName = async () => {
      if (user) {
        try {
          const supabase = createClient();
          const { data } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", user.id)
            .single();

          if (data?.display_name) {
            setUserName(data.display_name);
          }
        } catch (error) {
          console.error("Error loading user name:", error);
        }
      }
    };

    loadUserName();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSettings = () => {
    setIsOpen(false);
    router.push("/settings");
  };

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Get user initial from name
  const getInitial = () => {
    if (userName && userName.trim().length > 0) {
      return userName.trim().charAt(0).toUpperCase();
    }
    // Fallback to email if no name
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-[#0084ff]/20 text-[#0084ff] flex items-center justify-center text-xs font-light">
          {getInitial()}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-12 left-0 z-50 w-48 bg-black border border-white/10 shadow-lg"
            >
              <div className="py-2">
                <div className="px-4 py-2 border-b border-white/10">
                  <p className="text-xs text-white/40 uppercase tracking-wider font-light">
                    {user?.email || "Not signed in"}
                  </p>
                </div>

                <button
                  onClick={handleSettings}
                  className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 transition-colors font-light tracking-wide"
                >
                  Settings
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 transition-colors font-light tracking-wide border-t border-white/10"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

