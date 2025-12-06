"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@heroui/button";
import { useOnboarding } from "@/contexts/OnboardingContext";

interface Step4SocialVibeProps {
  onNext: () => void;
  onSkip: () => void;
}

const vibeTags = [
  "Adventurous",
  "Chill",
  "Energetic",
  "Thoughtful",
  "Spontaneous",
  "Open-minded",
  "Selective",
  "Intellectual",
];

export default function Step4SocialVibe({ onNext, onSkip }: Step4SocialVibeProps) {
  const { data, updateData } = useOnboarding();
  const [socialbility, setSocialbility] = useState(data.socialbility || 5);
  const [selectedVibes, setSelectedVibes] = useState<string[]>(data.vibeTags || []);

  const toggleVibe = (vibe: string) => {
    setSelectedVibes((prev) =>
      prev.includes(vibe)
        ? prev.filter((v) => v !== vibe)
        : [...prev, vibe],
    );
  };

  const handleNext = () => {
    updateData({
      socialbility,
      vibeTags: selectedVibes,
    });
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
          Tell us about yourself
        </h1>
        <p className="text-white/40 text-base font-light">
          Help us understand your social preferences
        </p>
      </div>

      {/* Socialbility Slider */}
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-white text-lg font-light">
              How social are you?
            </label>
            <span className="text-[#0084ff] text-2xl font-light">
              {socialbility}/10
            </span>
          </div>
          
          <div className="relative">
            <input
              type="range"
              min="1"
              max="10"
              value={socialbility}
              onChange={(e) => setSocialbility(Number(e.target.value))}
              className="w-full h-1 appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #0084ff 0%, #0084ff ${((socialbility - 1) / 9) * 100}%, rgba(255,255,255,0.1) ${((socialbility - 1) / 9) * 100}%, rgba(255,255,255,0.1) 100%)`,
              }}
            />
          </div>

          <div className="flex justify-between text-xs text-white/30 font-light">
            <span>Not very social</span>
            <span>Very social</span>
          </div>
        </div>
      </div>

      {/* Vibe Tags */}
      <div className="space-y-6">
        <div>
          <h2 className="text-white text-xl font-light mb-4 tracking-tight">
            My friends would describe me as...
          </h2>
          <p className="text-white/40 text-sm font-light mb-6">
            Select all that apply
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
          {vibeTags.map((vibe) => {
            const isSelected = selectedVibes.includes(vibe);
            return (
              <motion.button
                key={vibe}
                type="button"
                onClick={() => toggleVibe(vibe)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`px-4 py-3 text-sm font-light uppercase tracking-wider transition-all relative whitespace-nowrap ${
                  isSelected
                    ? "bg-[#0084ff] text-white border border-[#0084ff]"
                    : "bg-black border border-white/10 text-white/60 hover:border-white/20 hover:text-white/80"
                }`}
                style={{ borderRadius: 0 }}
              >
                {vibe}
                {isSelected && (
                  <div className="absolute right-0 top-0 w-px h-full bg-white/20" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
        <button
          onClick={onSkip}
          className="text-xs text-white/30 hover:text-white/50 transition-colors font-light"
        >
          Skip
        </button>
        <Button
          onClick={handleNext}
          className="px-8 py-2 bg-[#0084ff] text-white hover:bg-[#00a0ff] transition-colors text-sm font-light uppercase tracking-wider"
          style={{ borderRadius: 0 }}
        >
          Continue
        </Button>
      </div>
    </motion.div>
  );
}

