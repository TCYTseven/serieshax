"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Modal, ModalContent, ModalHeader, ModalBody, useDisclosure } from "@heroui/modal";
import { OnboardingData } from "@/contexts/OnboardingContext";

interface EventResultsProps {
  searchQuery: string;
  filters: {
    people: string;
    location: string;
    budget: string;
    trendingTopics: boolean;
    secretGems: boolean;
  };
  onboardingData: OnboardingData;
}

// Mock data - in real app, this would come from API
const generateEventSuggestions = (
  onboardingData: OnboardingData,
  filters: EventResultsProps["filters"],
) => {
  const suggestions = [];
  const sportsTeams = onboardingData.sportsTeams || {};

  // If user is a Nets fan, suggest Nets-related venues
  if (sportsTeams.Basketball === "Nets" || sportsTeams.Basketball?.includes("Nets")) {
    suggestions.push({
      id: 1,
      name: "Barclays Center Sports Bar",
      type: "Sports Bar",
      description: "Watch Nets games with fellow fans. Multiple screens showing live games.",
      image: "/bar.jpg",
      polymarketNote: filters.trendingTopics
        ? "Polymarket says lots of activity as the Brooklyn Nets and Celtics face off, with the Celtics being favored 89%"
        : null,
      redditNote: filters.secretGems
        ? "Reddit user said this is a HIDDEN GEM"
        : null,
      seriesReview: "Maintains a 4.6 star review from other Series users",
      isPartnered: true,
      price: "$$",
      distance: "0.5 miles",
      reviews: [
        {
          id: 1,
          user: "Alex M.",
          rating: 5,
          text: "Amazing atmosphere during Nets games! The staff is super friendly and the drinks are great.",
          date: "2 days ago",
        },
        {
          id: 2,
          user: "Sarah K.",
          rating: 5,
          text: "Best sports bar in Brooklyn. Always packed with Nets fans. Highly recommend!",
          date: "1 week ago",
        },
        {
          id: 3,
          user: "Mike T.",
          rating: 4,
          text: "Great spot to watch games. Food could be better but the vibe is unmatched.",
          date: "2 weeks ago",
        },
      ],
    });
  }

  // Add more suggestions based on interests
  if (onboardingData.interests?.includes("Food")) {
    suggestions.push({
      id: 2,
      name: "The Local Eatery",
      type: "Restaurant",
      description: "Great food spot perfect for groups. Known for their amazing atmosphere.",
      image: "/bar.jpg",
      polymarketNote: null,
      redditNote: filters.secretGems
        ? "Reddit user said this is a HIDDEN GEM"
        : null,
      seriesReview: "Maintains a 4.8 star review from other Series users",
      isPartnered: false,
      price: filters.budget || "$$",
      distance: "1.2 miles",
      reviews: [
        {
          id: 1,
          user: "Emma L.",
          rating: 5,
          text: "Incredible food and service! The atmosphere is perfect for date nights or group dinners.",
          date: "3 days ago",
        },
        {
          id: 2,
          user: "David R.",
          rating: 5,
          text: "Consistently amazing. Best restaurant in the area. The staff remembers regulars!",
          date: "1 week ago",
        },
      ],
    });
  }

  if (onboardingData.interests?.includes("Nightlife")) {
    suggestions.push({
      id: 3,
      name: "Midnight Lounge",
      type: "Bar & Lounge",
      description: "Perfect spot for drinks and meeting new people. Great vibe tonight.",
      image: "/bar.jpg",
      polymarketNote: null,
      redditNote: filters.secretGems
        ? "Reddit user said this is a HIDDEN GEM"
        : null,
      seriesReview: "Maintains a 4.7 star review from other Series users",
      isPartnered: true,
      price: "$$",
      distance: "0.8 miles",
      reviews: [
        {
          id: 1,
          user: "Jessica P.",
          rating: 5,
          text: "Love this place! Met so many cool people here. The music is always on point.",
          date: "1 day ago",
        },
        {
          id: 2,
          user: "Chris B.",
          rating: 4,
          text: "Great spot for a night out. Gets crowded on weekends but that's part of the fun!",
          date: "5 days ago",
        },
      ],
    });
  }

  // Always add default suggestions to ensure we have 3-4 results
  suggestions.push(
    {
      id: 4,
      name: "The Social Spot",
      type: "Venue",
      description: "A great place to hang out based on your preferences.",
      image: "/bar.jpg",
      polymarketNote: null,
      redditNote: filters.secretGems
        ? "Reddit user said this is a HIDDEN GEM"
        : null,
      seriesReview: "Maintains a 4.5 star review from other Series users",
      isPartnered: false,
      price: filters.budget || "$$",
      distance: "1.0 miles",
      reviews: [
        {
          id: 1,
          user: "Taylor S.",
          rating: 4,
          text: "Nice place with good vibes. Would come back!",
          date: "1 week ago",
        },
      ],
    },
    {
      id: 5,
      name: "Downtown Bar & Grill",
      type: "Bar",
      description: "Popular spot with great drinks and friendly atmosphere.",
      image: "/bar.jpg",
      polymarketNote: null,
      redditNote: null,
      seriesReview: "Maintains a 4.4 star review from other Series users",
      isPartnered: false,
      price: "$$",
      distance: "1.5 miles",
      reviews: [
        {
          id: 1,
          user: "Jordan M.",
          rating: 4,
          text: "Solid spot, good drinks and decent food.",
          date: "3 days ago",
        },
      ],
    },
  );

  return suggestions.slice(0, 4); // Limit to 4 results
};

// Event Card Component
const EventCard = ({ suggestion, onViewReviews }: { suggestion: any; onViewReviews: (event: any) => void }) => {
  return (
    <div className="bg-black border border-white/10 p-8 md:p-10 h-full flex flex-col">
      {/* Image */}
      <div className="relative h-48 md:h-56 w-full mb-6">
        <Image
          src={suggestion.image}
          alt={suggestion.name}
          fill
          className="object-cover"
        />
        <div className="absolute top-4 right-4 bg-black/80 px-3 py-1.5">
          <span className="text-white text-sm font-light">
            {suggestion.price}
          </span>
        </div>
        {/* Series Partner Badge */}
        {suggestion.isPartnered && (
          <div className="absolute top-4 left-4 bg-[#0084ff] px-3 py-1.5 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className="text-white text-xs font-light uppercase tracking-wider">
              Partnered with Series
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-4 flex-1 flex flex-col">
        <div>
          <h3 className="text-xl md:text-2xl font-light text-white mb-1 tracking-tight">
            {suggestion.name}
          </h3>
          <p className="text-white/40 text-xs font-light uppercase tracking-wider">
            {suggestion.type}
          </p>
        </div>

        {/* Description */}
        <div>
          <p className="text-white/60 text-sm font-light leading-relaxed">
            {suggestion.description}
          </p>
        </div>

        {/* Notes Section */}
        {(suggestion.redditNote || suggestion.polymarketNote || suggestion.seriesReview || suggestion.isPartnered) && (
          <div className="space-y-2 pt-3 border-t border-white/10">
            <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2">
              Notes
            </p>
            <ul className="space-y-1.5">
              {suggestion.isPartnered && (
                <li className="text-white/50 text-xs font-light">
                  • 30% discount to all Series members
                </li>
              )}
              {suggestion.redditNote && (
                <li className="text-white/50 text-xs font-light">
                  • {suggestion.redditNote}
                </li>
              )}
              {suggestion.polymarketNote && (
                <li className="text-white/50 text-xs font-light">
                  • {suggestion.polymarketNote}
                </li>
              )}
              {suggestion.seriesReview && (
                <li className="text-white/50 text-xs font-light">
                  • {suggestion.seriesReview}
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Footer Actions */}
        <div className="space-y-3 pt-3 border-t border-white/10 mt-auto">
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-xs font-light">
              {suggestion.distance} away
            </span>
            <button
              onClick={() => onViewReviews(suggestion)}
              className="px-4 py-1.5 bg-[#0084ff] text-white hover:bg-[#00a0ff] transition-colors text-xs font-light uppercase tracking-wider"
              style={{ borderRadius: 0 }}
            >
              View Reviews
            </button>
          </div>
          <button
            onClick={() => {
              console.log("Activating Event Agent for:", suggestion.name);
            }}
            className="w-full px-4 py-2 border border-[#0084ff] text-[#0084ff] hover:bg-[#0084ff]/10 transition-all text-xs font-light uppercase tracking-wider"
            style={{ borderRadius: 0 }}
          >
            Activate Event Agent
          </button>
        </div>
      </div>
    </div>
  );
};

export default function EventResults({
  searchQuery,
  filters,
  onboardingData,
}: EventResultsProps) {
  const suggestions = generateEventSuggestions(onboardingData, filters);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleViewReviews = (event: any) => {
    setSelectedEvent(event);
    onOpen();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDirection("right");
    setStartIndex((prev) => {
      // If we're at the end, wrap around
      if (prev + 2 >= suggestions.length) {
        return 0;
      }
      return prev + 1;
    });
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDirection("left");
    setStartIndex((prev) => {
      // If we're at the start, wrap around
      if (prev === 0) {
        return Math.max(0, suggestions.length - 2);
      }
      return prev - 1;
    });
  };

  // Get the two events to display
  const getVisibleEvents = () => {
    const events = [];
    for (let i = 0; i < 2; i++) {
      const index = (startIndex + i) % suggestions.length;
      events.push({ 
        ...suggestions[index], 
        position: i
      });
    }
    return events;
  };

  const visibleEvents = getVisibleEvents();

  return (
    <div className="min-h-screen bg-black px-6 py-12">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="w-12 h-px bg-[#0084ff] mb-4" />
          <h1 className="text-5xl md:text-6xl font-light text-white leading-[1.05] tracking-tight">
            Event Created
          </h1>
          <p className="text-white/40 text-lg font-light">
            Here are some perfect spots for your night out
          </p>
        </motion.div>

        {/* Event Cards with Navigation */}
        <div className="relative">
          <div className="max-w-7xl mx-auto">
            <div className="relative h-[650px] md:h-[700px] overflow-hidden">
              <div className="relative h-full grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5">
                <AnimatePresence mode="sync" initial={false}>
                  {visibleEvents.map((event, idx) => {
                    const isLeft = idx === 0;
                    
                    // Determine animation based on position and direction
                    let initialX = 0;
                    let exitX = 0;
                    
                    if (direction === "right") {
                      // Moving forward: left card exits left, right card slides to left, new card enters from right
                      if (isLeft) {
                        // Left position: card that was on the right, now sliding to left position
                        initialX = 100; // Start from right
                        exitX = -100; // Exit to left
                      } else {
                        // Right position: new card entering from right
                        initialX = 100; // Enter from right
                        exitX = -100; // Exit to left
                      }
                    } else {
                      // Moving backward: right card exits right, left card slides to right, new card enters from left
                      if (isLeft) {
                        // Left position: new card entering from left
                        initialX = -100; // Enter from left
                        exitX = 100; // Exit to right
                      } else {
                        // Right position: card that was on the left, now sliding to right position
                        initialX = -100; // Start from left
                        exitX = 100; // Exit to right
                      }
                    }
                    
                    // Use position + startIndex as key so both positions animate when startIndex changes
                    return (
                      <motion.div
                        key={`${isLeft ? 'left' : 'right'}-${startIndex}`}
                        initial={{ x: initialX }}
                        animate={{ x: 0 }}
                        exit={{ x: exitX }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className={`h-full ${isLeft ? 'md:pr-[0.5px]' : 'md:pl-[0.5px]'}`}
                      >
                        <EventCard suggestion={event} onViewReviews={handleViewReviews} />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* Navigation Arrows */}
            {suggestions.length > 2 && (
              <>
                <button
                  onClick={handlePrevious}
                  type="button"
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 w-10 h-10 border border-white/10 bg-black/80 hover:bg-black hover:border-white/20 transition-all flex items-center justify-center text-white/60 hover:text-white z-50 pointer-events-auto"
                  style={{ borderRadius: 0 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  onClick={handleNext}
                  type="button"
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 w-10 h-10 border border-white/10 bg-black/80 hover:bg-black hover:border-white/20 transition-all flex items-center justify-center text-white/60 hover:text-white z-50 pointer-events-auto"
                  style={{ borderRadius: 0 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reviews Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        placement="center"
        size="2xl"
        classNames={{
          base: "bg-black border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-white">
                <div className="w-12 h-px bg-[#0084ff] mb-2" />
                <h3 className="text-2xl font-light tracking-tight">{selectedEvent?.name}</h3>
                <p className="text-white/40 text-sm font-light">
                  Reviews from other Series Social Oracle users
                </p>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  {selectedEvent?.reviews?.map((review: any) => (
                    <div
                      key={review.id}
                      className="bg-[#111111] border border-white/8 p-4"
                      style={{ borderRadius: 0 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-light">
                            {review.user}
                          </span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <svg
                                key={i}
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill={i < review.rating ? "#0084ff" : "none"}
                                stroke={i < review.rating ? "#0084ff" : "#666"}
                                strokeWidth="2"
                              >
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <span className="text-white/30 text-xs font-light">
                          {review.date}
                        </span>
                      </div>
                      <p className="text-white/60 text-sm font-light">{review.text}</p>
                    </div>
                  ))}
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
