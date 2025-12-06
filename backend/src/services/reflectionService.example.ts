/**
 * Example usage of replyToReflection function
 * 
 * This demonstrates how to use the reflection service in your Kafka message handler
 * or API routes.
 */

import { replyToReflection, getUserReflections } from './reflectionService';
import { getOrCreateUser } from './userService';
import { sendMessageToChat, createChatAndSendMessage } from './seriesApi';
import { kafkaConfig } from '../config/kafka';

/**
 * Example 1: Process a reflection from a Kafka message
 */
export async function exampleProcessReflectionFromKafka(
  phoneNumber: string,
  reflectionText: string,
  chatId?: string
): Promise<void> {
  // Get or create user
  const user = await getOrCreateUser(phoneNumber);
  
  // Process the reflection
  // This will:
  // 1. Save the RAW REFLECTION to database
  // 2. Generate 1-2 meaningful follow-up questions via LLM
  // 3. Generate ANALYSIS of the reflection via LLM
  // 4. Update the reflection entry with ANALYSIS
  const result = await replyToReflection({
    user_id: user.id,
    raw_reflection: reflectionText,
  });
  
  // Send follow-up questions to user via SMS
  const followUpText = result.followUpQuestions.join('\n\n');
  
  if (chatId) {
    await sendMessageToChat(chatId, followUpText);
  } else {
    await createChatAndSendMessage(
      kafkaConfig.senderNumber,
      phoneNumber,
      followUpText
    );
  }
  
  console.log(`Reflection processed! ID: ${result.reflection.id}`);
  console.log(`Analysis: ${result.analysis}`);
}

/**
 * Example 2: Get user's reflection history
 */
export async function exampleGetUserReflections(userId: string): Promise<void> {
  const reflections = await getUserReflections(userId, 10);
  
  console.log(`User has ${reflections.length} reflections:`);
  reflections.forEach(reflection => {
    console.log(`- ${reflection.raw_reflection.substring(0, 50)}...`);
    console.log(`  Analysis: ${reflection.analysis?.substring(0, 50)}...`);
  });
}

/**
 * Example 3: Detect if a message is a reflection
 * You can customize this logic based on your needs
 */
export function exampleIsReflection(message: string): boolean {
  const lower = message.toLowerCase().trim();
  
  // Option 1: Check for reflection keywords
  const reflectionKeywords = [
    'reflection',
    'reflecting',
    'i learned',
    'i realized',
    'looking back',
    'today i',
  ];
  
  if (reflectionKeywords.some(keyword => lower.includes(keyword))) {
    return true;
  }
  
  // Option 2: Check message length (reflections are usually longer)
  if (message.length > 100 && message.split(' ').length > 15) {
    return true;
  }
  
  // Option 3: Check for specific patterns
  if (/^reflection:/i.test(message) || /^i'm reflecting/i.test(message)) {
    return true;
  }
  
  return false;
}

/**
 * Example 4: Trigger reflection after a meetup
 * This could be called after a meetup is marked as completed
 */
export async function exampleTriggerReflectionAfterMeetup(
  userId: string,
  phoneNumber: string,
  meetupTitle: string,
  chatId?: string
): Promise<void> {
  // Prompt user to reflect
  const prompt = `How was "${meetupTitle}"? Share your thoughts - what stood out to you?`;
  
  if (chatId) {
    await sendMessageToChat(chatId, prompt);
  } else {
    await createChatAndSendMessage(
      kafkaConfig.senderNumber,
      phoneNumber,
      prompt
    );
  }
  
  // When user responds, use exampleProcessReflectionFromKafka to process it
}

