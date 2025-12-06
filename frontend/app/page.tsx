"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleContinue = () => {
    router.push("/home");
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <motion.div
          className="absolute w-[600px] h-[600px] bg-[#0084ff]/5 rounded-full blur-3xl"
          animate={{
            x: mousePosition.x * 0.1 - 300,
            y: mousePosition.y * 0.1 - 300,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 20 }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] bg-[#0084ff]/3 rounded-full blur-3xl"
          animate={{
            x: mousePosition.x * -0.15 + 200,
            y: mousePosition.y * -0.15 + 200,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 20 }}
        />

        {/* Subtle Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 132, 255, 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0, 132, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* 3D Globe - Positioned as background accent */}
        {isClient && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[20%] w-[800px] h-[800px] opacity-30">
            <motion.div
              className="relative w-full h-full"
              style={{ perspective: "1000px" }}
            >
              {/* Globe Sphere with 3D effect */}
              <motion.div
                className="absolute inset-0"
                style={{
                  transformStyle: "preserve-3d",
                }}
                animate={{ rotateY: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              >
                {/* Latitude Lines */}
                {[0, 30, 60, 90, 120, 150, 180].map((lat, i) => {
                  const radius = 350;
                  const y = Math.sin((lat * Math.PI) / 180) * radius;
                  const scale = Math.cos((lat * Math.PI) / 180);
                  
                  return (
                    <motion.div
                      key={`lat-${i}`}
                      className="absolute border border-[#0084ff]/20 rounded-full"
                      style={{
                        width: radius * 2 * scale,
                        height: radius * 2 * scale,
                        top: `calc(50% + ${y}px)`,
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  );
                })}

                {/* Longitude Lines */}
                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i * 360) / 12;
                  return (
                    <motion.div
                      key={`long-${i}`}
                      className="absolute top-1/2 left-1/2 w-px h-full origin-top"
                      style={{
                        transform: `translate(-50%, -50%) rotateY(${angle}deg) rotateX(90deg)`,
                        background: `linear-gradient(to bottom, transparent, rgba(0, 132, 255, 0.2), transparent)`,
                      }}
                    />
                  );
                })}

                {/* Connection Points */}
                {Array.from({ length: 24 }).map((_, i) => {
                  const angle = (i * 360) / 24;
                  const lat = (Math.random() - 0.5) * 120;
                  const radius = 350;
                  const x = Math.cos((angle * Math.PI) / 180) * radius * Math.cos((lat * Math.PI) / 180);
                  const y = Math.sin((lat * Math.PI) / 180) * radius;
                  const z = Math.sin((angle * Math.PI) / 180) * radius * Math.cos((lat * Math.PI) / 180);
                  
                  return (
                    <motion.div
                      key={`point-${i}`}
                      className="absolute w-2 h-2 bg-[#0084ff]/40 rounded-full"
                      style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`,
                        transform: `translate(-50%, -50%) translateZ(${z}px)`,
                      }}
                      animate={{
                        opacity: [0.3, 0.8, 0.3],
                        scale: [0.8, 1.2, 0.8],
                      }}
                      transition={{
                        duration: 2 + Math.random(),
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: "easeInOut",
                      }}
                    />
                  );
                })}
              </motion.div>

              {/* Outer Glow Ring */}
              <motion.div
                className="absolute inset-0 border-2 border-[#0084ff]/10 rounded-full"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.1, 0.2, 0.1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          </div>
        )}

        {/* Floating Particles */}
        {isClient &&
          Array.from({ length: 20 }).map((_, i) => {
            const size = Math.random() * 3 + 1;
            const startX = Math.random() * 100;
            const startY = Math.random() * 100;
            
            return (
              <motion.div
                key={i}
                className="absolute rounded-full bg-[#0084ff]/20"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${startX}%`,
                  top: `${startY}%`,
                }}
                animate={{
                  y: [
                    startY * window.innerHeight * 0.01,
                    (startY - 30) * window.innerHeight * 0.01,
                    startY * window.innerHeight * 0.01,
                  ],
                  x: [
                    startX * window.innerWidth * 0.01,
                    (startX + Math.random() * 20 - 10) * window.innerWidth * 0.01,
                    startX * window.innerWidth * 0.01,
                  ],
                  opacity: [0.2, 0.6, 0.2],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: Math.random() * 5 + 4,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: "easeInOut",
                }}
              />
            );
          })}
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 md:px-12 py-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl font-light text-white leading-[1.05] tracking-tight mb-8"
          >
            Social Oracle
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-xl md:text-2xl text-white/50 font-light leading-relaxed mb-12 max-w-2xl mx-auto"
          >
            Your AI-powered companion for discovering perfect social experiences
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleContinue}
                className="bg-[#0084ff] text-white hover:bg-[#00a0ff] font-light px-12 py-6 text-sm uppercase tracking-wider relative overflow-hidden group"
                size="lg"
                radius="none"
              >
                <motion.span
                  className="relative z-10"
                  initial={{ opacity: 1 }}
                  whileHover={{ opacity: 1 }}
                >
                  Continue
                </motion.span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-[#0084ff] via-[#00a0ff] to-[#0084ff] opacity-0 group-hover:opacity-100"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
              </Button>
            </motion.div>
          </motion.div>

          {/* Subtle Accent Line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="w-24 h-px bg-[#0084ff] mx-auto mt-16"
          />
        </motion.div>
      </div>
    </div>
  );
}
