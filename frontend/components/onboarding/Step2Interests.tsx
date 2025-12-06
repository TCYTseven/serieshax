"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { useOnboarding } from "@/contexts/OnboardingContext";

interface Step2InterestsProps {
  onNext: () => void;
  onSkip: () => void;
}

const interests = [
  "Sports",
  "Nightlife",
  "Music",
  "Food",
  "Travel",
];

const sports = ["Basketball", "Soccer", "Football", "Baseball", "Hockey"];

const sportTeams: Record<string, string[]> = {
  Basketball: [
    "Lakers", "Warriors", "Celtics", "Heat", "Nets", "Bulls", "Mavericks", "76ers", "Other"
  ],
  Soccer: [
    "Manchester United", "Barcelona", "Real Madrid", "Liverpool", "PSG", "Bayern Munich", "Chelsea", "Arsenal", "Other"
  ],
  Football: [
    "Chiefs", "49ers", "Cowboys", "Patriots", "Packers", "Steelers", "Ravens", "Bills", "Other"
  ],
  Baseball: [
    "Yankees", "Dodgers", "Red Sox", "Astros", "Braves", "Mets", "Cubs", "Giants", "Other"
  ],
  Hockey: [
    "Maple Leafs", "Bruins", "Rangers", "Penguins", "Blackhawks", "Canadiens", "Red Wings", "Avalanche", "Other"
  ],
};

const foodGenres = [
  "Italian", "Mexican", "Japanese", "Chinese", "Indian", "Thai", "French", "Mediterranean", "American", "BBQ", "Seafood", "Vegetarian"
];

const musicGenres = [
  "Rock", "Pop", "Hip-Hop", "R&B", "Country", "Electronic", "Jazz", "Classical", "Reggae", "Latin", "Indie", "Alternative"
];

export default function Step2Interests({
  onNext,
  onSkip,
}: Step2InterestsProps) {
  const { data, updateData } = useOnboarding();
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    data.interests || [],
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>("Basketball");
  const [teamInput, setTeamInput] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();

  const toggleInterest = (interest: string) => {
    if (interest === "Sports" || interest === "Food" || interest === "Music") {
      // Open modal for these categories
      setSelectedCategory(interest);
      if (interest === "Sports") {
        setSelectedSport("Basketball"); // Default to Basketball
      }
      setTeamInput("");
      onOpen();
    } else {
      // Regular toggle for other interests
      setSelectedInterests((prev) =>
        prev.includes(interest)
          ? prev.filter((i) => i !== interest)
          : [...prev, interest],
      );
    }
  };

  const handleSportTeamSelect = (team: string) => {
    const finalTeam = team === "Other" ? teamInput.trim() : team;
    if (finalTeam) {
      // Add Sports to interests if not already there
      if (!selectedInterests.includes("Sports")) {
        setSelectedInterests([...selectedInterests, "Sports"]);
      }
      // Save team preference for the selected sport
      updateData({
        sportsTeams: {
          ...data.sportsTeams,
          [selectedSport]: finalTeam,
        },
      });
      if (team !== "Other") {
        onClose();
        setSelectedCategory(null);
        setTeamInput("");
      }
    }
  };

  const handleFoodGenreToggle = (genre: string) => {
    const currentGenres = data.foodGenres || [];
    const newGenres = currentGenres.includes(genre)
      ? currentGenres.filter((g) => g !== genre)
      : [...currentGenres, genre];
    
    updateData({ foodGenres: newGenres });
    
    // Add Food to interests if selecting genres
    if (newGenres.length > 0 && !selectedInterests.includes("Food")) {
      setSelectedInterests([...selectedInterests, "Food"]);
    }
    
    // Remove Food if no genres selected
    if (newGenres.length === 0 && selectedInterests.includes("Food")) {
      setSelectedInterests(selectedInterests.filter((i) => i !== "Food"));
    }
  };

  const handleMusicGenreToggle = (genre: string) => {
    const currentGenres = data.musicGenres || [];
    const newGenres = currentGenres.includes(genre)
      ? currentGenres.filter((g) => g !== genre)
      : [...currentGenres, genre];
    
    updateData({ musicGenres: newGenres });
    
    // Add Music to interests if selecting genres
    if (newGenres.length > 0 && !selectedInterests.includes("Music")) {
      setSelectedInterests([...selectedInterests, "Music"]);
    }
    
    // Remove Music if no genres selected
    if (newGenres.length === 0 && selectedInterests.includes("Music")) {
      setSelectedInterests(selectedInterests.filter((i) => i !== "Music"));
    }
  };

  const handleNext = () => {
    updateData({ interests: selectedInterests });
    onNext();
  };

  const getSportsDisplayText = () => {
    const teams = Object.entries(data.sportsTeams || {});
    if (teams.length === 0) return "";
    return teams.map(([sport, team]) => `${sport}: ${team}`).join(", ");
  };

  return (
    <>
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
              let displayText = "";
              
              if (interest === "Sports") {
                displayText = getSportsDisplayText();
              } else if (interest === "Food" && data.foodGenres?.length > 0) {
                displayText = data.foodGenres.slice(0, 2).join(", ");
                if (data.foodGenres.length > 2) displayText += ` +${data.foodGenres.length - 2}`;
              } else if (interest === "Music" && data.musicGenres?.length > 0) {
                displayText = data.musicGenres.slice(0, 2).join(", ");
                if (data.musicGenres.length > 2) displayText += ` +${data.musicGenres.length - 2}`;
              }

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
                    className={`w-full p-4 rounded-xl border transition-all duration-200 relative ${
                      isSelected
                        ? "bg-[#0084ff] border-[#0084ff] text-white shadow-lg shadow-[#0084ff]/20"
                        : "bg-[#0a0a0a] border-white/10 text-white/70 hover:border-[#0084ff]/30 hover:text-white hover:bg-[#111111]"
                    }`}
                  >
                    <span className="font-medium">{interest}</span>
                    {displayText && (
                      <span className="block text-xs mt-1 opacity-80">
                        {displayText}
                      </span>
                    )}
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

      {/* Category Selection Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        placement="center"
        size="2xl"
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
                {selectedCategory === "Sports" && "Select your favorite teams"}
                {selectedCategory === "Food" && "What cuisines do you like?"}
                {selectedCategory === "Music" && "What music do you listen to?"}
              </ModalHeader>
              <ModalBody>
                {selectedCategory === "Sports" && (
                  <div className="space-y-6">
                    {/* Sport Selector */}
                    <div>
                      <p className="text-sm text-white/60 mb-3">Sport</p>
                      <div className="flex gap-2 flex-wrap">
                        {sports.map((sport) => (
                          <button
                            key={sport}
                            onClick={() => {
                              setSelectedSport(sport);
                              setTeamInput("");
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              selectedSport === sport
                                ? "bg-[#0084ff] text-white"
                                : "bg-[#111111] text-white/70 hover:bg-[#1a1a1a] border border-white/8"
                            }`}
                          >
                            {sport}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Team Selector */}
                    <div>
                      <p className="text-sm text-white/60 mb-3">
                        {selectedSport} Teams
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {sportTeams[selectedSport]?.map((team) => (
                          <button
                            key={team}
                            onClick={() => handleSportTeamSelect(team)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              data.sportsTeams[selectedSport] === team
                                ? "bg-[#0084ff] text-white"
                                : "bg-[#111111] text-white/70 hover:bg-[#1a1a1a] border border-white/8"
                            }`}
                          >
                            {team}
                          </button>
                        ))}
                      </div>
                      {sportTeams[selectedSport]?.includes("Other") && (
                        <div className="mt-3">
                          <Input
                            type="text"
                            placeholder="Enter your team name"
                            value={teamInput}
                            onChange={(e) => setTeamInput(e.target.value)}
                            classNames={{
                              base: "w-full",
                              input: "text-white",
                              inputWrapper:
                                "bg-[#111111] border-white/8 hover:border-[#0084ff] focus-within:border-[#0084ff]",
                            }}
                            variant="bordered"
                            size="sm"
                            radius="lg"
                          />
                          {teamInput && (
                            <Button
                              onClick={() => handleSportTeamSelect("Other")}
                              className="mt-2 bg-[#0084ff] text-white w-full"
                              size="sm"
                            >
                              Save Team
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedCategory === "Food" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {foodGenres.map((genre) => {
                        const isSelected = data.foodGenres?.includes(genre);
                        return (
                          <button
                            key={genre}
                            onClick={() => handleFoodGenreToggle(genre)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              isSelected
                                ? "bg-[#0084ff] text-white"
                                : "bg-[#111111] text-white/70 hover:bg-[#1a1a1a] border border-white/8"
                            }`}
                          >
                            {genre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedCategory === "Music" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {musicGenres.map((genre) => {
                        const isSelected = data.musicGenres?.includes(genre);
                        return (
                          <button
                            key={genre}
                            onClick={() => handleMusicGenreToggle(genre)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              isSelected
                                ? "bg-[#0084ff] text-white"
                                : "bg-[#111111] text-white/70 hover:bg-[#1a1a1a] border border-white/8"
                            }`}
                          >
                            {genre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={onClose}
                  className="text-white/50 hover:text-white/70"
                >
                  Done
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
