"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
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
  "Fitness",
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
      setSelectedCategory(interest);
      if (interest === "Sports") {
        setSelectedSport("Basketball");
      }
      setTeamInput("");
      onOpen();
    } else {
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
      if (!selectedInterests.includes("Sports")) {
        setSelectedInterests([...selectedInterests, "Sports"]);
      }
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
    
    if (newGenres.length > 0 && !selectedInterests.includes("Food")) {
      setSelectedInterests([...selectedInterests, "Food"]);
    }
    
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
    
    if (newGenres.length > 0 && !selectedInterests.includes("Music")) {
      setSelectedInterests([...selectedInterests, "Music"]);
    }
    
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
        className="w-full space-y-12"
      >
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-light text-white mb-2 tracking-tight">
            What are you into?
          </h1>
          <p className="text-white/40 text-base font-light">
            Select all that interest you
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5">
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <button
                    onClick={() => toggleInterest(interest)}
                    className={`w-full p-8 border transition-all duration-200 relative bg-black min-h-[120px] flex flex-col ${
                      displayText ? "justify-start" : "justify-center items-center"
                    } ${
                      isSelected
                        ? "border-[#0084ff] text-white"
                        : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                    }`}
                    style={{ borderRadius: 0 }}
                  >
                    <div className={`flex flex-col gap-2 flex-1 ${displayText ? "items-start" : "items-center"}`}>
                      <span className="font-light text-lg tracking-tight">{interest}</span>
                      {displayText && (
                        <span className="text-xs text-white/40 font-light">
                          {displayText}
                        </span>
                      )}
                    </div>
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
            isDisabled={selectedInterests.length === 0}
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

      {/* Category Selection Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        placement="center"
        size="2xl"
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
                {selectedCategory === "Sports" && <span className="text-xl font-light tracking-tight">Select your favorite teams</span>}
                {selectedCategory === "Food" && <span className="text-xl font-light tracking-tight">What cuisines do you like?</span>}
                {selectedCategory === "Music" && <span className="text-xl font-light tracking-tight">What music do you listen to?</span>}
              </ModalHeader>
              <ModalBody>
                {selectedCategory === "Sports" && (
                  <div className="space-y-8">
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider mb-4 font-medium">Sport</p>
                      <div className="flex gap-2 flex-wrap">
                        {sports.map((sport) => (
                          <button
                            key={sport}
                            onClick={() => {
                              setSelectedSport(sport);
                              setTeamInput("");
                            }}
                            className={`px-4 py-2 border text-sm font-light transition-all ${
                              selectedSport === sport
                                ? "bg-[#0084ff] border-[#0084ff] text-white"
                                : "bg-black border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                            }`}
                            style={{ borderRadius: 0 }}
                          >
                            {sport}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider mb-4 font-medium">
                        {selectedSport} Teams
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {sportTeams[selectedSport]?.map((team) => (
                          <button
                            key={team}
                            onClick={() => handleSportTeamSelect(team)}
                            className={`px-3 py-2 border text-xs font-light transition-all ${
                              data.sportsTeams?.[selectedSport] === team
                                ? "bg-[#0084ff] border-[#0084ff] text-white"
                                : "bg-black border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                            }`}
                            style={{ borderRadius: 0 }}
                          >
                            {team}
                          </button>
                        ))}
                      </div>
                      {sportTeams[selectedSport]?.includes("Other") && (
                        <div className="mt-4">
                          <input
                            type="text"
                            placeholder="Enter your team name"
                            value={teamInput}
                            onChange={(e) => setTeamInput(e.target.value)}
                            className="w-full px-0 py-3 bg-transparent border-b border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#0084ff] transition-colors font-light text-sm"
                          />
                          {teamInput && (
                            <Button
                              onClick={() => handleSportTeamSelect("Other")}
                              className="mt-3 bg-[#0084ff] text-white w-full font-light uppercase tracking-wider text-xs"
                              size="sm"
                              radius="none"
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
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-4 font-medium">Cuisines</p>
                    <div className="grid grid-cols-3 gap-2">
                      {foodGenres.map((genre) => {
                        const isSelected = data.foodGenres?.includes(genre);
                        return (
                          <button
                            key={genre}
                            onClick={() => handleFoodGenreToggle(genre)}
                            className={`px-3 py-2 border text-xs font-light transition-all ${
                              isSelected
                                ? "bg-[#0084ff] border-[#0084ff] text-white"
                                : "bg-black border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                            }`}
                            style={{ borderRadius: 0 }}
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
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-4 font-medium">Genres</p>
                    <div className="grid grid-cols-3 gap-2">
                      {musicGenres.map((genre) => {
                        const isSelected = data.musicGenres?.includes(genre);
                        return (
                          <button
                            key={genre}
                            onClick={() => handleMusicGenreToggle(genre)}
                            className={`px-3 py-2 border text-xs font-light transition-all ${
                              isSelected
                                ? "bg-[#0084ff] border-[#0084ff] text-white"
                                : "bg-black border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                            }`}
                            style={{ borderRadius: 0 }}
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
                  className="text-white/40 hover:text-white/60 font-light text-xs uppercase tracking-wider"
                  radius="none"
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
