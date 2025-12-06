"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@heroui/button";
import { useOnboarding } from "@/contexts/OnboardingContext";

interface Step3GoalsProps {
  onNext: () => void;
  onSkip: () => void;
}

const goals = [
  "Make new friends",
  "Reduce social anxiety",
  "Discover new spots",
  "Find activity partners",
  "Expand my network",
  "Have fun experiences",
  "Learn new skills",
  "Explore my city",
];

export default function Step3Goals({ onNext, onSkip }: Step3GoalsProps) {
  const { data, updateData } = useOnboarding();
  const [selectedGoals, setSelectedGoals] = useState<string[]>(
    data.goals || [],
  );

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal)
        ? prev.filter((g) => g !== goal)
        : [...prev, goal],
    );
  };

  const handleNext = () => {
    updateData({ goals: selectedGoals });
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-12"
    >
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-light text-white mb-2 tracking-tight">
          What's your goal?
        </h1>
        <p className="text-white/40 text-base font-light">
          What do you want to achieve?
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/5">
          {goals.map((goal, index) => {
            const isSelected = selectedGoals.includes(goal);
            return (
              <motion.div
                key={goal}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
              >
                <button
                  onClick={() => toggleGoal(goal)}
                  className={`w-full p-8 border transition-all duration-200 relative bg-black ${
                    isSelected
                      ? "border-[#0084ff] text-white"
                      : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <span className="font-light text-lg tracking-tight">{goal}</span>
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-px h-full bg-[#0084ff]" />
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 pt-6">
        <Button
          onClick={handleNext}
          className="bg-[#0084ff] text-white font-light hover:bg-[#00a0ff] min-w-[200px] uppercase tracking-wider text-sm"
          size="lg"
          radius="none"
        >
          Continue
        </Button>
        <button
          onClick={onSkip}
          className="text-white/30 hover:text-white/50 text-xs transition-colors font-light"
        >
          Skip for now
        </button>
      </div>
    </motion.div>
  );
}
