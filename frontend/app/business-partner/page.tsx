"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@heroui/button";

export default function BusinessPartnerPage() {
  const [formData, setFormData] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    location: "",
    businessType: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
          >
            <h1 className="text-5xl md:text-6xl font-light text-white leading-[1.05] tracking-tight mb-6">
              Partner with Series
            </h1>
            <p className="text-lg md:text-xl text-white/60 font-light leading-relaxed max-w-2xl">
              Connect your business with thousands of users actively seeking exceptional experiences
            </p>
          </motion.div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 mb-20">
          <div className="bg-black p-10 md:p-12">
            <div className="mb-6">
              <div className="w-12 h-px bg-[#0084ff] mb-4" />
              <h3 className="text-xl md:text-2xl font-light text-white mb-3 tracking-tight">
                Reach Thousands
              </h3>
            </div>
            <p className="text-white/50 text-sm md:text-base leading-relaxed font-light">
              Promote your restaurant or location to all Series customers actively looking for great experiences in your area.
            </p>
          </div>

          <div className="bg-black p-10 md:p-12">
            <div className="mb-6">
              <div className="w-12 h-px bg-[#0084ff] mb-4" />
              <h3 className="text-xl md:text-2xl font-light text-white mb-3 tracking-tight">
                Mutual Benefits
              </h3>
            </div>
            <p className="text-white/50 text-sm md:text-base leading-relaxed font-light">
              Your location receives authentic reviews and organic customers. Series receives a flat fee. A straightforward partnership.
            </p>
          </div>

          <div className="bg-black p-10 md:p-12">
            <div className="mb-6">
              <div className="w-12 h-px bg-[#0084ff] mb-4" />
              <h3 className="text-xl md:text-2xl font-light text-white mb-3 tracking-tight">
                Exclusive Perks
              </h3>
            </div>
            <p className="text-white/50 text-sm md:text-base leading-relaxed font-light">
              Attract Series users with special discounts and free perks. Build loyalty while driving foot traffic to your business.
            </p>
          </div>
        </div>

        {/* Application Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-3xl"
        >
          <div className="mb-10">
            <div className="w-12 h-px bg-[#0084ff] mb-6" />
            <h2 className="text-3xl md:text-4xl font-light text-white mb-4 tracking-tight">
              Get Started
            </h2>
            <p className="text-white/50 text-base md:text-lg font-light">
              Fill out the form below and our team will reach out within 24-48 hours
            </p>
          </div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16"
            >
              <div className="mb-6">
                <div className="w-12 h-px bg-[#0084ff] mb-4" />
                <h3 className="text-2xl md:text-3xl font-light text-white mb-3 tracking-tight">
                  Thank You
                </h3>
              </div>
              <p className="text-white/50 text-base md:text-lg font-light">
                We've received your application. Our team will contact you within 24-48 hours.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs text-white/50 uppercase tracking-wider mb-4 font-medium">
                    Business Name
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    required
                    className="w-full px-0 py-3 bg-transparent border-b border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#0084ff] transition-colors font-light text-base"
                    placeholder="Your restaurant or venue name"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/50 uppercase tracking-wider mb-4 font-medium">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleChange}
                    required
                    className="w-full px-0 py-3 bg-transparent border-b border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#0084ff] transition-colors font-light text-base"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs text-white/50 uppercase tracking-wider mb-4 font-medium">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-0 py-3 bg-transparent border-b border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#0084ff] transition-colors font-light text-base"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/50 uppercase tracking-wider mb-4 font-medium">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-0 py-3 bg-transparent border-b border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#0084ff] transition-colors font-light text-base"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 uppercase tracking-wider mb-4 font-medium">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full px-0 py-3 bg-transparent border-b border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#0084ff] transition-colors font-light text-base"
                  placeholder="City, State"
                />
              </div>

              <div>
                <label className="block text-xs text-white/50 uppercase tracking-wider mb-4 font-medium">
                  Business Type
                </label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  required
                  className="w-full px-0 py-3 bg-transparent border-b border-white/10 text-white focus:outline-none focus:border-[#0084ff] transition-colors font-light text-base appearance-none cursor-pointer"
                >
                  <option value="" className="bg-black text-white">Select business type</option>
                  <option value="restaurant" className="bg-black text-white">Restaurant</option>
                  <option value="bar" className="bg-black text-white">Bar & Lounge</option>
                  <option value="cafe" className="bg-black text-white">Cafe</option>
                  <option value="sports-bar" className="bg-black text-white">Sports Bar</option>
                  <option value="venue" className="bg-black text-white">Event Venue</option>
                  <option value="other" className="bg-black text-white">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-white/50 uppercase tracking-wider mb-4 font-medium">
                  Tell us about your business
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-0 py-3 bg-transparent border-b border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#0084ff] transition-colors font-light resize-none text-base"
                  placeholder="What makes your location special? Any current promotions or events?"
                />
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="bg-[#0084ff] text-white hover:bg-[#00a0ff] font-light px-12 py-6 text-sm uppercase tracking-wider"
                  size="lg"
                  radius="none"
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
