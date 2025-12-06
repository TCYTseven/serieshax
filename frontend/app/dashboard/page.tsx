"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";

// Mock sales data from Series platform (realistic numbers for a new platform)
const monthlySalesData = [
  { month: "Jan", revenue: 320, customers: 8, events: 3 },
  { month: "Feb", revenue: 480, customers: 12, events: 5 },
  { month: "Mar", revenue: 560, customers: 14, events: 6 },
  { month: "Apr", revenue: 720, customers: 18, events: 8 },
  { month: "May", revenue: 840, customers: 21, events: 9 },
  { month: "Jun", revenue: 960, customers: 24, events: 11 },
];

const weeklyData = [
  { day: "Mon", sales: 85 },
  { day: "Tue", sales: 120 },
  { day: "Wed", sales: 95 },
  { day: "Thu", sales: 140 },
  { day: "Fri", sales: 180 },
  { day: "Sat", sales: 220 },
  { day: "Sun", sales: 190 },
];

const eventTypeData = [
  { type: "Nightlife", count: 8, revenue: 640 },
  { type: "Food", count: 6, revenue: 480 },
  { type: "Sports", count: 4, revenue: 320 },
  { type: "Other", count: 2, revenue: 160 },
];

// Reviews from Series users
const seriesReviews = [
  {
    id: 1,
    user: "Jordan M.",
    rating: 4,
    text: "Solid spot, good drinks and decent food. Found this place through Series and wasn't disappointed.",
    date: "3 days ago",
    revenue: 45,
  },
  {
    id: 2,
    user: "Sarah K.",
    rating: 5,
    text: "Great atmosphere! The Series recommendation was spot on. Will definitely come back.",
    date: "1 week ago",
    revenue: 68,
  },
  {
    id: 3,
    user: "Mike T.",
    rating: 4,
    text: "Nice place with good vibes. Series suggested this and it was exactly what I was looking for.",
    date: "2 weeks ago",
    revenue: 52,
  },
  {
    id: 4,
    user: "Emma L.",
    rating: 5,
    text: "Amazing find! Series really knows how to match venues with what you're looking for.",
    date: "3 weeks ago",
    revenue: 75,
  },
];

export default function Dashboard() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [promoData, setPromoData] = useState({
    type: "",
    discount: "",
    description: "",
    expirationDate: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalRevenue = monthlySalesData.reduce((sum, item) => sum + item.revenue, 0);
  const totalCustomers = monthlySalesData.reduce((sum, item) => sum + item.customers, 0);
  const totalEvents = monthlySalesData.reduce((sum, item) => sum + item.events, 0);
  const avgRevenue = Math.round(totalRevenue / monthlySalesData.length);

  const handlePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setPromoData({ type: "", discount: "", description: "", expirationDate: "" });
    onClose();
  };

  const handlePromoChange = (field: string, value: string) => {
    setPromoData((prev) => ({ ...prev, [field]: value }));
  };

  // Custom tooltip style
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black border border-white/10 p-3">
          <p className="text-white/60 text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-white text-sm" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? `$${entry.value.toLocaleString()}` : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-black px-6 py-12">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="w-12 h-px bg-[#0084ff] mb-4" />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-5xl md:text-6xl font-light text-white leading-[1.05] tracking-tight">
                Downtown Bar & Grill
              </h1>
              <p className="text-white/40 text-lg font-light mt-2">
                Your Series Social Oracle performance dashboard
              </p>
            </div>
            <Button
              onClick={onOpen}
              className="bg-[#0084ff] text-white hover:bg-[#00a0ff] transition-colors px-6 py-2 font-light uppercase tracking-wider"
              style={{ borderRadius: 0 }}
            >
              Create New Promo
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-black border border-white/10 p-6"
            style={{ borderRadius: 0 }}
          >
            <p className="text-white/40 text-sm font-light uppercase tracking-wider mb-2">
              Total Revenue
            </p>
            <p className="text-3xl font-light text-white">
              ${totalRevenue.toLocaleString()}
            </p>
            <p className="text-white/40 text-xs font-light mt-2">From Series users</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-black border border-white/10 p-6"
            style={{ borderRadius: 0 }}
          >
            <p className="text-white/40 text-sm font-light uppercase tracking-wider mb-2">
              Series Customers
            </p>
            <p className="text-3xl font-light text-white">
              {totalCustomers}
            </p>
            <p className="text-white/40 text-xs font-light mt-2">Total referrals</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-black border border-white/10 p-6"
            style={{ borderRadius: 0 }}
          >
            <p className="text-white/40 text-sm font-light uppercase tracking-wider mb-2">
              Series Events
            </p>
            <p className="text-3xl font-light text-white">
              {totalEvents}
            </p>
            <p className="text-white/40 text-xs font-light mt-2">Total bookings</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-black border border-white/10 p-6"
            style={{ borderRadius: 0 }}
          >
            <p className="text-white/40 text-sm font-light uppercase tracking-wider mb-2">
              Avg per Month
            </p>
            <p className="text-3xl font-light text-white">
              ${avgRevenue}
            </p>
            <p className="text-white/40 text-xs font-light mt-2">From Series</p>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Revenue Line Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-black border border-white/10 p-6"
            style={{ borderRadius: 0 }}
          >
            <h3 className="text-white text-xl font-light mb-6 tracking-tight">
              Revenue from Series Users
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlySalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="month"
                  stroke="#ffffff40"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="#ffffff40"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `$${value}`}
                  domain={[0, 'dataMax + 100']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0084ff"
                  strokeWidth={2}
                  dot={{ fill: "#0084ff", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Weekly Sales Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-black border border-white/10 p-6"
            style={{ borderRadius: 0 }}
          >
            <h3 className="text-white text-xl font-light mb-6 tracking-tight">
              Weekly Series Referrals
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="day"
                  stroke="#ffffff40"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="#ffffff40"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `$${value}`}
                  domain={[0, 'dataMax + 100']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="sales" fill="#0084ff" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Customers & Events Area Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-black border border-white/10 p-6"
            style={{ borderRadius: 0 }}
          >
            <h3 className="text-white text-xl font-light mb-6 tracking-tight">
              Series Customers & Bookings
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlySalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="month"
                  stroke="#ffffff40"
                  style={{ fontSize: "12px" }}
                />
                <YAxis stroke="#ffffff40" style={{ fontSize: "12px" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="customers"
                  stackId="1"
                  stroke="#0084ff"
                  fill="#0084ff"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="events"
                  stackId="2"
                  stroke="#00a0ff"
                  fill="#00a0ff"
                  fillOpacity={0.3}
                />
                <Legend
                  wrapperStyle={{ color: "#ffffff60", fontSize: "12px" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Event Type Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-black border border-white/10 p-6"
            style={{ borderRadius: 0 }}
          >
            <h3 className="text-white text-xl font-light mb-6 tracking-tight">
              Event Types via Series
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={eventTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  type="number"
                  stroke="#ffffff40"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `$${value}`}
                />
                <YAxis
                  dataKey="type"
                  type="category"
                  stroke="#ffffff40"
                  style={{ fontSize: "12px" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#0084ff" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Series User Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-black border border-white/10 p-6"
          style={{ borderRadius: 0 }}
        >
          <h3 className="text-white text-xl font-light mb-6 tracking-tight">
            Reviews from Series Users
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seriesReviews.map((review) => (
              <div
                key={review.id}
                className="bg-[#111111] border border-white/8 p-4"
                style={{ borderRadius: 0 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#0084ff]/20 flex items-center justify-center text-[#0084ff] text-sm font-light">
                      {review.user.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-light text-sm">{review.user}</p>
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg
                            key={i}
                            width="10"
                            height="10"
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
                  </div>
                  <div className="text-right">
                    <p className="text-white/60 text-xs font-light">${review.revenue}</p>
                    <p className="text-white/30 text-xs font-light mt-1">{review.date}</p>
                  </div>
                </div>
                <p className="text-white/60 text-sm font-light leading-relaxed">{review.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Create Promo Modal */}
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
              <form onSubmit={handlePromoSubmit}>
                <ModalHeader className="flex flex-col gap-1 text-white">
                  <div className="w-12 h-px bg-[#0084ff] mb-2" />
                  <h3 className="text-2xl font-light tracking-tight">Create New Promo</h3>
                  <p className="text-white/40 text-sm font-light">
                    Offer exclusive deals to Series Social Oracle users
                  </p>
                </ModalHeader>
                <ModalBody>
                  <div className="space-y-6">
                    {/* Promo Type */}
                    <div>
                      <label className="text-white/60 text-xs font-light uppercase tracking-wider mb-2 block">
                        Promotion Type
                      </label>
                      <Select
                        placeholder="Select promotion type"
                        selectedKeys={promoData.type ? [promoData.type] : []}
                        onSelectionChange={(keys) => {
                          const value = Array.from(keys)[0] as string;
                          handlePromoChange("type", value);
                        }}
                        classNames={{
                          trigger: "bg-black border-white/10 text-white",
                          popoverContent: "bg-black border-white/10",
                        }}
                      >
                        <SelectItem key="discount" value="discount">
                          Percentage Discount
                        </SelectItem>
                        <SelectItem key="bogo" value="bogo">
                          Buy One Get One (BOGO)
                        </SelectItem>
                        <SelectItem key="fixed" value="fixed">
                          Fixed Amount Off
                        </SelectItem>
                        <SelectItem key="free" value="free">
                          Free Item/Service
                        </SelectItem>
                      </Select>
                    </div>

                    {/* Discount/Amount */}
                    {promoData.type && (
                      <div>
                        <label className="text-white/60 text-xs font-light uppercase tracking-wider mb-2 block">
                          {promoData.type === "discount" || promoData.type === "bogo"
                            ? "Discount Percentage"
                            : promoData.type === "fixed"
                            ? "Amount Off ($)"
                            : "Description"}
                        </label>
                        <Input
                          type={promoData.type === "fixed" ? "number" : promoData.type === "discount" || promoData.type === "bogo" ? "number" : "text"}
                          placeholder={
                            promoData.type === "discount" || promoData.type === "bogo"
                              ? "e.g., 10 for 10% off"
                              : promoData.type === "fixed"
                              ? "e.g., 5 for $5 off"
                              : "e.g., Free appetizer with entree"
                          }
                          value={promoData.discount}
                          onChange={(e) => handlePromoChange("discount", e.target.value)}
                          classNames={{
                            input: "text-white",
                            inputWrapper: "bg-black border-white/10 hover:border-white/20",
                          }}
                          endContent={
                            (promoData.type === "discount" || promoData.type === "bogo") && (
                              <span className="text-white/40 text-sm">%</span>
                            )
                          }
                          startContent={
                            promoData.type === "fixed" && (
                              <span className="text-white/40 text-sm">$</span>
                            )
                          }
                        />
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <label className="text-white/60 text-xs font-light uppercase tracking-wider mb-2 block">
                        Description
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g., 10% off all drinks for Series users"
                        value={promoData.description}
                        onChange={(e) => handlePromoChange("description", e.target.value)}
                        classNames={{
                          input: "text-white",
                          inputWrapper: "bg-black border-white/10 hover:border-white/20",
                        }}
                      />
                    </div>

                    {/* Expiration Date */}
                    <div>
                      <label className="text-white/60 text-xs font-light uppercase tracking-wider mb-2 block">
                        Expiration Date
                      </label>
                      <Input
                        type="date"
                        value={promoData.expirationDate}
                        onChange={(e) => handlePromoChange("expirationDate", e.target.value)}
                        classNames={{
                          input: "text-white",
                          inputWrapper: "bg-black border-white/10 hover:border-white/20",
                        }}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 border border-white/10 text-white hover:bg-white/10 transition-colors font-light uppercase tracking-wider"
                    style={{ borderRadius: 0 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!promoData.type || !promoData.description || !promoData.expirationDate || isSubmitting}
                    className="px-6 py-2 bg-[#0084ff] text-white hover:bg-[#00a0ff] transition-colors font-light uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderRadius: 0 }}
                  >
                    {isSubmitting ? "Creating..." : "Create Promo"}
                  </Button>
                </ModalFooter>
              </form>
            )}
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}

