"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { SearchIcon } from "@/components/icons";

// Icon components for the input field
const GridIcon = ({ className }: { className?: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className={className}
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);

const PersonIcon = ({ className }: { className?: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className={className}
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const GlobeIcon = ({ className }: { className?: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const CameraIcon = ({ className }: { className?: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className={className}
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const PaperclipIcon = ({ className }: { className?: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className={className}
  >
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const MicrophoneIcon = ({ className }: { className?: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className={className}
  >
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const WaveformIcon = ({ className }: { className?: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M3 12h2v8H3zm4-4h2v12H7zm4-4h2v16h-2zm4 4h2v8h-2zm4-4h2v12h-2z" />
  </svg>
);

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

  const handleActionClick = (id: string) => {
    setSelectedAction(selectedAction === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center space-y-16">
        {/* Main Question */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center space-y-3"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal text-[#0084ff] leading-[1.1] tracking-[-0.02em]">
            What's the move for tonight?
          </h1>
          <p className="text-white/50 text-base md:text-lg font-light">
            Tell us what you're looking for and we'll help you find it
          </p>
        </motion.div>

        {/* Input Field */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-2xl"
        >
          <div className="relative group">
            <input
              type="text"
              placeholder="Ask anything. Type @ for mentions."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full px-6 py-4 bg-[#0a0a0a] border border-white/8 rounded-xl text-white text-base placeholder:text-white/35 focus:outline-none focus:border-[#0084ff]/40 focus:bg-[#111111] transition-all duration-300 font-light"
            />
          </div>
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
                    ease: [0.22, 1, 0.36, 1]
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
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
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

        {/* Response Box */}
        {(inputValue || selectedAction) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="w-full max-w-2xl min-h-[180px] border border-white/8 rounded-xl p-8 bg-[#0a0a0a]/60 backdrop-blur-sm"
          >
            <div className="flex items-start h-full">
              <p className="text-[#0084ff] text-lg font-light leading-relaxed">
                {selectedAction
                  ? `Looking for ${actionButtons.find((b) => b.id === selectedAction)?.label.toLowerCase()} options...`
                  : inputValue || ""}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
