"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase-client";
import { motion } from "framer-motion";

interface Reflection {
  id: string;
  raw_reflection: string;
  analysis: string | null;
  follow_up_questions: string[] | null;
  created_at: string;
  updated_at: string;
}

export default function ReflectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
      return;
    }

    if (user) {
      loadReflections();
    }
  }, [user, authLoading]);

  const loadReflections = async () => {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("reflections")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError("Failed to load reflections.");
      } else {
        setReflections(data || []);
      }
    } catch (err) {
      console.error("Error loading reflections:", err);
      setError("An error occurred while loading reflections.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50 text-sm font-light">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <motion.div
          className="absolute top-20 left-10 w-96 h-96 bg-[#0084ff]/3 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.4, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-[#0084ff]/3 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0084ff]/2 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
        
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 132, 255, 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0, 132, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        
        {/* Animated grid lines */}
        <motion.div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 132, 255, 0.2) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0, 132, 255, 0.2) 1px, transparent 1px)`,
            backgroundSize: "100px 100px",
          }}
          animate={{
            backgroundPosition: ['0px 0px', '100px 100px'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        
        {/* Floating particles */}
        {Array.from({ length: 15 }).map((_, i) => {
          const size = Math.random() * 2 + 1;
          const startX = Math.random() * 100;
          const startY = Math.random() * 100;
          
          return (
            <motion.div
              key={i}
              className="absolute rounded-full bg-[#0084ff]/15"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${startX}%`,
                top: `${startY}%`,
              }}
              animate={{
                y: [
                  startY * window.innerHeight * 0.01,
                  (startY - 40) * window.innerHeight * 0.01,
                  startY * window.innerHeight * 0.01,
                ],
                x: [
                  startX * window.innerWidth * 0.01,
                  (startX + Math.random() * 30 - 15) * window.innerWidth * 0.01,
                  startX * window.innerWidth * 0.01,
                ],
                opacity: [0.15, 0.4, 0.15],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: Math.random() * 6 + 5,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="w-12 h-px bg-[#0084ff] mb-4" />
          <h1 className="text-5xl md:text-6xl font-light text-white leading-[1.05] tracking-tight">
            Reflections
          </h1>
          <p className="text-white/40 text-lg font-light">
            Your thoughts and experiences
          </p>
        </motion.div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Reflections List */}
        {reflections.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/40 text-lg font-light">
              No reflections yet. Start reflecting on your experiences!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {reflections.map((reflection, index) => (
              <motion.div
                key={reflection.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-black border border-white/10 p-6 md:p-8"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/30 text-xs font-light uppercase tracking-wider">
                      {formatDate(reflection.created_at)}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-white/40 text-xs uppercase tracking-wider mb-2">
                      Reflection
                    </h3>
                    <p className="text-white/70 text-sm font-light leading-relaxed">
                      {reflection.raw_reflection}
                    </p>
                  </div>

                  {reflection.analysis && (
                    <div>
                      <h3 className="text-white/40 text-xs uppercase tracking-wider mb-2">
                        Analysis
                      </h3>
                      <p className="text-white/60 text-sm font-light leading-relaxed">
                        {reflection.analysis}
                      </p>
                    </div>
                  )}

                  {reflection.follow_up_questions &&
                    reflection.follow_up_questions.length > 0 && (
                      <div>
                        <h3 className="text-white/40 text-xs uppercase tracking-wider mb-2">
                          Follow-up Questions
                        </h3>
                        <ul className="space-y-2">
                          {reflection.follow_up_questions.map((question, qIdx) => (
                            <li
                              key={qIdx}
                              className="text-white/60 text-sm font-light"
                            >
                              • {question}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

