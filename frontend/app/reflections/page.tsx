"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase-client";
import ProfileMenu from "@/components/ProfileMenu";

interface Reflection {
  id: string;
  user_id: string;
  raw_reflection: string;
  analysis: string | null;
  follow_up_questions: string[] | null;
  created_at: string;
  updated_at: string;
}

export default function ReflectionsPage() {
  const { user } = useAuth();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReflections = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        
        // Get reflections for this user (user.id maps to users.id in the database)
        const { data, error } = await supabase
          .from("reflections")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading reflections:", error);
        } else {
          setReflections(data || []);
        }
      } catch (error) {
        console.error("Error loading reflections:", error);
      } finally {
        setLoading(false);
      }
    };

    loadReflections();
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-[#0084ff]/3 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#0084ff]/3 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 132, 255, 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0, 132, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Profile Menu - Top Left */}
      <div className="absolute top-6 left-6 z-50">
        <ProfileMenu />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="space-y-4">
            <div className="w-12 h-px bg-[#0084ff] mb-4" />
            <h1 className="text-5xl md:text-6xl font-light text-white leading-[1.05] tracking-tight">
              Reflections
            </h1>
            <p className="text-white/40 text-lg font-light">
              Your personal reflection journal
            </p>
          </div>

          {/* Reflections List */}
          {loading ? (
            <div className="text-white/50 text-center py-12">Loading...</div>
          ) : reflections.length === 0 ? (
            <div className="text-white/50 text-center py-12">
              No reflections yet. Start reflecting to see them here.
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
                  {/* Date */}
                  <div className="text-white/30 text-xs font-light uppercase tracking-wider mb-4">
                    {formatDate(reflection.created_at)}
                  </div>

                  {/* Raw Reflection */}
                  <div className="mb-6">
                    <div className="text-white/40 text-xs uppercase tracking-wider mb-2 font-light">
                      Reflection
                    </div>
                    <p className="text-white/80 text-base font-light leading-relaxed">
                      {reflection.raw_reflection}
                    </p>
                  </div>

                  {/* Analysis */}
                  {reflection.analysis && (
                    <div className="mb-6 pt-6 border-t border-white/10">
                      <div className="text-white/40 text-xs uppercase tracking-wider mb-2 font-light">
                        Analysis
                      </div>
                      <p className="text-white/70 text-sm font-light leading-relaxed">
                        {reflection.analysis}
                      </p>
                    </div>
                  )}

                  {/* Follow-up Questions */}
                  {reflection.follow_up_questions && reflection.follow_up_questions.length > 0 && (
                    <div className="pt-6 border-t border-white/10">
                      <div className="text-white/40 text-xs uppercase tracking-wider mb-3 font-light">
                        Follow-up Questions
                      </div>
                      <ul className="space-y-2">
                        {reflection.follow_up_questions.map((question, qIndex) => (
                          <li
                            key={qIndex}
                            className="text-white/60 text-sm font-light flex items-start gap-2"
                          >
                            <span className="text-[#0084ff] mt-1">•</span>
                            <span>{question}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

