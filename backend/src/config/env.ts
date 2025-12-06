import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Environment variable schema with validation
 * Kafka variables are optional for server-only mode (API without SMS processing)
 */
const envSchema = z.object({
  // Kafka Configuration (optional for API-only mode)
  KAFKA_BOOTSTRAP_SERVERS: z.string().optional().default(''),
  KAFKA_TOPIC: z.string().optional().default(''),
  KAFKA_CONSUMER_GROUP: z.string().optional().default(''),
  KAFKA_CLIENT_ID: z.string().optional().default(''),
  
  // SASL Authentication (Confluent Cloud / Series) - optional for API-only mode
  KAFKA_SASL_USERNAME: z.string().optional().default(''),
  KAFKA_SASL_PASSWORD: z.string().optional().default(''),
  KAFKA_SASL_MECHANISM: z.enum(['PLAIN', 'SCRAM-SHA-256', 'SCRAM-SHA-512']).default('PLAIN'),

  // Series SMS (optional for API-only mode)
  SERIES_SENDER_NUMBER: z.string().optional().default(''),

  // Supabase Configuration
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // OpenAI Configuration
  OPENAI_API_KEY: z.string().optional(),

  // Server Configuration
  PORT: z.string().optional().default('3001'),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Validated environment variables
 */
function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
}

export const env = validateEnv();

/**
 * Check if Kafka is configured (for SMS processing)
 */
export function isKafkaConfigured(): boolean {
  return !!(
    env.KAFKA_BOOTSTRAP_SERVERS &&
    env.KAFKA_TOPIC &&
    env.KAFKA_CONSUMER_GROUP &&
    env.KAFKA_CLIENT_ID &&
    env.KAFKA_SASL_USERNAME &&
    env.KAFKA_SASL_PASSWORD
  );
}

export type Env = z.infer<typeof envSchema>;
