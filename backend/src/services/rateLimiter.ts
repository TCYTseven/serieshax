/**
 * Rate Limiter Service
 * Simple in-memory rate limiting for SMS responses
 */

interface RateLimitEntry {
  count: number;
  firstRequestTime: number;
  lastRequestTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 messages per minute
const COOLDOWN_MS = 5 * 1000; // 5 second cooldown between messages

/**
 * Check if a phone number is rate limited
 */
export function isRateLimited(phoneNumber: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(phoneNumber);

  if (!entry) {
    return false;
  }

  // Check if window has expired
  if (now - entry.firstRequestTime > RATE_LIMIT_WINDOW_MS) {
    // Reset the window
    rateLimitStore.delete(phoneNumber);
    return false;
  }

  // Check if too many requests in window
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  // Check cooldown between messages
  if (now - entry.lastRequestTime < COOLDOWN_MS) {
    return true;
  }

  return false;
}

/**
 * Record a request from a phone number
 */
export function recordRequest(phoneNumber: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(phoneNumber);

  if (!entry || now - entry.firstRequestTime > RATE_LIMIT_WINDOW_MS) {
    // Start new window
    rateLimitStore.set(phoneNumber, {
      count: 1,
      firstRequestTime: now,
      lastRequestTime: now,
    });
  } else {
    // Update existing window
    entry.count++;
    entry.lastRequestTime = now;
  }
}

/**
 * Get remaining requests for a phone number
 */
export function getRemainingRequests(phoneNumber: string): number {
  const entry = rateLimitStore.get(phoneNumber);
  
  if (!entry) {
    return MAX_REQUESTS_PER_WINDOW;
  }

  const now = Date.now();
  if (now - entry.firstRequestTime > RATE_LIMIT_WINDOW_MS) {
    return MAX_REQUESTS_PER_WINDOW;
  }

  return Math.max(0, MAX_REQUESTS_PER_WINDOW - entry.count);
}

/**
 * Get time until rate limit resets (in seconds)
 */
export function getResetTimeSeconds(phoneNumber: string): number {
  const entry = rateLimitStore.get(phoneNumber);
  
  if (!entry) {
    return 0;
  }

  const now = Date.now();
  const windowEnd = entry.firstRequestTime + RATE_LIMIT_WINDOW_MS;
  
  if (now >= windowEnd) {
    return 0;
  }

  return Math.ceil((windowEnd - now) / 1000);
}

/**
 * Clear rate limit for a phone number (for testing/admin)
 */
export function clearRateLimit(phoneNumber: string): void {
  rateLimitStore.delete(phoneNumber);
}

/**
 * Get rate limit status message
 */
export function getRateLimitMessage(): string {
  return "Whoa, slow down! 😅 You're sending messages too fast. Give me a sec and try again.";
}

/**
 * Cleanup old entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  const expiredPhones: string[] = [];

  rateLimitStore.forEach((entry, phone) => {
    if (now - entry.firstRequestTime > RATE_LIMIT_WINDOW_MS * 2) {
      expiredPhones.push(phone);
    }
  });

  expiredPhones.forEach(phone => rateLimitStore.delete(phone));

  if (expiredPhones.length > 0) {
    console.log(`🧹 Cleaned up ${expiredPhones.length} expired rate limit entries`);
  }
}

// Cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);
