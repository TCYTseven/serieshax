"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <h3 className="text-white font-medium text-lg">Social Oracle</h3>
            <p className="text-white/40 text-sm">
              Your AI-powered social event planning companion
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="text-white/60 text-sm font-medium uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-white/40 hover:text-white/70 text-sm transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/" className="text-white/40 hover:text-white/70 text-sm transition-colors">
                  How it Works
                </Link>
              </li>
              <li>
                <Link href="/" className="text-white/40 hover:text-white/70 text-sm transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-3">
            <h4 className="text-white/60 text-sm font-medium uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-white/40 hover:text-white/70 text-sm transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/" className="text-white/40 hover:text-white/70 text-sm transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/" className="text-white/40 hover:text-white/70 text-sm transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Business Owners */}
          <div className="space-y-3">
            <h4 className="text-white/60 text-sm font-medium uppercase tracking-wider">
              For Business Owners
            </h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/business-partner" 
                  className="text-white/40 hover:text-white/70 text-sm transition-colors"
                >
                  Partner with Series
                </Link>
              </li>
              <li>
                <Link href="/business-partner" className="text-white/40 hover:text-white/70 text-sm transition-colors">
                  Benefits
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-white/40 hover:text-white/70 text-sm transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/30 text-xs">
            © {new Date().getFullYear()} Social Oracle. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/" className="text-white/30 hover:text-white/50 text-xs transition-colors">
              Privacy Policy
            </Link>
            <Link href="/" className="text-white/30 hover:text-white/50 text-xs transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

