"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
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
      polymarketInfo: filters.trendingTopics
        ? "Polymarket says lots of activity as the Brooklyn Nets and Celtics face off, with the Celtics being favored 89%"
        : null,
      redditInfo: filters.secretGems
        ? "From Reddit, a user said this is a HIDDEN GEM"
        : null,
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
      polymarketInfo: null,
      redditInfo: filters.secretGems
        ? "From Reddit, a user said this is a HIDDEN GEM"
        : null,
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
      polymarketInfo: null,
      redditInfo: filters.secretGems
        ? "From Reddit, a user said this is a HIDDEN GEM"
        : null,
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

  // Default suggestion if no matches
  if (suggestions.length === 0) {
    suggestions.push({
      id: 1,
      name: "The Social Spot",
      type: "Venue",
      description: "A great place to hang out based on your preferences.",
      image: "/bar.jpg",
      polymarketInfo: null,
      redditInfo: filters.secretGems
        ? "From Reddit, a user said this is a HIDDEN GEM"
        : null,
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
    });
  }

  return suggestions;
};

export default function EventResults({
  searchQuery,
  filters,
  onboardingData,
}: EventResultsProps) {
  const suggestions = generateEventSuggestions(onboardingData, filters);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleViewReviews = (event: any) => {
    setSelectedEvent(event);
    onOpen();
  };

  return (
    <div className="min-h-screen bg-black px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <h1 className="text-4xl md:text-5xl font-normal text-[#0084ff] leading-[1.1]">
            Event Created!
          </h1>
          <p className="text-white/50 text-lg">
            Here are some perfect spots for your night out
          </p>
        </motion.div>

        {/* Event Suggestions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden hover:border-[#0084ff]/30 transition-all"
            >
              {/* Image */}
              <div className="relative h-48 w-full">
                <Image
                  src={suggestion.image}
                  alt={suggestion.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-4 right-4 bg-black/70 px-3 py-1 rounded-lg">
                  <span className="text-white text-sm font-medium">
                    {suggestion.price}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-2xl font-medium text-white mb-1">
                    {suggestion.name}
                  </h3>
                  <p className="text-white/60 text-sm mb-2">{suggestion.type}</p>
                  
                  {/* Reddit Info - inline description */}
                  {suggestion.redditInfo && (
                    <p className="text-orange-400/90 text-sm mb-2 italic">
                      {suggestion.redditInfo}
                    </p>
                  )}
                  
                  {/* Polymarket Info - inline description */}
                  {suggestion.polymarketInfo && (
                    <p className="text-[#0084ff]/90 text-sm mb-2">
                      {suggestion.polymarketInfo}
                    </p>
                  )}
                </div>

                <p className="text-white/80">{suggestion.description}</p>

                {/* Footer */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">
                      {suggestion.distance} away
                    </span>
                    <button
                      onClick={() => handleViewReviews(suggestion)}
                      className="px-4 py-2 bg-[#0084ff] text-white rounded-lg hover:bg-[#00a0ff] transition-colors text-sm font-medium"
                    >
                      View Reviews
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      // TODO: Implement Series integration
                      console.log("Activating Event Agent for:", suggestion.name);
                    }}
                    className="w-full px-6 py-3 border-2 border-[#0084ff] text-[#0084ff] rounded-lg hover:bg-[#0084ff]/10 transition-all text-sm font-medium"
                  >
                    Activate Event Agent
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Reviews Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        placement="center"
        size="2xl"
        classNames={{
          base: "bg-[#0a0a0a] border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-white">
                <h3 className="text-2xl font-medium">{selectedEvent?.name}</h3>
                <p className="text-white/60 text-sm font-normal">
                  Reviews from Social Oracle users
                </p>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  {selectedEvent?.reviews?.map((review: any) => (
                    <div
                      key={review.id}
                      className="bg-[#111111] border border-white/8 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">
                            {review.user}
                          </span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <svg
                                key={i}
                                width="14"
                                height="14"
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
                        <span className="text-white/40 text-xs">
                          {review.date}
                        </span>
                      </div>
                      <p className="text-white/80 text-sm">{review.text}</p>
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
