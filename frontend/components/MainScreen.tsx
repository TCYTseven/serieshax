"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Switch } from "@heroui/switch";
import EventLoading from "./EventLoading";

const actionButtons = [
  {
    id: "meet",
    label: "Meet",
    description: "Connect with new people",
    image: "/Sports Event.webp",
  },
  {
    id: "drink",
    label: "Drink",
    description: "Find great spots nearby",
    image: "/bar.jpg",
  },
  {
    id: "learn",
    label: "Learn",
    description: "Discover new skills",
    image: "/potteryclass.jpg",
  },
];

export default function MainScreen() {
  const [inputValue, setInputValue] = useState("");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [people, setPeople] = useState("1");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [trendingTopics, setTrendingTopics] = useState(false);
  const [secretGems, setSecretGems] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const handleActionClick = (id: string) => {
    setSelectedAction(selectedAction === id ? null : id);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilters]);

  const handleInputFocus = () => {
    setShowFilters(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      setIsLoading(true);
    }
  };

  if (isLoading) {
    return (
      <EventLoading
        searchQuery={inputValue}
        filters={{
          people,
          location,
          budget,
          trendingTopics,
          secretGems,
        }}
      />
    );
  }

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
      
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center space-y-16 relative z-10">
        {/* Main Question */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center space-y-3 relative z-50"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal text-[#0084ff] leading-[1.1] tracking-[-0.02em]">
            What's the move for tonight?
          </h1>
          <p className="text-white/50 text-base md:text-lg font-light">
            Tell us what you're looking for and we'll help you find it
          </p>
        </motion.div>

        {/* Backdrop Overlay */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowFilters(false)}
            />
          )}
        </AnimatePresence>

        {/* Input Field with Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-2xl relative z-50"
          ref={filterRef}
        >
          <div className="relative group">
            <input
              type="text"
              placeholder="What kind of event are you planning?"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={handleInputFocus}
              onKeyPress={handleKeyPress}
              className="w-full px-6 py-4 bg-[#0a0a0a] border border-white/8 rounded-xl text-white text-base placeholder:text-white/35 focus:outline-none focus:border-[#0084ff]/40 focus:bg-[#111111] transition-all duration-300 font-light relative z-50"
            />
          </div>

          {/* Filter Menu */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-white/8 rounded-xl p-4 shadow-2xl z-50"
              >
                <div className="flex items-center gap-6 flex-wrap">
                  {/* People Filter */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/50 font-medium whitespace-nowrap">
                      People
                    </span>
                    <div className="flex gap-1.5">
                      {["1", "2", "3", "4", "4+"].map((count) => (
                        <button
                          key={count}
                          onClick={() => setPeople(count)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                            people === count
                              ? "bg-[#0084ff] text-white"
                              : "bg-[#111111] text-white/70 hover:bg-[#1a1a1a] border border-white/8"
                          }`}
                        >
                          {count === "4+" ? "4+" : count}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-8 w-px bg-white/8" />

                  {/* Location Filter */}
                  <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                    <span className="text-xs text-white/50 font-medium whitespace-nowrap">
                      Location
                    </span>
                    <input
                      type="text"
                      placeholder="Anywhere"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-[#111111] border border-white/8 rounded-lg text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-[#0084ff]/40 transition-all"
                    />
                  </div>

                  {/* Divider */}
                  <div className="h-8 w-px bg-white/8" />

                  {/* Budget Filter */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/50 font-medium whitespace-nowrap">
                      Budget
                    </span>
                    <div className="flex gap-1.5">
                      {["$", "$$", "$$$", "$$$$"].map((price) => (
                        <button
                          key={price}
                          onClick={() => setBudget(price)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            budget === price
                              ? "bg-[#0084ff] text-white"
                              : "bg-[#111111] text-white/70 hover:bg-[#1a1a1a] border border-white/8"
                          }`}
                        >
                          {price}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-8 w-px bg-white/8" />

                  {/* Toggle Switches */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/polymarket-icon.png"
                        alt="Polymarket"
                        width={16}
                        height={16}
                        className="rounded"
                      />
                      <span className="text-xs text-white/80 font-medium whitespace-nowrap">
                        Trending
                      </span>
                      <Switch
                        isSelected={trendingTopics}
                        onValueChange={setTrendingTopics}
                        size="sm"
                        classNames={{
                          base: "group-data-[selected=true]:bg-[#0084ff]",
                          wrapper: "group-data-[selected=true]:bg-[#0084ff]",
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Image
                        src="/reddit-logo.png"
                        alt="Reddit"
                        width={16}
                        height={16}
                        className="rounded"
                      />
                      <span className="text-xs text-white/80 font-medium whitespace-nowrap">
                        Secret gems
                      </span>
                      <Switch
                        isSelected={secretGems}
                        onValueChange={setSecretGems}
                        size="sm"
                        classNames={{
                          base: "group-data-[selected=true]:bg-[#0084ff]",
                          wrapper: "group-data-[selected=true]:bg-[#0084ff]",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-3 text-xs text-white/30 text-center font-light">
            Press Enter to search or select an option below
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          <div className="flex flex-wrap gap-5 justify-center items-start">
            {actionButtons.map((button, index) => {
              const isSelected = selectedAction === button.id;
              return (
                <motion.button
                  key={button.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.3 + index * 0.08,
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleActionClick(button.id)}
                  className="relative w-52 h-52 rounded-2xl overflow-hidden border transition-all duration-300 group"
                  style={{
                    borderColor: isSelected
                      ? "rgba(0, 132, 255, 0.5)"
                      : "rgba(255, 255, 255, 0.08)",
                    borderWidth: isSelected ? "2px" : "1px",
                    boxShadow: isSelected
                      ? "0 0 0 1px rgba(0, 132, 255, 0.2), 0 8px 24px rgba(0, 132, 255, 0.15)"
                      : "0 4px 12px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  {/* Background Image */}
                  <div className="absolute inset-0">
                    <Image
                      src={button.image}
                      alt={button.label}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Gradient overlay - darker when selected */}
                  <div
                    className={`absolute inset-0 transition-all duration-300 ${
                      isSelected
                        ? "bg-gradient-to-b from-black/70 via-black/60 to-black/75"
                        : "bg-gradient-to-b from-black/50 via-black/40 to-black/60 group-hover:from-black/55 group-hover:via-black/45 group-hover:to-black/65"
                    }`}
                  />

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6">
                    <span className="text-white text-2xl font-medium mb-1.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                      {button.label}
                    </span>
                    <span className="text-white/70 text-sm font-light drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                      {button.description}
                    </span>
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                      className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#0084ff] flex items-center justify-center z-20 shadow-lg shadow-[#0084ff]/40"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
