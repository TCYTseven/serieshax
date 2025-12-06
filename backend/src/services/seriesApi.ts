/**
 * Series REST API Client
 * For sending messages via the Series iMessage API
 */

import { env } from '../config/env';

// Series Hackathon API base URL
const SERIES_API_BASE_URL = process.env.SERIES_API_URL || 'https://series-hackathon-service-202642739529.us-east1.run.app';

console.log(`📡 Series API URL: ${SERIES_API_BASE_URL}`);

/**
 * Send a message to an existing chat
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
  
  console.log(`📤 Sending message via REST API to chat ${chatId}`);
  console.log(`   URL: ${url}`);
  console.log(`   Text: "${text.substring(0, 50)}..."`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          text: text,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Series API error: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      return { success: false, error: `${response.status}: ${errorText}` };
    }

    const data = await response.json() as { id?: number | string };
    console.log(`✅ Message sent successfully via REST API`);
    console.log(`   Response:`, JSON.stringify(data).substring(0, 200));
    
    return { success: true, messageId: data.id?.toString() };
  } catch (error: any) {
    console.error(`❌ Failed to send message via REST API:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new chat and send initial message
 * Use this if you don't have a chat_id yet
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
  
  console.log(`📤 Creating chat and sending message via REST API`);
  console.log(`   From: ${sendFrom}`);
  console.log(`   To: ${toPhoneNumber}`);
  console.log(`   Text: "${text.substring(0, 50)}..."`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        send_from: sendFrom,
        chat: {
          phone_numbers: [toPhoneNumber],
        },
        message: {
          text: text,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Series API error: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      return { success: false, error: `${response.status}: ${errorText}` };
    }

    const data = await response.json() as { 
      id?: number | string; 
      chat?: { id?: number | string }; 
      message?: { id?: number | string } 
    };
    console.log(`✅ Chat created and message sent via REST API`);
    console.log(`   Chat ID: ${data.id || data.chat?.id}`);
    
    return { 
      success: true, 
      chatId: (data.id || data.chat?.id)?.toString(),
      messageId: data.message?.id?.toString()
    };
  } catch (error: any) {
    console.error(`❌ Failed to create chat and send message:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Start typing indicator
 */
export async function startTypingIndicator(chatId: string): Promise<boolean> {
  const apiKey = process.env.SERIES_API_KEY;
  if (!apiKey) return false;

  try {
    const response = await fetch(`${SERIES_API_BASE_URL}/api/chats/${chatId}/start_typing`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Stop typing indicator
 */
export async function stopTypingIndicator(chatId: string): Promise<boolean> {
  const apiKey = process.env.SERIES_API_KEY;
  if (!apiKey) return false;

  try {
    const response = await fetch(`${SERIES_API_BASE_URL}/api/chats/${chatId}/stop_typing`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
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
    const response = await fetch(`${SERIES_API_BASE_URL}/api/chats/${chatId}/mark_as_read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
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
