/**
 * Reflection Service
 * Handles storing and retrieving user reflections
 */

import { getSupabaseClient } from '../config/supabase';
import { generateResponse } from './oracleService';
import { ConversationMessage } from '../types/database';

export interface Reflection {
  id: string;
  user_id: string;
  raw_reflection: string;
  analysis: string | null;
  follow_up_questions: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReflectionInput {
  user_id: string;
  raw_reflection: string;
  analysis?: string;
  follow_up_questions?: string[];
}

/**
 * Check if a message is requesting to reflect
 */
export function isReflectionRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes('to reflect') || 
         lowerMessage.includes('i want to reflect') ||
         lowerMessage.includes('reflect on');
}

/**
 * Generate a prompt asking for more reflection details
 */
export function generateReflectionPrompt(): string {
  return "I'd love to help you reflect! Please share what's on your mind - what experience, thought, or moment would you like to reflect on? Take your time and write as much or as little as feels right.";
}

/**
 * Check if the last assistant message was asking for reflection details
 */
export function isWaitingForReflection(conversationHistory: ConversationMessage[]): boolean {
  if (conversationHistory.length === 0) return false;
  
  // Check the last assistant message
  const lastMessages = [...conversationHistory].reverse();
  const lastAssistantMessage = lastMessages.find(msg => msg.role === 'assistant');
  
  if (!lastAssistantMessage) return false;
  
  const content = lastAssistantMessage.content.toLowerCase();
  return content.includes('reflect') && 
         (content.includes('share') || content.includes('what') || content.includes('experience'));
}

/**
 * Generate analysis for a reflection using AI
 */
export async function generateReflectionAnalysis(
  rawReflection: string,
  conversationHistory: ConversationMessage[] = []
): Promise<{ analysis: string; followUpQuestions: string[] }> {
  const prompt = `You are a social discovery AI helping users reflect on their social experiences, connections, and moments. This is NOT about professional networking or career goals - it's about personal growth, social connections, friendships, experiences, and discovering oneself through social interactions.

The user has shared a personal reflection about a social experience. Please provide:
1. A thoughtful, warm analysis of their reflection (2-3 sentences) - focus on the social/emotional aspects, connections made, personal growth, or meaningful moments
2. 2-3 follow-up questions to help them dive deeper into their social experience - ask about feelings, connections, what they learned about themselves, or how the experience impacted them personally

Keep it casual, friendly, and focused on social discovery and personal reflection - NOT professional networking, career advice, or business connections.

User's reflection: "${rawReflection}"

Respond in this format:
ANALYSIS: [your analysis here]
QUESTIONS:
- [question 1]
- [question 2]
- [question 3]`;

  try {
    const response = await generateResponse(prompt, conversationHistory);
    
    // Parse the response
    const analysisMatch = response.match(/ANALYSIS:\s*(.+?)(?=QUESTIONS:|$)/is);
    const questionsMatch = response.match(/QUESTIONS:\s*((?:-.*\n?)+)/is);
    
    let analysis = response;
    let followUpQuestions: string[] = [];
    
    if (analysisMatch) {
      analysis = analysisMatch[1].trim();
    }
    
    if (questionsMatch) {
      const questionsText = questionsMatch[1];
      followUpQuestions = questionsText
        .split('\n')
        .map(q => q.replace(/^-\s*/, '').trim())
        .filter(q => q.length > 0)
        .slice(0, 3); // Limit to 3 questions
    }
    
    // If parsing failed, use the whole response as analysis
    if (!analysisMatch && !questionsMatch) {
      analysis = response;
      followUpQuestions = [
        "What emotions did this experience bring up for you?",
        "How might this reflection influence your future actions?",
        "What would you tell a friend who had a similar experience?"
      ];
    }
    
    return { analysis, followUpQuestions };
  } catch (error) {
    console.error('Error generating reflection analysis:', error);
    // Fallback analysis
    return {
      analysis: "Thank you for sharing your reflection. This is a meaningful moment to pause and consider your experience.",
      followUpQuestions: [
        "What stands out most to you about this experience?",
        "How do you feel about it now?",
        "What would you like to explore further?"
      ]
    };
  }
}

/**
 * Create a reflection in the database
 */
export async function createReflection(
  input: CreateReflectionInput
): Promise<Reflection> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('reflections')
    .insert({
      user_id: input.user_id,
      raw_reflection: input.raw_reflection,
      analysis: input.analysis || null,
      follow_up_questions: input.follow_up_questions || null,
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create reflection: ${error.message}`);
  }
  
  return data;
}

/**
 * Get reflections for a user
 */
export async function getUserReflections(
  userId: string,
  limit: number = 50
): Promise<Reflection[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    throw new Error(`Failed to get reflections: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get a reflection by ID
 */
export async function getReflectionById(reflectionId: string): Promise<Reflection | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .eq('id', reflectionId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get reflection: ${error.message}`);
  }
  
  return data;
}

