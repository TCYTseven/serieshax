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
      className="w-full space-y-8"
    >
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-light text-white mb-2">
          What's your goal?
        </h1>
        <p className="text-white/50 text-lg">
          What do you want to achieve?
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal, index) => {
            const isSelected = selectedGoals.includes(goal);
            return (
              <motion.div
                key={goal}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <button
                  onClick={() => toggleGoal(goal)}
                  className={`w-full p-6 rounded-xl border transition-all duration-200 ${
                    isSelected
                      ? "bg-[#0084ff] border-[#0084ff] text-white shadow-lg shadow-[#0084ff]/20"
                      : "bg-[#0a0a0a] border-white/10 text-white/70 hover:border-[#0084ff]/30 hover:text-white hover:bg-[#111111]"
                  }`}
                >
                  <span className="font-medium text-lg">{goal}</span>
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

