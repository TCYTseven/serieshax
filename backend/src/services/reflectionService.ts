/**
 * Reflection Service
 * Handles user reflections with AI-powered follow-up questions and analysis
 */

import { getSupabaseClient } from '../config/supabase';
import { Reflection, CreateReflectionInput } from '../types/database';
import OpenAI from 'openai';
import { env } from '../config/env';

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * System prompt for generating meaningful follow-up questions
 */
const FOLLOW_UP_PROMPT = `You are a warm, supportive friend helping someone reflect on their experiences. 
The user said they want to reflect, so respond with an encouraging message that invites them to share.

Guidelines:
- Be warm, friendly, and encouraging
- Acknowledge their desire to reflect positively
- Invite them to share their experience naturally
- Keep it concise (under 150 characters total)
- Sound like a caring friend, not a therapist
- Return ONLY the response message, no questions marks or formatting

Example responses:
"That sounds great! Tell me how your night went, and I'll be sure to listen and help you reflect."
"I'd love to hear about it! Share what happened and how you're feeling."
"Absolutely! Walk me through what happened - I'm here to listen."

Generate an encouraging response to invite them to share their reflection:`;

/**
 * System prompt for analyzing reflections
 */
const ANALYSIS_PROMPT = `You are an insightful AI that analyzes personal reflections. 
Your goal is to provide a thoughtful, empathetic analysis of the user's reflection.

Guidelines:
- Be empathetic and understanding
- Identify key themes, emotions, or insights
- Highlight what seems meaningful or significant
- Keep it concise but meaningful (2-4 sentences)
- Focus on understanding, not judgment
- Be warm and supportive

Provide a thoughtful analysis of this reflection:`;

/**
 * Generate meaningful follow-up questions using OpenAI
 */
async function generateFollowUpQuestions(
  rawReflection: string
): Promise<string[]> {
  if (!env.OPENAI_API_KEY) {
    // Fallback: return encouraging message
    return [
      "That sounds great! Tell me how your night went, and I'll be sure to listen and help you reflect."
    ];
  }

  try {
    const openai = getOpenAI();
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: FOLLOW_UP_PROMPT },
        { role: 'user', content: rawReflection }
      ],
      max_tokens: 150,
      temperature: 0.8,
    });

    const response = completion.choices[0]?.message?.content?.trim();
    
    if (!response) {
      return [
        "That sounds great! Tell me how your night went, and I'll be sure to listen and help you reflect."
      ];
    }

    // Return as single message (not multiple questions)
    // Clean up the response - remove quotes, extra formatting
    const cleanResponse = response
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();

    return [cleanResponse || "That sounds great! Tell me how your night went, and I'll be sure to listen and help you reflect."];

  } catch (error) {
    console.error('Error generating follow-up questions:', error);
    return [
      "That sounds great! Tell me how your night went, and I'll be sure to listen and help you reflect."
    ];
  }
}

/**
 * Generate analysis of the reflection using OpenAI
 */
async function generateAnalysis(rawReflection: string): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    // Fallback: return generic analysis
    return "Thank you for sharing this reflection. It seems like a meaningful experience that's worth exploring further.";
  }

  try {
    const openai = getOpenAI();
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        { role: 'user', content: rawReflection }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      return "Thank you for sharing this reflection. It seems like a meaningful experience that's worth exploring further.";
    }

    return response.trim();

  } catch (error) {
    console.error('Error generating analysis:', error);
    return "Thank you for sharing this reflection. It seems like a meaningful experience that's worth exploring further.";
  }
}

/**
 * Main function: Process a reflection, generate follow-ups and analysis
 * 
 * Flow:
 * 1. Save the RAW REFLECTION to database
 * 2. Generate 1-2 meaningful follow-up questions via LLM
 * 3. Generate ANALYSIS of the reflection via LLM
 * 4. Update the reflection entry with ANALYSIS
 * 5. Return the follow-up questions (to be sent via SMS)
 */
export async function replyToReflection(
  input: CreateReflectionInput
): Promise<{
  reflection: Reflection;
  followUpQuestions: string[];
  analysis: string;
}> {
  const supabase = getSupabaseClient();
  
  console.log(`\n💭 Processing reflection from user ${input.user_id}:`);
  console.log(`   "${input.raw_reflection.substring(0, 100)}..."`);

  // Step 1: Save the RAW REFLECTION to database
  const { data: reflection, error: insertError } = await supabase
    .from('reflections')
    .insert({
      user_id: input.user_id,
      raw_reflection: input.raw_reflection,
      analysis: null,
      follow_up_questions: null,
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to save reflection: ${insertError.message}`);
  }

  console.log(`   ✅ Saved raw reflection (ID: ${reflection.id})`);

  // Step 2: Generate follow-up questions (1-2 prompts to LLM)
  console.log(`   🤔 Generating follow-up questions...`);
  const followUpQuestions = await generateFollowUpQuestions(input.raw_reflection);
  console.log(`   ✅ Generated ${followUpQuestions.length} follow-up questions`);

  // Step 3: Generate ANALYSIS of the reflection
  console.log(`   🔍 Generating analysis...`);
  const analysis = await generateAnalysis(input.raw_reflection);
  console.log(`   ✅ Generated analysis`);

  // Step 4: Update the reflection entry with ANALYSIS and follow-up questions
  const { data: updatedReflection, error: updateError } = await supabase
    .from('reflections')
    .update({
      analysis: analysis,
      follow_up_questions: followUpQuestions,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reflection.id)
    .select()
    .single();

  if (updateError) {
    console.error(`   ⚠️ Failed to update reflection with analysis: ${updateError.message}`);
    // Still return the reflection with analysis, even if update failed
    return {
      reflection: { ...reflection, analysis, follow_up_questions: followUpQuestions } as Reflection,
      followUpQuestions,
      analysis,
    };
  }

  console.log(`   ✅ Updated reflection with analysis and follow-up questions`);

  return {
    reflection: updatedReflection,
    followUpQuestions,
    analysis,
  };
}

/**
 * Get user's reflections
 */
export async function getUserReflections(
  userId: string,
  limit: number = 20
): Promise<Reflection[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get user reflections: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a specific reflection by ID
 */
export async function getReflection(reflectionId: string): Promise<Reflection | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .eq('id', reflectionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get reflection: ${error.message}`);
  }

  return data;
}

