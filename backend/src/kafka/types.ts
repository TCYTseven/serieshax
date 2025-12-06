/**
 * Series Kafka Message Types
 * 
 * These types define the structure of messages exchanged with Series via Kafka
 */

/**
 * Incoming SMS message from a user via Series
 */
export interface IncomingMessage {
  event: 'message_received';
  data: {
    /** User's phone number (e.g., "+1234567890") */
    from: string;
    /** Series number that received the message */
    to: string;
    /** The SMS message content */
    body: string;
    /** ISO timestamp of when the message was received */
    timestamp: string;
    /** Unique identifier for this message */
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
  event: string;
  data: Record<string, unknown>;
}

/**
 * Type guard to check if a message is an incoming SMS
 */
export function isIncomingMessage(message: KafkaMessagePayload): message is IncomingMessage {
  return message.event === 'message_received' &&
    typeof message.data === 'object' &&
    'from' in message.data &&
    'to' in message.data &&
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
 * Parsed incoming message for easier handling
 */
export interface ParsedIncomingMessage {
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  messageId: string;
  rawMessage: IncomingMessage;
}

/**
 * Parse an incoming message into a more usable format
 */
export function parseIncomingMessage(message: IncomingMessage): ParsedIncomingMessage {
  return {
    from: message.data.from,
    to: message.data.to,
    body: message.data.body,
    timestamp: new Date(message.data.timestamp),
    messageId: message.data.messageId,
    rawMessage: message,
  };
}
