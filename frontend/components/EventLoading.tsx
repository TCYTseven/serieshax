"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/contexts/OnboardingContext";

interface EventLoadingProps {
  searchQuery: string;
  filters: {
    people: string;
    location: string;
    budget: string;
    trendingTopics: boolean;
    secretGems: boolean;
  };
}

const loadingSteps = [
  {
    id: 1,
    text: "Analyzing preferences with AI",
    delay: 0,
    duration: 3000,
  },
  {
    id: 2,
    text: "Connecting with local contacts",
    delay: 3000,
    duration: 4000,
  },
  {
    id: 3,
    text: "Generating conversation starters",
    delay: 7000,
    duration: 3000,
  },
  {
    id: 4,
    text: "Querying Polymarket & Reddit agents",
    delay: 10000,
    duration: 5000,
  },
];

export default function EventLoading({
  searchQuery,
  filters,
}: EventLoadingProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [pulsingDots, setPulsingDots] = useState("");
  const [startTime] = useState(Date.now());

  useEffect(() => {
    // Pulsing dots animation
    const dotInterval = setInterval(() => {
      setPulsingDots((prev) => {
        if (prev.length >= 3) return "";
        return prev + ".";
      });
    }, 500);

    // Step progression
    const stepTimers = loadingSteps.map((step, index) => {
      return setTimeout(() => {
        setActiveStep(index);
      }, step.delay);
    });

    // Overall progress bar - smooth animation
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / 15000) * 100, 100);
      setProgress(newProgress);
    }, 50);

    // Navigate after 15 seconds
    const finalTimer = setTimeout(() => {
      router.push(
        `/event-results?query=${encodeURIComponent(searchQuery)}&people=${filters.people}&location=${encodeURIComponent(filters.location)}&budget=${filters.budget}&trending=${filters.trendingTopics}&gems=${filters.secretGems}`,
      );
    }, 15000);

    return () => {
      clearInterval(dotInterval);
      clearInterval(progressInterval);
      stepTimers.forEach((timer) => clearTimeout(timer));
      clearTimeout(finalTimer);
    };
  }, [searchQuery, filters, router, startTime]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => {
          const randomX = Math.random() * 100;
          const randomY = Math.random() * 100;
          return (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-[#0084ff]/20 rounded-full"
              initial={{
                x: `${randomX}%`,
                y: `${randomY}%`,
                opacity: 0,
              }}
              animate={{
                y: [`${randomY}%`, `${(randomY + 30) % 100}%`],
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          );
        })}
      </div>

      <div className="w-full max-w-3xl mx-auto space-y-12 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-normal text-[#0084ff] leading-[1.1] tracking-[-0.02em]">
            Creating your perfect event{pulsingDots}
          </h1>
          <p className="text-white/40 text-sm font-light">
            Our AI is working behind the scenes to curate the best experience for you
          </p>
        </motion.div>

        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#0084ff] via-[#00a0ff] to-[#0084ff] rounded-full relative"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "linear" }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </motion.div>
          </div>
          <div className="flex justify-between text-xs text-white/40">
            <span>Processing</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Loading Steps */}
        <div className="space-y-6">
          {loadingSteps.map((step, index) => {
            const isActive = activeStep === index;
            const isCompleted = activeStep > index;
            const elapsed = Date.now() - startTime;
            const stepProgress = isActive
              ? Math.min(
                  Math.max(0, ((elapsed - step.delay) / step.duration) * 100),
                  100,
                )
              : isCompleted
                ? 100
                : 0;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: isActive || isCompleted ? 1 : 0.4,
                  x: 0,
                }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Animated icon */}
                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                      {isCompleted ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full bg-[#0084ff] flex items-center justify-center"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </motion.div>
                      ) : isActive ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="w-6 h-6 border-2 border-[#0084ff] border-t-transparent rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 border-2 border-white/20 rounded-full" />
                      )}
                    </div>
                    <p
                      className={`text-base transition-colors ${
                        isActive
                          ? "text-[#0084ff] font-medium"
                          : isCompleted
                            ? "text-white"
                            : "text-white/40"
                      }`}
                    >
                      {step.text}
                    </p>
                  </div>
                </div>

                {/* Individual step progress bar */}
                {(isActive || isCompleted) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="ml-9"
                  >
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-[#0084ff]/30 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${stepProgress}%` }}
                        transition={{ duration: 0.3, ease: "linear" }}
                      />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* AI Processing Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center justify-center gap-2 text-white/30 text-xs"
        >
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 bg-[#0084ff] rounded-full"
          />
          <span>AI processing in real-time</span>
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            className="w-2 h-2 bg-[#0084ff] rounded-full"
          />
        </motion.div>
      </div>
    </div>
  );
}
