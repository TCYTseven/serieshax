"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Button } from "@heroui/button";
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
      description: "The premier destination for Nets fans. Immerse yourself in the game-day atmosphere with wall-to-wall screens, craft beer, and a community of passionate supporters.",
      image: "/bar.jpg",
      polymarketNote: filters.trendingTopics
        ? "Polymarket shows significant betting activity for tonight's Nets vs Celtics matchup, with Celtics favored at 89%"
        : null,
      redditNote: filters.secretGems
        ? "Reddit users consistently recommend this spot as a hidden gem for authentic game-day experiences"
        : null,
      seriesReview: "Rated 4.6 stars by Series Social Oracle users",
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
      description: "A neighborhood favorite known for its innovative menu and warm, inviting atmosphere. Perfect for intimate dinners or group celebrations.",
      image: "/bar.jpg",
      polymarketNote: null,
      redditNote: filters.secretGems
        ? "Frequently mentioned on Reddit as an underrated culinary destination worth discovering"
        : null,
      seriesReview: "Rated 4.8 stars by Series Social Oracle users",
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
      description: "An upscale cocktail lounge with an electric atmosphere. Expert mixologists craft signature drinks while DJs set the perfect backdrop for socializing.",
      image: "/midngiht-lounge.jpg",
      polymarketNote: null,
      redditNote: filters.secretGems
        ? "Reddit community highlights this as a must-visit spot for those seeking quality cocktails and vibrant social scenes"
        : null,
      seriesReview: "Rated 4.7 stars by Series Social Oracle users",
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

  // Always add default suggestions to ensure we have enough results
  suggestions.push(
    {
      id: 4,
      name: "The Social Spot",
      type: "Venue",
      description: "A versatile social space designed for connection. Whether you're looking for casual conversation or lively group activities, this venue adapts to your vibe.",
      image: "/bar.jpg",
      polymarketNote: null,
      redditNote: filters.secretGems
        ? "Reddit users praise this venue for its unique atmosphere and welcoming community"
        : null,
      seriesReview: "Rated 4.5 stars by Series Social Oracle users",
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
      description: "A classic neighborhood bar combining quality comfort food with expertly crafted drinks. The welcoming staff and regular crowd create an authentic local experience.",
      image: "/downtownbargrill.jpg",
      polymarketNote: null,
      redditNote: null,
      seriesReview: "Rated 4.4 stars by Series Social Oracle users",
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
    {
      id: 6,
      name: "Creative Pottery Studio",
      type: "Workshop",
      description: "Discover the art of ceramics in a welcoming studio environment. Expert instructors guide you through the process while you connect with fellow creatives. Take home your handmade piece as a lasting memory.",
      image: "/potteryclass.jpg",
      polymarketNote: null,
      redditNote: filters.secretGems
        ? "Reddit community consistently recommends this studio for its exceptional instruction and friendly, inclusive atmosphere"
        : null,
      seriesReview: "Rated 4.7 stars by Series Social Oracle users",
      isPartnered: true,
      price: "$$",
      distance: "0.7 miles",
      reviews: [
        {
          id: 1,
          user: "Maya K.",
          rating: 5,
          text: "Such a fun and relaxing experience! The instructor was amazing and I met some great people.",
          date: "4 days ago",
        },
        {
          id: 2,
          user: "Ryan P.",
          rating: 5,
          text: "Best pottery class in the city. Great atmosphere and the staff is super friendly.",
          date: "1 week ago",
        },
      ],
    },
    {
      id: 7,
      name: "Brooklyn Nets vs Boston Celtics",
      type: "Sports Event",
      description: "Experience the intensity of an NBA rivalry game live at Barclays Center. Join thousands of passionate fans as two Eastern Conference powerhouses battle it out on the court.",
      image: "/Sports Event.webp",
      polymarketNote: filters.trendingTopics
        ? "Polymarket indicates heavy betting interest with Celtics favored at 89% for tonight's matchup"
        : null,
      redditNote: null,
      seriesReview: "Rated 4.8 stars by Series Social Oracle users",
      isPartnered: false,
      price: "$$$",
      distance: "0.3 miles",
      reviews: [
        {
          id: 1,
          user: "Chris L.",
          rating: 5,
          text: "Incredible game! The energy in the arena was electric. Perfect night out.",
          date: "2 days ago",
        },
        {
          id: 2,
          user: "Sam T.",
          rating: 5,
          text: "Amazing seats and great crowd. Would definitely go again!",
          date: "5 days ago",
        },
      ],
    },
    {
      id: 8,
      name: "The Rooftop Lounge",
      type: "Bar & Rooftop",
      description: "Elevate your evening with panoramic city views and artisanal cocktails. This sophisticated rooftop destination offers an elegant atmosphere perfect for special occasions or elevated social gatherings.",
      image: "/bar.jpg",
      polymarketNote: null,
      redditNote: filters.secretGems
        ? "Reddit users consistently highlight this rooftop as one of the city's best-kept secrets for premium nightlife experiences"
        : null,
      seriesReview: "Rated 4.6 stars by Series Social Oracle users",
      isPartnered: true,
      price: "$$$",
      distance: "1.3 miles",
      reviews: [
        {
          id: 1,
          user: "Olivia R.",
          rating: 5,
          text: "Beautiful views and amazing cocktails. The vibe is unmatched!",
          date: "3 days ago",
        },
        {
          id: 2,
          user: "James W.",
          rating: 4,
          text: "Great spot for drinks. Gets busy on weekends but worth it for the views.",
          date: "1 week ago",
        },
      ],
    },
  );

  return suggestions; // Return all suggestions
};

// Event Card Component
const EventCard = ({ suggestion, onViewReviews, onActivateEvent }: { suggestion: any; onViewReviews: (event: any) => void; onActivateEvent: (event: any) => void }) => {
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
            onClick={() => onActivateEvent(suggestion)}
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
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventToSchedule, setEventToSchedule] = useState<any>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isScheduleOpen, onOpen: onScheduleOpen, onClose: onScheduleClose } = useDisclosure();
  const [isScheduling, setIsScheduling] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch Supabase event and combine with mock data
  useEffect(() => {
    const loadEvents = async () => {
      const mockEvents = generateEventSuggestions(onboardingData, filters);
      
      try {
        // Fetch event from Supabase
        const response = await fetch('/api/get-event?id=1');
        const result = await response.json();
        
        if (result.success && result.event) {
          const supabaseEvent = transformSupabaseEvent(result.event);
          // Insert as second event if transformation was successful
          if (supabaseEvent) {
            mockEvents.splice(1, 0, supabaseEvent);
          }
        }
      } catch (error) {
        console.error('Error loading Supabase event:', error);
      }
      
      setSuggestions(mockEvents);
    };

    loadEvents();
  }, [onboardingData, filters]);

  const transformSupabaseEvent = (event: any) => {
    if (!event || !event.id) {
      console.error('Invalid event data:', event);
      return null;
    }

    // Extract participants from group_list
    const participants = event.group_list && typeof event.group_list === 'object' 
      ? Object.keys(event.group_list) 
      : [];
    
    // Extract notes from polymarket_reddit
    const redditNotes = event.polymarket_reddit?.reddit?.notes || null;
    const polymarketNotes = event.polymarket_reddit?.polymarket?.notes || null;
    const notes = [redditNotes, polymarketNotes].filter(Boolean).join(' ');

    // Format vibes array as string
    const vibesText = Array.isArray(event.vibes) ? event.vibes.join(', ') : (event.vibes || null);

    // Transform series_reviews to match the review format
    const reviews = Array.isArray(event.series_reviews) 
      ? event.series_reviews.map((review: any, idx: number) => ({
          id: idx + 1,
          user: review.name || 'Anonymous',
          rating: review.stars || 5,
          text: review.review || '',
          date: 'Recently',
        }))
      : [];
    
    return {
      id: `supabase-${event.id}`,
      name: event.event_name || event.location_name || event.initiator_name || 'Event',
      type: 'Event',
      description: `Join ${event.initiator_name || 'us'} at ${event.location_name || 'this location'}. ${event.event_name ? `Event: ${event.event_name}` : ''}`,
      image: "/centralpark.jpg",
      location: event.location_name,
      organizer: event.initiator_name,
      participants: participants,
      group_list: event.group_list,
      notes: notes || null,
      vibes: vibesText,
      attendees: participants.length,
      isSupabaseEvent: true,
      supabaseEventData: event,
      isPartnered: event.series_partner || false,
      price: "$$",
      distance: "0.5 miles",
      reviews: reviews,
      seriesReview: reviews.length > 0 
        ? `Rated ${(reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)} stars by Series Social Oracle users`
        : null,
      redditNote: redditNotes,
      polymarketNote: polymarketNotes,
    };
  };

  const handleViewReviews = (event: any) => {
    setSelectedEvent(event);
    onOpen();
  };

  const handleActivateEvent = (event: any) => {
    setEventToSchedule(event);
    onScheduleOpen();
  };

  const handleScheduleEvent = async () => {
    if (!eventToSchedule) return;
    
    setIsScheduling(true);
    try {
      // Use the Supabase event data if available, otherwise use the transformed event
      const eventData = eventToSchedule.supabaseEventData || eventToSchedule;
      
      const response = await fetch('/api/activate-event-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId: eventData.id || 1 }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setNotification({ type: 'success', message: 'Event scheduled successfully! Group chat created.' });
        onScheduleClose();
        setEventToSchedule(null);
        // Auto-hide notification after 3 seconds
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification({ type: 'error', message: result.error || 'Failed to schedule event' });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error('Error scheduling event:', error);
      setNotification({ type: 'error', message: 'An error occurred while scheduling the event' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (suggestions.length <= 2) return;
    
    setSlideDirection("right");
    const newIndex = startIndex + 2 >= suggestions.length ? 0 : startIndex + 1;
    setStartIndex(newIndex);
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (suggestions.length <= 2) return;
    
    setSlideDirection("left");
    const newIndex = startIndex === 0 ? Math.max(0, suggestions.length - 2) : startIndex - 1;
    setStartIndex(newIndex);
  };

  // Get the two events to display
  const getVisibleEvents = () => {
    const events = [];
    for (let i = 0; i < 2; i++) {
      const index = (startIndex + i) % suggestions.length;
      events.push(suggestions[index]);
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
                    {visibleEvents.filter(Boolean).map((event, idx) => {
                      const isLeft = idx === 0;
                      return (
                        <div
                          key={`${event?.id || idx}-${startIndex}`}
                          className={`h-full ${isLeft ? 'md:pr-[0.5px]' : 'md:pl-[0.5px]'}`}
                        >
                          <EventCard suggestion={event} onViewReviews={handleViewReviews} onActivateEvent={handleActivateEvent} />
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

      {/* Schedule Confirmation Modal */}
      <Modal
        isOpen={isScheduleOpen}
        onClose={onScheduleClose}
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
                <h3 className="text-2xl font-light tracking-tight">Schedule Event</h3>
                <p className="text-white/40 text-sm font-light">
                  Review event details before scheduling
                </p>
              </ModalHeader>
              <ModalBody>
                {eventToSchedule && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-white text-lg font-light mb-2">{eventToSchedule.name}</h4>
                      <p className="text-white/60 text-sm font-light">{eventToSchedule.description}</p>
                    </div>
                    
                    <div className="space-y-2 pt-3 border-t border-white/10">
                      {eventToSchedule.organizer && (
                        <div className="text-white/70 text-sm">
                          <span className="text-white/40">Organizer:</span> {eventToSchedule.organizer}
                        </div>
                      )}
                      {eventToSchedule.location && (
                        <div className="text-white/70 text-sm">
                          <span className="text-white/40">Location:</span> {eventToSchedule.location}
                        </div>
                      )}
                      {eventToSchedule.participants && eventToSchedule.participants.length > 0 && (
                        <div className="text-white/70 text-sm">
                          <span className="text-white/40">Participants:</span> {eventToSchedule.participants.join(', ')}
                        </div>
                      )}
                      {eventToSchedule.attendees && (
                        <div className="text-white/70 text-sm">
                          <span className="text-white/40">Attendees:</span> {eventToSchedule.attendees}
                        </div>
                      )}
                    </div>

                    {eventToSchedule.notes && (
                      <div className="pt-3 border-t border-white/10">
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Notes</p>
                        <p className="text-white/60 text-sm font-light">{eventToSchedule.notes}</p>
                      </div>
                    )}

                    {eventToSchedule.vibes && (
                      <div className="pt-3 border-t border-white/10">
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Vibes</p>
                        <p className="text-white/60 text-sm font-light">{eventToSchedule.vibes}</p>
                      </div>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  onClick={onClose}
                  className="px-6 py-2 border border-white/20 text-white/60 hover:bg-white/5 transition-all text-xs font-light uppercase tracking-wider"
                  style={{ borderRadius: 0 }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleScheduleEvent}
                  isLoading={isScheduling}
                  className="px-6 py-2 bg-[#0084ff] text-white hover:bg-[#00a0ff] transition-all text-xs font-light uppercase tracking-wider"
                  style={{ borderRadius: 0 }}
                >
                  Schedule Now
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]"
          >
            <div
              className={`px-6 py-4 rounded-none border ${
                notification.type === 'success'
                  ? 'bg-black border-[#0084ff] text-white'
                  : 'bg-black border-red-500 text-white'
              } shadow-lg min-w-[300px] max-w-md`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-1 h-full ${notification.type === 'success' ? 'bg-[#0084ff]' : 'bg-red-500'}`} />
                <div className="flex-1">
                  <p className="text-sm font-light">{notification.message}</p>
                </div>
                <button
                  onClick={() => setNotification(null)}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
