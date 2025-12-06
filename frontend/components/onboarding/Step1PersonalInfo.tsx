"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { useOnboarding } from "@/contexts/OnboardingContext";

interface Step1PersonalInfoProps {
  onNext: () => void;
  onSkip: () => void;
}

export default function Step1PersonalInfo({
  onNext,
  onSkip,
}: Step1PersonalInfoProps) {
  const { data, updateData } = useOnboarding();
  const [name, setName] = useState(data.name);
  const [age, setAge] = useState(data.age);
  const [location, setLocation] = useState(data.location);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [manualLocation, setManualLocation] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    // Auto-detect location on mount
    detectLocation();
  }, []);

  const detectLocation = async () => {
    setIsDetectingLocation(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`,
              );
              const data = await response.json();
              if (data.city && data.countryName) {
                setLocation(`${data.city}, ${data.countryName}`);
              }
            } catch (error) {
              console.error("Error fetching location:", error);
            } finally {
              setIsDetectingLocation(false);
            }
          },
          () => {
            setIsDetectingLocation(false);
          },
        );
      }
    } catch (error) {
      setIsDetectingLocation(false);
    }
  };

  const handleSaveManualLocation = () => {
    if (manualLocation.trim()) {
      setLocation(manualLocation.trim());
      setManualLocation("");
      onClose();
    }
  };

  const handleNext = () => {
    updateData({ name, age, location: location || "" });
    onNext();
  };

  const canProceed = name.trim().length > 0 && age.trim().length > 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full space-y-8"
      >
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-light text-white mb-2">
            Let's get started
          </h1>
          <p className="text-white/50 text-lg">
            Tell us a bit about yourself
          </p>
        </div>

        <div className="space-y-5 max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="space-y-2">
              <label className="text-sm text-white/60 font-medium block">
                What's your name?
              </label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-4 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#0084ff]/50 focus:ring-1 focus:ring-[#0084ff]/20 transition-all duration-200"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0084ff]/0 via-[#0084ff]/0 to-[#0084ff]/0 group-focus-within:from-[#0084ff]/5 group-focus-within:via-[#0084ff]/10 group-focus-within:to-[#0084ff]/5 pointer-events-none transition-all duration-300" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="space-y-2">
              <label className="text-sm text-white/60 font-medium block">
                How old are you?
              </label>
              <div className="relative group">
                <input
                  type="number"
                  placeholder="Enter your age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-4 py-4 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#0084ff]/50 focus:ring-1 focus:ring-[#0084ff]/20 transition-all duration-200"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0084ff]/0 via-[#0084ff]/0 to-[#0084ff]/0 group-focus-within:from-[#0084ff]/5 group-focus-within:via-[#0084ff]/10 group-focus-within:to-[#0084ff]/5 pointer-events-none transition-all duration-300" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            {isDetectingLocation ? (
              <div className="text-center py-4">
                <p className="text-white/50">Detecting your location...</p>
              </div>
            ) : location ? (
              <div className="space-y-2">
                <div className="p-4 bg-[#0a0a0a] rounded-xl border border-white/10 backdrop-blur-sm">
                  <p className="text-xs text-white/50 mb-1.5 uppercase tracking-wider">Detected location:</p>
                  <p className="text-white font-medium text-lg">{location}</p>
                </div>
                <div className="flex justify-end pr-1">
                  <button
                    onClick={onOpen}
                    className="text-xs text-[#0084ff] hover:text-[#00a0ff] transition-colors underline-offset-2 hover:underline font-normal"
                  >
                    Override
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-4 bg-[#0a0a0a] rounded-xl border border-white/10 backdrop-blur-sm">
                  <p className="text-xs text-white/50 mb-2 uppercase tracking-wider">Location not detected</p>
                  <Button
                    onClick={detectLocation}
                    variant="light"
                    className="text-[#0084ff] hover:text-[#00a0ff]"
                    size="sm"
                  >
                    Detect my location
                  </Button>
                </div>
                <div className="flex justify-end pr-1">
                  <button
                    onClick={onOpen}
                    className="text-xs text-[#0084ff] hover:text-[#00a0ff] transition-colors underline-offset-2 hover:underline font-normal"
                  >
                    Enter manually
                  </button>
                </div>
              </div>
            )}
          </motion.div>
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
            isDisabled={!canProceed}
            className="bg-[#0084ff] text-white font-medium hover:bg-[#00a0ff] disabled:opacity-50 disabled:cursor-not-allowed"
            radius="full"
            size="lg"
          >
            Continue
          </Button>
        </div>
      </motion.div>

      {/* Manual Location Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        placement="center"
        classNames={{
          base: "bg-[#0a0a0a] border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-white">
                Enter Location Manually
              </ModalHeader>
              <ModalBody>
                <div className="space-y-2">
                  <label className="text-sm text-white/60 font-medium block">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="City, Country"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    className="w-full px-4 py-4 bg-[#111111] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#0084ff]/50 focus:ring-1 focus:ring-[#0084ff]/20 transition-all duration-200"
                    autoFocus
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={onClose}
                  className="text-white/50 hover:text-white/70"
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleSaveManualLocation}
                  className="bg-[#0084ff] text-white hover:bg-[#00a0ff]"
                  isDisabled={!manualLocation.trim()}
                >
                  Save
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
