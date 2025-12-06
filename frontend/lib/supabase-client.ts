"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ozfkozbbnmlbltzgtoat.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96ZmtvemJibm1sYmx0emd0b2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTA0MDAsImV4cCI6MjA3OTA4NjQwMH0.LPUOLBW9fSvXAkZJQwKethPcBhcnwgQ7C_oXYhp4Gd4";

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

