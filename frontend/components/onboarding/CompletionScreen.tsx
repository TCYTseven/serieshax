"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@heroui/button";

interface CompletionScreenProps {
  onComplete: () => Promise<void>;
}

export default function CompletionScreen({
  onComplete,
}: CompletionScreenProps) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-[#0084ff] rounded-full"
              initial={{
                x: `${Math.random() * 100}%`,
                y: -10,
                opacity: 1,
              }}
              animate={{
                y: "100vh",
                opacity: 0,
                rotate: 360,
              }}
              transition={{
                duration: Math.random() * 2 + 1,
                delay: Math.random() * 0.5,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-8 max-w-md mx-auto z-10"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-6xl mb-4"
        >
          🎉
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-light text-white mb-4">
          You're all set!
        </h1>

        <p className="text-gray-400 text-lg">
          Thanks for joining Social Oracle. Let's get started!
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={async () => {
              setIsCompleting(true);
              try {
                await onComplete();
              } finally {
                setIsCompleting(false);
              }
            }}
            disabled={isCompleting}
            className="bg-[#0084ff] text-white font-medium px-8"
            radius="full"
            size="lg"
          >
            {isCompleting ? "Saving..." : "Get Started"}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

