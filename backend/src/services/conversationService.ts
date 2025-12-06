/**
 * Conversation Service
 * Handles Conversation + Message management
 */

import { getSupabaseClient } from '../config/supabase';
import { 
  Conversation, 
  ConversationMessage, 
  ConversationWithMessages,
  UserIntent,
  CreateMessageInput
} from '../types/database';

/**
 * Get or create a conversation for a user
 * Returns active conversation if exists, otherwise creates new one
 */
export async function getOrCreateConversation(
  userId: string,
  seriesConversationId?: string
): Promise<Conversation> {
  const supabase = getSupabaseClient();
  
  // Look for existing active conversation (within last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: existingConversation, error: findError } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .gte('last_message_at', oneDayAgo)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .single();

  if (existingConversation && !findError) {
    // Update last_message_at but PRESERVE context_data
    const { data: updated, error: updateError } = await supabase
      .from('conversations')
      .update({ 
        last_message_at: new Date().toISOString(),
        series_conversation_id: seriesConversationId || existingConversation.series_conversation_id,
        // Preserve context_data - don't overwrite it
        context_data: existingConversation.context_data || {}
      })
      .eq('id', existingConversation.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating conversation:', updateError);
      return existingConversation;
    }

    return updated;
  }

  // Create new conversation
  const { data: newConversation, error: createError } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      series_conversation_id: seriesConversationId || null,
      current_intent: 'general',
      context_data: {},
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create conversation: ${createError.message}`);
  }

  console.log(`✅ Created new conversation: ${newConversation.id} for user ${userId}`);
  return newConversation;
}

/**
 * Get a conversation by ID
 */
export async function getConversationById(
  conversationId: string
): Promise<Conversation | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get conversation: ${error.message}`);
  }

  return data;
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  oracleResponse?: Record<string, unknown>,
  kafkaEventsEmitted?: string[]
): Promise<ConversationMessage> {
  const supabase = getSupabaseClient();
  
  const messageData: CreateMessageInput = {
    conversation_id: conversationId,
    role,
    content,
    oracle_response: oracleResponse || null,
    kafka_events_emitted: kafkaEventsEmitted || [],
  };

  const { data, error } = await supabase
    .from('conversation_messages')
    .insert(messageData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add message: ${error.message}`);
  }

  // Update conversation last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
}

/**
 * Get conversation history (recent messages)
 */
export async function getConversationHistory(
  conversationId: string,
  limit: number = 20
): Promise<ConversationMessage[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get conversation history: ${error.message}`);
  }

  // Return in chronological order
  return (data || []).reverse();
}

/**
 * Get full conversation with messages
 */
export async function getConversationWithMessages(
  conversationId: string,
  messageLimit: number = 50
): Promise<ConversationWithMessages | null> {
  const supabase = getSupabaseClient();
  
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get conversation: ${error.message}`);
  }

  const messages = await getConversationHistory(conversationId, messageLimit);

  return {
    ...conversation,
    messages,
  };
}

/**
 * Update the current intent of a conversation
 */
export async function updateConversationIntent(
  conversationId: string,
  intent: UserIntent
): Promise<Conversation> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('conversations')
    .update({ 
      current_intent: intent,
      last_message_at: new Date().toISOString()
    })
    .eq('id', conversationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update conversation intent: ${error.message}`);
  }

  console.log(`✅ Updated conversation ${conversationId} intent to: ${intent}`);
  return data;
}

/**
 * Update conversation context data
 */
export async function updateConversationContext(
  conversationId: string,
  contextData: Record<string, unknown>
): Promise<Conversation> {
  const supabase = getSupabaseClient();
  
  // Get current context
  const current = await getConversationById(conversationId);
  if (!current) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  // Merge context
  const mergedContext = {
    ...(current.context_data || {}),
    ...contextData,
  };

  const { data, error } = await supabase
    .from('conversations')
    .update({ 
      context_data: mergedContext,
      last_message_at: new Date().toISOString()
    })
    .eq('id', conversationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update conversation context: ${error.message}`);
  }

  return data;
}

/**
 * Get recent conversations for a user
 */
export async function getUserConversations(
  userId: string,
  limit: number = 10
): Promise<Conversation[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get user conversations: ${error.message}`);
  }

  return data || [];
}

/**
 * Delete old conversations (cleanup)
 */
export async function cleanupOldConversations(
  daysOld: number = 30
): Promise<number> {
  const supabase = getSupabaseClient();
  
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('conversations')
    .delete()
    .lt('last_message_at', cutoffDate)
    .select('id');

  if (error) {
    throw new Error(`Failed to cleanup conversations: ${error.message}`);
  }

  const count = data?.length || 0;
  if (count > 0) {
    console.log(`🧹 Cleaned up ${count} old conversations`);
  }

  return count;
}
