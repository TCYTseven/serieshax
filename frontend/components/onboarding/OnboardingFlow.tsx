"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { Button } from "@heroui/button";
import Step1PersonalInfo from "./Step1PersonalInfo";
import Step2Interests from "./Step2Interests";
import Step3Goals from "./Step3Goals";
import Step4SocialVibe from "./Step4SocialVibe";
import Step5SignUp from "./Step5SignUp";
import CompletionScreen from "./CompletionScreen";

const TOTAL_STEPS = 5;
const SWIPE_THRESHOLD = 50;

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const { completeOnboarding } = useOnboarding();
  const [showCompletion, setShowCompletion] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowCompletion(true);
    }
  };

  const handleSkip = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowCompletion(true);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    await completeOnboarding();
  };

  // Swipe handlers
  const minSwipeDistance = SWIPE_THRESHOLD;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentStep < TOTAL_STEPS) {
      handleNext();
    }
    if (isRightSwipe && currentStep > 1) {
      handlePrevious();
    }
  };

  if (showCompletion) {
    return <CompletionScreen onComplete={handleComplete} />;
  }

  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div
      className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Subtle background accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-[#0084ff]/3 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#0084ff]/3 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#0084ff]/2 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 132, 255, 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0, 132, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-900 z-10">
        <motion.div
          className="h-full bg-[#0084ff]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Step Content */}
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full"
          >
            {currentStep === 1 && (
              <Step1PersonalInfo onNext={handleNext} onSkip={handleSkip} />
            )}
            {currentStep === 2 && (
              <Step2Interests onNext={handleNext} onSkip={handleSkip} />
            )}
            {currentStep === 3 && (
              <Step3Goals onNext={handleNext} onSkip={handleSkip} />
            )}
            {currentStep === 4 && (
              <Step4SocialVibe onNext={handleNext} onSkip={handleSkip} />
            )}
            {currentStep === 5 && (
              <Step5SignUp onNext={handleNext} onSkip={handleSkip} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step Indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
        {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
          <motion.div
            key={index}
            className={`h-2 rounded-full transition-all ${
              index + 1 === currentStep
                ? "w-8 bg-[#0084ff]"
                : "w-2 bg-gray-700"
            }`}
            initial={false}
            animate={{
              width: index + 1 === currentStep ? 32 : 8,
              backgroundColor:
                index + 1 === currentStep ? "#0084ff" : "#374151",
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}
