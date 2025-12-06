"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Modal, ModalContent, ModalHeader, ModalBody, useDisclosure } from "@heroui/modal";
import { OnboardingData } from "@/contexts/OnboardingContext";
import { GeneratedEvent, generateFallbackEvents, SearchFilters, createPersonalizedEvents } from "@/lib/event-creation-api";

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

// Event Card Component
const EventCard = ({ suggestion, onViewReviews }: { suggestion: GeneratedEvent; onViewReviews: (event: GeneratedEvent) => void }) => {
  return (
    <div className="bg-black border border-white/10 p-8 md:p-10 h-full flex flex-col">
      {/* Image */}
      <div className="relative h-48 md:h-56 w-full mb-6">
        <Image
          src={suggestion.imagePath || '/bar.jpg'}
          alt={suggestion.locationName}
          fill
          className="object-cover"
        />
        <div className="absolute top-4 right-4 bg-black/80 px-3 py-1.5">
          <span className="text-white text-sm font-light">
            {suggestion.priceTier}
          </span>
        </div>
        {/* Series Partner Badge */}
        {suggestion.seriesPartner && (
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
            {suggestion.locationName}
          </h3>
          <p className="text-white/40 text-xs font-light uppercase tracking-wider">
            {suggestion.venueType?.replace(/_/g, ' ') || 'Venue'}
          </p>
        </div>

        {/* Description */}
        <div>
          <p className="text-white/60 text-sm font-light leading-relaxed">
            {suggestion.description}
          </p>
        </div>

        {/* Vibes Tags */}
        {suggestion.vibes && suggestion.vibes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestion.vibes.slice(0, 4).map((vibe, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-white/5 border border-white/10 text-white/50 text-xs font-light"
              >
                {vibe.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Notes Section - Polymarket & Reddit */}
        {(suggestion.redditNote || suggestion.polymarketNote || suggestion.seriesPartner) && (
          <div className="space-y-2 pt-3 border-t border-white/10">
            <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2">
              Notes
            </p>
            <ul className="space-y-2">
              {suggestion.seriesPartner && (
                <li className="text-white/50 text-xs font-light flex items-start gap-2">
                  <span className="text-[#0084ff] mt-0.5">•</span>
                  <span>30% discount to all Series members</span>
                </li>
              )}
              {suggestion.polymarketNote && (
                <li className="text-white/50 text-xs font-light flex items-start gap-2">
                  <Image
                    src="/polymarket-icon.png"
                    alt="Polymarket"
                    width={14}
                    height={14}
                    className="rounded mt-0.5 flex-shrink-0"
                  />
                  <span>{suggestion.polymarketNote.notes}</span>
                </li>
              )}
              {suggestion.redditNote && (
                <li className="text-white/50 text-xs font-light flex items-start gap-2">
                  <Image
                    src="/reddit-logo.png"
                    alt="Reddit"
                    width={14}
                    height={14}
                    className="rounded mt-0.5 flex-shrink-0"
                  />
                  <span>{suggestion.redditNote.notes}</span>
                </li>
              )}
              {suggestion.seriesReview && (
                <li className="text-white/50 text-xs font-light flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">★</span>
                  <span>Rated {suggestion.seriesReview.toFixed(1)} stars by Series Social Oracle users</span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Footer Actions */}
        <div className="space-y-3 pt-3 border-t border-white/10 mt-auto">
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-xs font-light">
              {suggestion.estimatedDistance} away
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
              console.log("Activating Event Agent for:", suggestion.locationName);
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
  const [suggestions, setSuggestions] = useState<GeneratedEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<GeneratedEvent | null>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const apiCalledRef = useRef(false); // Prevent multiple API calls
  const isLoadingRef = useRef(false); // Track if API call is in progress

  // Load events from sessionStorage OR call API if empty
  useEffect(() => {
    // Prevent multiple calls
    if (apiCalledRef.current || isLoadingRef.current) {
      console.log("⏭️ EventResults: Skipping - API already called or in progress");
      return;
    }

    console.log("🔍 EventResults: Checking for stored events...");
    const storedEvents = sessionStorage.getItem('generatedEvents');
    console.log("🔍 EventResults: sessionStorage value:", storedEvents ? `Found ${storedEvents.length} chars` : "EMPTY");
    
    if (storedEvents) {
      try {
        const parsedEvents = JSON.parse(storedEvents) as GeneratedEvent[];
        console.log("📦 Loaded events from sessionStorage:", parsedEvents.length);
        console.log("📦 First event:", parsedEvents[0]?.locationName, "at", parsedEvents[0]?.locationAddress);
        setSuggestions(parsedEvents);
        apiCalledRef.current = true; // Mark as done
        // Clear from session storage after loading
        sessionStorage.removeItem('generatedEvents');
      } catch (error) {
        console.error("❌ Failed to parse stored events:", error);
        // Call API instead of fallback
        callEventCreationAPI();
      }
    } else {
      // No stored events - CALL THE API instead of showing fallback!
      console.log("⚠️ No stored events in sessionStorage, calling API to generate events...");
      callEventCreationAPI();
    }
  }, [filters, onboardingData, searchQuery]);

  // Call the Event Creation API
  const callEventCreationAPI = async () => {
    // Prevent duplicate calls
    if (isLoadingRef.current || apiCalledRef.current) {
      console.log("⏭️ EventResults: API call already in progress or completed");
      return;
    }

    isLoadingRef.current = true;
    apiCalledRef.current = true;

    try {
      const searchFilters: SearchFilters = {
        people: filters.people,
        location: filters.location || onboardingData.location?.split(',')[0].trim() || '',
        budget: filters.budget,
        trendingTopics: filters.trendingTopics,
        secretGems: filters.secretGems,
      };

      console.log("🔮 EventResults: Calling API directly...");
      const result = await createPersonalizedEvents(
        onboardingData,
        searchFilters,
        searchQuery
      );

      if (result.success && result.events && result.events.length > 0) {
        console.log("✅ EventResults: API returned", result.events.length, "real events");
        console.log("✅ First event:", result.events[0]?.locationName, "at", result.events[0]?.locationAddress);
        console.log("✅ ALL events:", result.events.map(e => `${e.locationName} (${e.locationAddress})`).join(', '));
        setSuggestions(result.events);
      } else {
        console.error("❌ EventResults: API failed or returned no events:", result.error);
        // Only use fallback as LAST resort
        console.log("⚠️ Using fallback events as last resort");
        setSuggestions(generateFallbackEvents(onboardingData, searchFilters));
      }
    } catch (error) {
      console.error("❌ EventResults: API call failed:", error);
      // Only use fallback as LAST resort
      const searchFilters: SearchFilters = {
        people: filters.people,
        location: filters.location || onboardingData.location?.split(',')[0].trim() || '',
        budget: filters.budget,
        trendingTopics: filters.trendingTopics,
        secretGems: filters.secretGems,
      };
      setSuggestions(generateFallbackEvents(onboardingData, searchFilters));
    } finally {
      isLoadingRef.current = false;
    }
  };

  const handleViewReviews = (event: GeneratedEvent) => {
    setSelectedEvent(event);
    onOpen();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (suggestions.length <= 2) return;
    
    setSlideDirection("right");
    // Step by 2 to show a completely new set of events
    const newIndex = (startIndex + 2) % suggestions.length;
    setStartIndex(newIndex);
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (suggestions.length <= 2) return;
    
    setSlideDirection("left");
    // Step back by 2, handle wrapping
    let newIndex = startIndex - 2;
    if (newIndex < 0) {
      newIndex = suggestions.length + newIndex; // Wrap to end
      // Adjust for odd number of events if needed to ensure we show 2
      if (newIndex % 2 !== 0 && suggestions.length % 2 === 0) newIndex -= 1; 
    }
    setStartIndex(newIndex);
  };

  // Get the two events to display
  const getVisibleEvents = () => {
    const events: GeneratedEvent[] = [];
    for (let i = 0; i < 2; i++) {
      const index = (startIndex + i) % suggestions.length;
      if (suggestions[index]) {
        events.push(suggestions[index]);
      }
    }
    return events;
  };

  const visibleEvents = getVisibleEvents();

  if (suggestions.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border border-[#0084ff] border-t-transparent animate-spin mx-auto" />
          <p className="text-white/50 text-sm">Loading events...</p>
        </div>
      </div>
    );
  }

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
            Here are {suggestions.length} perfect spots curated just for you
          </p>
          
          {/* Active Filters Indicator */}
          <div className="flex items-center gap-4 pt-2">
            {filters.trendingTopics && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10">
                <Image
                  src="/polymarket-icon.png"
                  alt="Polymarket"
                  width={14}
                  height={14}
                  className="rounded"
                />
                <span className="text-xs text-white/60 font-light">Polymarket data active</span>
              </div>
            )}
            {filters.secretGems && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10">
                <Image
                  src="/reddit-logo.png"
                  alt="Reddit"
                  width={14}
                  height={14}
                  className="rounded"
                />
                <span className="text-xs text-white/60 font-light">Reddit gems active</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Event Cards with Navigation */}
        <div className="relative">
          <div className="max-w-7xl mx-auto">
            <div className="relative h-[700px] md:h-[750px] overflow-hidden">
              <div className="relative h-full w-full bg-white/5">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={startIndex}
                    initial={{ x: slideDirection === "right" ? "100%" : "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: slideDirection === "right" ? "-100%" : "100%" }}
                    transition={{ 
                      duration: 0.35, 
                      ease: [0.25, 0.1, 0.25, 1]
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-px h-full w-full absolute inset-0"
                  >
                    {visibleEvents.map((event, idx) => {
                      const isLeft = idx === 0;
                      return (
                        <div
                          key={`${event.id}-${startIndex}`}
                          className={`h-full ${isLeft ? 'md:pr-[0.5px]' : 'md:pl-[0.5px]'}`}
                        >
                          <EventCard suggestion={event} onViewReviews={handleViewReviews} />
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Navigation Arrows */}
            {suggestions.length > 2 && (
              <>
                <button
                  onClick={handlePrevious}
                  type="button"
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 w-10 h-10 border border-white/10 bg-black/80 hover:bg-black hover:border-white/20 transition-all flex items-center justify-center text-white/60 hover:text-white z-50"
                  style={{ borderRadius: 0 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  onClick={handleNext}
                  type="button"
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 w-10 h-10 border border-white/10 bg-black/80 hover:bg-black hover:border-white/20 transition-all flex items-center justify-center text-white/60 hover:text-white z-50"
                  style={{ borderRadius: 0 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </>
            )}

            {/* Page Indicator */}
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: Math.ceil(suggestions.length / 2) }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setStartIndex(idx * 2 > suggestions.length - 2 ? suggestions.length - 2 : idx)}
                  className={`w-2 h-2 transition-colors ${
                    Math.floor(startIndex / 2) === idx || startIndex === idx
                      ? 'bg-[#0084ff]'
                      : 'bg-white/20 hover:bg-white/40'
                  }`}
                  style={{ borderRadius: 0 }}
                />
              ))}
            </div>
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
                <h3 className="text-2xl font-light tracking-tight">{selectedEvent?.locationName}</h3>
                <p className="text-white/40 text-sm font-light">
                  Reviews from Series Social Oracle users
                </p>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  {selectedEvent?.reviews?.length ? (
                    selectedEvent.reviews.map((review, idx) => (
                      <div
                        key={idx}
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
                    ))
                  ) : (
                    <div className="text-center text-white/40 py-8">
                      <p>No reviews yet for this venue.</p>
                      <p className="text-sm mt-2">Be the first to share your experience!</p>
                    </div>
                  )}
                </div>

                {/* Polymarket/Reddit info in modal */}
                {(selectedEvent?.polymarketNote || selectedEvent?.redditNote) && (
                  <div className="mt-6 pt-4 border-t border-white/10 space-y-3">
                    <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
                      AI Insights
                    </p>
                    {selectedEvent?.polymarketNote && (
                      <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/10">
                        <Image
                          src="/polymarket-icon.png"
                          alt="Polymarket"
                          width={20}
                          height={20}
                          className="rounded flex-shrink-0 mt-0.5"
                        />
                        <div>
                          <p className="text-white/70 text-sm font-light">{selectedEvent.polymarketNote.notes}</p>
                          {selectedEvent.polymarketNote.prediction && (
                            <p className="text-white/40 text-xs mt-1">
                              Source: Polymarket prediction markets
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedEvent?.redditNote && (
                      <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/10">
                        <Image
                          src="/reddit-logo.png"
                          alt="Reddit"
                          width={20}
                          height={20}
                          className="rounded flex-shrink-0 mt-0.5"
                        />
                        <div>
                          <p className="text-white/70 text-sm font-light">{selectedEvent.redditNote.notes}</p>
                          <p className="text-white/40 text-xs mt-1">
                            Source: Local Reddit community insights
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
