"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
        className="w-full space-y-12"
      >
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-light text-white mb-2 tracking-tight">
            Let's get started
          </h1>
          <p className="text-white/40 text-base font-light">
            Tell us a bit about yourself
          </p>
        </div>

        <div className="space-y-8 max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-4 font-medium">
              What's your name?
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-0 py-3 bg-transparent border-b border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#0084ff] transition-colors font-light text-base"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-4 font-medium">
              How old are you?
            </label>
            <input
              type="number"
              placeholder="Enter your age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full px-0 py-3 bg-transparent border-b border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#0084ff] transition-colors font-light text-base"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-4 font-medium">
              Location
            </label>
            {isDetectingLocation ? (
              <div className="py-3">
                <p className="text-white/40 text-sm font-light">Detecting your location...</p>
              </div>
            ) : location ? (
              <div className="py-3 border-b border-white/10">
                <p className="text-white font-light text-base">{location}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="py-3 border-b border-white/10">
                  <p className="text-white/40 text-sm font-light">Location not detected</p>
                </div>
                <button
                  onClick={onOpen}
                  className="text-xs text-[#0084ff] hover:text-[#00a0ff] transition-colors font-light uppercase tracking-wider"
                >
                  Enter manually
                </button>
              </div>
            )}
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-3 pt-6">
          <Button
            onClick={handleNext}
            isDisabled={!canProceed}
            className="bg-[#0084ff] text-white font-light hover:bg-[#00a0ff] min-w-[200px] uppercase tracking-wider text-sm disabled:opacity-30 disabled:cursor-not-allowed"
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

      {/* Manual Location Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        placement="center"
        classNames={{
          base: "bg-black border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-white">
                <div className="w-12 h-px bg-[#0084ff] mb-2" />
                <span className="text-xl font-light tracking-tight">Enter Location</span>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <label className="block text-xs text-white/40 uppercase tracking-wider font-medium">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="City, Country"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    className="w-full px-0 py-3 bg-transparent border-b border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#0084ff] transition-colors font-light text-base"
                    autoFocus
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={onClose}
                  className="text-white/40 hover:text-white/60 font-light text-xs uppercase tracking-wider"
                  radius="none"
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleSaveManualLocation}
                  className="bg-[#0084ff] text-white hover:bg-[#00a0ff] font-light text-xs uppercase tracking-wider"
                  isDisabled={!manualLocation.trim()}
                  radius="none"
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
