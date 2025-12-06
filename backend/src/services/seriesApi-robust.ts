/**
 * Robust Series REST API Client
 * With retry logic, rate limiting awareness, and exponential backoff
 */

import { env } from '../config/env';

const SERIES_API_BASE_URL = process.env.SERIES_API_URL || 'https://series-hackathon-service-202642739529.us-east1.run.app';

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * Rate limit tracker
 */
class RateLimitTracker {
  private lastRequestTime: number = 0;
  private minIntervalMs: number = 200; // Minimum 200ms between requests
  private backoffUntil: number = 0;

  async waitIfNeeded(): Promise<void> {
    // Check if we're in backoff period
    const now = Date.now();
    if (now < this.backoffUntil) {
      const waitTime = this.backoffUntil - now;
      console.log(`   ⏳ Rate limit backoff: waiting ${waitTime}ms`);
      await this.delay(waitTime);
    }

    // Ensure minimum interval between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minIntervalMs) {
      await this.delay(this.minIntervalMs - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
  }

  setBackoff(durationMs: number): void {
    this.backoffUntil = Date.now() + durationMs;
    console.log(`   ⚠️ Setting rate limit backoff for ${durationMs}ms`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const rateLimiter = new RateLimitTracker();

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;
  let delay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      // Wait for rate limiter
      await rateLimiter.waitIfNeeded();
      
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit error
      if (error.status === 429 || error.message?.includes('429')) {
        rateLimiter.setBackoff(delay * 2);
      }

      // Last attempt, throw
      if (attempt > config.maxRetries) {
        break;
      }

      console.log(`   ⚠️ ${operationName} attempt ${attempt} failed: ${error.message}`);
      console.log(`   🔄 Retrying in ${delay}ms...`);
      
      await sleep(delay);
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }

  throw lastError || new Error(`${operationName} failed after ${config.maxRetries} retries`);
}

/**
 * HTTP error class
 */
class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: string
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HttpError';
  }
}

/**
 * Make HTTP request with error handling
 */
async function makeRequest(
  url: string,
  options: RequestInit
): Promise<Response> {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const body = await response.text();
    throw new HttpError(response.status, response.statusText, body);
  }
  
  return response;
}

/**
 * Send a message to an existing chat with retry logic
 */
export async function sendMessageToChat(
  chatId: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.SERIES_API_KEY;
  
  if (!apiKey) {
    console.error('❌ SERIES_API_KEY not configured');
    return { success: false, error: 'SERIES_API_KEY not configured' };
  }

  const url = `${SERIES_API_BASE_URL}/api/chats/${chatId}/chat_messages`;
  
  console.log(`📤 Sending message to chat ${chatId}`);

  try {
    const response = await withRetry(
      async () => makeRequest(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: { text },
        }),
      }),
      'sendMessageToChat'
    );

    const data = await response.json() as { id?: number | string };
    console.log(`✅ Message sent to chat ${chatId}`);
    
    return { success: true, messageId: data.id?.toString() };
  } catch (error: any) {
    console.error(`❌ Failed to send message:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send a message WITHOUT retry logic (Fire and Forget)
 * Use this to prevent cascading failures when under load
 */
export async function sendMessageFireAndForget(
  chatId: string,
  text: string
): Promise<void> {
  const apiKey = process.env.SERIES_API_KEY;
  if (!apiKey) return;

  const url = `${SERIES_API_BASE_URL}/api/chats/${chatId}/chat_messages`;
  console.log(`🔥 Fire-and-forget to chat ${chatId}`);

  // No await on the promise chain - just launch it
  rateLimiter.waitIfNeeded().then(() => {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: { text },
      }),
    });
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.text();
      console.warn(`⚠️ Fire-and-forget failed (${res.status}): ${body.substring(0, 100)}`);
    } else {
      console.log(`✅ Fire-and-forget sent to ${chatId}`);
    }
  }).catch(err => {
    console.warn(`⚠️ Fire-and-forget error: ${err.message}`);
  });
}

/**
 * Create a new chat and send initial message with retry logic
 */
export async function createChatAndSendMessage(
  sendFrom: string,
  toPhoneNumber: string,
  text: string
): Promise<{ success: boolean; chatId?: string; messageId?: string; error?: string }> {
  const apiKey = process.env.SERIES_API_KEY;
  
  if (!apiKey) {
    console.error('❌ SERIES_API_KEY not configured');
    return { success: false, error: 'SERIES_API_KEY not configured' };
  }

  const url = `${SERIES_API_BASE_URL}/api/chats`;
  
  console.log(`📤 Creating chat: ${sendFrom} → ${toPhoneNumber}`);

  try {
    const response = await withRetry(
      async () => makeRequest(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          send_from: sendFrom,
          chat: { phone_numbers: [toPhoneNumber] },
          message: { text },
        }),
      }),
      'createChatAndSendMessage'
    );

    const data = await response.json() as { 
      id?: number | string; 
      chat?: { id?: number | string }; 
      message?: { id?: number | string } 
    };
    
    const chatId = (data.id || data.chat?.id)?.toString();
    console.log(`✅ Chat created: ${chatId}`);
    
    return { 
      success: true, 
      chatId,
      messageId: data.message?.id?.toString()
    };
  } catch (error: any) {
    console.error(`❌ Failed to create chat:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Start typing indicator (no retry - not critical)
 */
export async function startTypingIndicator(chatId: string): Promise<boolean> {
  const apiKey = process.env.SERIES_API_KEY;
  if (!apiKey) return false;

  try {
    await rateLimiter.waitIfNeeded();
    const response = await fetch(`${SERIES_API_BASE_URL}/api/chats/${chatId}/start_typing`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Stop typing indicator (no retry - not critical)
 */
export async function stopTypingIndicator(chatId: string): Promise<boolean> {
  const apiKey = process.env.SERIES_API_KEY;
  if (!apiKey) return false;

  try {
    await rateLimiter.waitIfNeeded();
    const response = await fetch(`${SERIES_API_BASE_URL}/api/chats/${chatId}/stop_typing`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Mark chat as read
 */
export async function markChatAsRead(chatId: string): Promise<boolean> {
  const apiKey = process.env.SERIES_API_KEY;
  if (!apiKey) return false;

  try {
    await rateLimiter.waitIfNeeded();
    const response = await fetch(`${SERIES_API_BASE_URL}/api/chats/${chatId}/mark_as_read`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if Series API is configured
 */
export function isSeriesApiConfigured(): boolean {
  return !!process.env.SERIES_API_KEY;
}

/**
 * Get API status
 */
export function getApiStatus(): { configured: boolean; baseUrl: string } {
  return {
    configured: isSeriesApiConfigured(),
    baseUrl: SERIES_API_BASE_URL,
  };
}

export const seriesApiRobust = {
  sendMessageToChat,
  sendMessageFireAndForget,
  createChatAndSendMessage,
  startTypingIndicator,
  stopTypingIndicator,
  markChatAsRead,
  isSeriesApiConfigured,
  getApiStatus,
};
