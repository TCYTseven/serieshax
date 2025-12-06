/**
 * Series Kafka Message Types
 * 
 * These types define the structure of messages exchanged with Series via Kafka
 * Updated to match Series API v2 format
 */

/**
 * Series API v2 Incoming SMS message from a user
 */
export interface SeriesIncomingMessage {
  api_version: string;
  created_at: string;
  event_id: string;
  event_type: 'message.received';
  data: {
    /** User's phone number (e.g., "+16463352994") */
    from_phone: string;
    /** The SMS/iMessage content */
    text: string;
    /** Unique message ID from Series */
    id: string;
    /** Chat ID */
    chat_id: string;
    /** Timestamp when message was sent */
    sent_at: string;
    /** Service type (iMessage, SMS, etc.) */
    service: string;
    /** Whether message has been read */
    is_read: boolean;
    /** Attachments array */
    attachments: unknown[];
    /** Chat participants */
    chat_handles: Array<{
      display_name: string;
      identifier: string;
      is_me: boolean;
    }>;
    /** Reaction ID if this is a reaction */
    reaction_id: string | null;
  };
}

/**
 * Legacy format (kept for backward compatibility)
 */
export interface IncomingMessage {
  event: 'message_received';
  data: {
    from: string;
    to: string;
    body: string;
    timestamp: string;
    messageId: string;
  };
}

/**
 * Outgoing SMS message to send to a user via Series
 */
export interface OutgoingMessage {
  event: 'send_message';
  data: {
    /** Recipient's phone number (e.g., "+1234567890") */
    to: string;
    /** The SMS message content to send */
    body: string;
  };
}

/**
 * Generic Kafka message wrapper
 */
export interface KafkaMessagePayload {
  event?: string;
  event_type?: string;
  data: Record<string, unknown>;
}

/**
 * Type guard to check if a message is a Series v2 incoming message
 */
export function isSeriesV2Message(message: KafkaMessagePayload): message is SeriesIncomingMessage {
  return message.event_type === 'message.received' &&
    typeof message.data === 'object' &&
    'from_phone' in message.data &&
    'text' in message.data;
}

/**
 * Type guard to check if a message is a legacy incoming SMS
 */
export function isIncomingMessage(message: KafkaMessagePayload): message is IncomingMessage {
  return message.event === 'message_received' &&
    typeof message.data === 'object' &&
    'from' in message.data &&
    'body' in message.data;
}

/**
 * Message processing result
 */
export interface ProcessingResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Parsed incoming message for easier handling (unified format)
 */
export interface ParsedIncomingMessage {
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  messageId: string;
  chatId: string;  // Important for sending replies via REST API
  service: string;
  rawMessage: SeriesIncomingMessage | IncomingMessage;
}

/**
 * Parse a Series v2 incoming message into a unified format
 */
export function parseSeriesV2Message(message: SeriesIncomingMessage): ParsedIncomingMessage {
  // Find the "to" number from chat_handles (the one that is_me: true)
  const toHandle = message.data.chat_handles.find(h => h.is_me);
  const toNumber = toHandle?.identifier || '';

  return {
    from: message.data.from_phone,
    to: toNumber,
    body: message.data.text,
    timestamp: new Date(message.data.sent_at),
    messageId: message.data.id,
    chatId: message.data.chat_id,  // Important for sending replies
    service: message.data.service,
    rawMessage: message,
  };
}

/**
 * Parse a legacy incoming message
 */
export function parseIncomingMessage(message: IncomingMessage): ParsedIncomingMessage {
  return {
    from: message.data.from,
    to: message.data.to,
    body: message.data.body,
    timestamp: new Date(message.data.timestamp),
    messageId: message.data.messageId,
    chatId: '', // Legacy format doesn't have chat_id
    service: 'SMS',
    rawMessage: message,
  };
}
