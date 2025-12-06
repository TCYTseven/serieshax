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
    <div className="min-h-screen bg-black px-6 py-12">
      <div className="max-w-4xl mx-auto space-y-12">
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
  );
}

