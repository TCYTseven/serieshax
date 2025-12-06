"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@heroui/button";
import { useOnboarding } from "@/contexts/OnboardingContext";

interface Step2InterestsProps {
  onNext: () => void;
  onSkip: () => void;
}

const interests = [
  "Sports",
  "Nightlife",
  "Fitness",
  "Music",
  "Art",
  "Food",
  "Travel",
  "Gaming",
  "Reading",
  "Movies",
  "Technology",
  "Photography",
  "Dancing",
  "Cooking",
  "Outdoor Activities",
];

export default function Step2Interests({
  onNext,
  onSkip,
}: Step2InterestsProps) {
  const { data, updateData } = useOnboarding();
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    data.interests || [],
  );

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  const handleNext = () => {
    updateData({ interests: selectedInterests });
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-8"
    >
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-light text-white mb-2">
          What are you into?
        </h1>
        <p className="text-white/50 text-lg">
          Select all that interest you
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {interests.map((interest, index) => {
            const isSelected = selectedInterests.includes(interest);
            return (
              <motion.div
                key={interest}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <button
                  onClick={() => toggleInterest(interest)}
                  className={`w-full p-4 rounded-xl border transition-all duration-200 ${
                    isSelected
                      ? "bg-[#0084ff] border-[#0084ff] text-white shadow-lg shadow-[#0084ff]/20"
                      : "bg-[#0a0a0a] border-white/10 text-white/70 hover:border-[#0084ff]/30 hover:text-white hover:bg-[#111111]"
                  }`}
                >
                  <span className="font-medium">{interest}</span>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4 justify-center pt-4">
          <Button
            onClick={onSkip}
            variant="light"
            className="text-white/50 hover:text-white/70"
            radius="full"
          >
            Skip
          </Button>
          <Button
            onClick={handleNext}
            className="bg-[#0084ff] text-white font-medium hover:bg-[#00a0ff]"
            radius="full"
            size="lg"
          >
            Continue
          </Button>
      </div>
    </motion.div>
  );
}

