"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { useEffect, useState } from "react";
import Image from "next/image";

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
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Multiple Gradient Orbs with different colors */}
        <motion.div
          className="absolute w-[800px] h-[800px] bg-gradient-to-r from-[#0084ff]/10 via-[#00a0ff]/5 to-[#0084ff]/10 rounded-full blur-3xl"
          animate={{
            x: mousePosition.x * 0.15 - 400,
            y: mousePosition.y * 0.15 - 400,
          }}
          transition={{ type: "spring", stiffness: 30, damping: 20 }}
        />
        <motion.div
          className="absolute w-[600px] h-[600px] bg-gradient-to-r from-[#7c3aed]/8 via-[#a855f7]/5 to-[#7c3aed]/8 rounded-full blur-3xl"
          animate={{
            x: mousePosition.x * -0.12 + 300,
            y: mousePosition.y * -0.12 + 300,
          }}
          transition={{ type: "spring", stiffness: 30, damping: 20 }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] bg-gradient-to-r from-[#06b6d4]/6 via-[#0891b2]/4 to-[#06b6d4]/6 rounded-full blur-3xl"
          animate={{
            x: mousePosition.x * 0.08 - 250,
            y: mousePosition.y * 0.18 - 250,
          }}
          transition={{ type: "spring", stiffness: 30, damping: 20 }}
        />

        {/* Animated Grid Pattern */}
        <motion.div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 132, 255, 0.15) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0, 132, 255, 0.15) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
          animate={{
            backgroundPosition: ['0% 0%', '80px 80px'],
                }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Floating Geometric Shapes */}
        {isClient && Array.from({ length: 8 }).map((_, i) => {
          const size = Math.random() * 100 + 50;
          const startX = Math.random() * 100;
          const startY = Math.random() * 100;
          const rotation = Math.random() * 360;
                  
                  return (
                    <motion.div
              key={`shape-${i}`}
              className="absolute border border-[#0084ff]/10"
                      style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${startX}%`,
                top: `${startY}%`,
                rotate: rotation,
                      }}
              animate={{
                rotate: [rotation, rotation + 360],
                opacity: [0.05, 0.15, 0.05],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: Math.random() * 10 + 15,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeInOut",
                      }}
                    />
                  );
                })}

        {/* Enhanced Floating Particles */}
        {isClient &&
          Array.from({ length: 40 }).map((_, i) => {
            const size = Math.random() * 4 + 1;
            const startX = Math.random() * 100;
            const startY = Math.random() * 100;
            const delay = Math.random() * 5;
                  
                  return (
                    <motion.div
                key={`particle-${i}`}
                className="absolute rounded-full"
                      style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${startX}%`,
                  top: `${startY}%`,
                  background: `radial-gradient(circle, rgba(0, 132, 255, ${0.3 + Math.random() * 0.4}) 0%, transparent 70%)`,
                      }}
                      animate={{
                  y: [
                    startY * window.innerHeight * 0.01,
                    (startY - 50) * window.innerHeight * 0.01,
                    startY * window.innerHeight * 0.01,
                  ],
                  x: [
                    startX * window.innerWidth * 0.01,
                    (startX + (Math.random() - 0.5) * 30) * window.innerWidth * 0.01,
                    startX * window.innerWidth * 0.01,
                  ],
                  opacity: [0, 0.6, 0],
                  scale: [0.5, 1.5, 0.5],
                      }}
                      transition={{
                  duration: Math.random() * 8 + 6,
                        repeat: Infinity,
                  delay: delay,
                        ease: "easeInOut",
                      }}
                    />
                  );
                })}

        {/* Animated Light Rays */}
        {isClient && Array.from({ length: 6 }).map((_, i) => {
          const angle = (i * 360) / 6;
          const delay = i * 0.3;
          
          return (
              <motion.div
              key={`ray-${i}`}
              className="absolute top-1/2 left-1/2 w-px h-[200%] origin-top"
              style={{
                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                background: `linear-gradient(to bottom, transparent, rgba(0, 132, 255, 0.1), transparent)`,
              }}
                animate={{
                opacity: [0, 0.3, 0],
                scaleY: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                delay: delay,
                  ease: "easeInOut",
                }}
              />
          );
        })}

        {/* Pulsing Rings */}
        {isClient && Array.from({ length: 3 }).map((_, i) => {
          const size = 300 + (i * 200);
          const delay = i * 1.5;
            
            return (
              <motion.div
              key={`ring-${i}`}
              className="absolute top-1/2 left-1/2 border border-[#0084ff]/20 rounded-full"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                transform: 'translate(-50%, -50%)',
                }}
                animate={{
                scale: [1, 1.5, 1],
                opacity: [0.1, 0.3, 0.1],
                }}
                transition={{
                duration: 6,
                  repeat: Infinity,
                delay: delay,
                  ease: "easeInOut",
                }}
              />
            );
          })}

        {/* Radial Gradient Overlay */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/40 to-black" />
        
        {/* Animated Color Shifts */}
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, rgba(0, 132, 255, 0.1), transparent 50%)',
              'radial-gradient(circle at 80% 50%, rgba(124, 58, 237, 0.1), transparent 50%)',
              'radial-gradient(circle at 50% 20%, rgba(6, 182, 212, 0.1), transparent 50%)',
              'radial-gradient(circle at 20% 50%, rgba(0, 132, 255, 0.1), transparent 50%)',
            ],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>


      {/* Main Content - Simple & Clean */}
      <div className="max-w-4xl mx-auto px-6 md:px-12 py-20 relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="text-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              delay: 0.2, 
              duration: 0.8,
              type: "spring",
              stiffness: 100,
              damping: 15
            }}
            className="mb-8"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Image
                src="/solace.png"
                alt="Solace Logo"
                width={150}
                height={150}
                className="mx-auto object-contain"
                priority
              />
            </motion.div>
          </motion.div>

          {/* Name */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-6xl lg:text-7xl font-light text-white leading-[1.05] tracking-tight mb-6"
          >
            <span className="bg-gradient-to-r from-white via-[#e0e7ff] to-white bg-clip-text text-transparent">
            Social Oracle
            </span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg md:text-xl text-white/60 font-light leading-relaxed mb-12 max-w-3xl mx-auto"
          >
            Social Oracle is the agentic layer that transforms how people socialize by driving social discovery through the city's hidden gems.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleContinue}
                className="bg-gradient-to-r from-[#0084ff] to-[#00a0ff] text-white font-medium px-10 py-5 text-sm uppercase tracking-wider"
                size="lg"
                radius="lg"
                >
                  Continue
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </div>
  );
}

