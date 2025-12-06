"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

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
    const dotInterval = setInterval(() => {
      setPulsingDots((prev) => {
        if (prev.length >= 3) return "";
        return prev + ".";
      });
    }, 500);

    const stepTimers = loadingSteps.map((step, index) => {
      return setTimeout(() => {
        setActiveStep(index);
      }, step.delay);
    });

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / 15000) * 100, 100);
      setProgress(newProgress);
    }, 50);

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
      {/* Subtle background accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-[#0084ff]/3 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#0084ff]/3 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0084ff]/2 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 132, 255, 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0, 132, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="w-full max-w-3xl mx-auto space-y-12 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-light text-[#0084ff] leading-[1.1] tracking-tight">
            Creating your perfect event{pulsingDots}
          </h1>
          <p className="text-white/40 text-base font-light">
            Our AI is working behind the scenes to curate the best experience for you
          </p>
        </motion.div>

        {/* Main Progress Bar */}
        <div className="space-y-3">
          <div className="flex justify-between text-xs text-white/40 uppercase tracking-wider font-medium">
            <span>Processing</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-px bg-white/10 relative overflow-hidden">
            <motion.div
              className="h-full bg-[#0084ff] absolute left-0 top-0"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "linear" }}
            />
          </div>
        </div>

        {/* Loading Steps */}
        <div className="space-y-1">
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
                initial={{ opacity: 0 }}
                animate={{
                  opacity: isActive || isCompleted ? 1 : 0.3,
                }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-4 h-4 border border-[#0084ff] flex items-center justify-center"
                        style={{ borderRadius: 0 }}
                      >
                        <div className="w-2 h-2 bg-[#0084ff]" />
                      </motion.div>
                    ) : isActive ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-4 h-4 border border-[#0084ff] border-t-transparent"
                        style={{ borderRadius: 0 }}
                      />
                    ) : (
                      <div className="w-4 h-4 border border-white/10" style={{ borderRadius: 0 }} />
                    )}
                  </div>
                  <p
                    className={`text-base font-light transition-colors ${
                      isActive
                        ? "text-[#0084ff]"
                        : isCompleted
                          ? "text-white"
                          : "text-white/30"
                    }`}
                  >
                    {step.text}
                  </p>
                </div>

                {/* Individual step progress bar */}
                {(isActive || isCompleted) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="ml-8"
                  >
                    <div className="h-px bg-white/5 relative overflow-hidden">
                      <motion.div
                        className="h-full bg-[#0084ff]/30 absolute left-0 top-0"
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
          className="flex items-center justify-center gap-2 text-white/30 text-xs font-light uppercase tracking-wider"
        >
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1 h-1 bg-[#0084ff]"
            style={{ borderRadius: 0 }}
          />
          <span>AI processing in real-time</span>
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            className="w-1 h-1 bg-[#0084ff]"
            style={{ borderRadius: 0 }}
          />
        </motion.div>
      </div>
    </div>
  );
}
