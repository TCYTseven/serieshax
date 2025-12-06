import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Environment variable schema with validation
 */
const envSchema = z.object({
  // Kafka Configuration
  KAFKA_BOOTSTRAP_SERVERS: z.string().min(1, 'KAFKA_BOOTSTRAP_SERVERS is required'),
  KAFKA_TOPIC: z.string().min(1, 'KAFKA_TOPIC is required'),
  KAFKA_CONSUMER_GROUP: z.string().min(1, 'KAFKA_CONSUMER_GROUP is required'),
  KAFKA_CLIENT_ID: z.string().min(1, 'KAFKA_CLIENT_ID is required'),
  
  // SASL Authentication (Confluent Cloud / Series)
  // Username: Usually the API Key from Confluent (e.g., QRHNR6BCKVHD4M3U)
  KAFKA_SASL_USERNAME: z.string().min(1, 'KAFKA_SASL_USERNAME is required'),
  // Password: The API Secret from Confluent (get this from your Series dashboard)
  KAFKA_SASL_PASSWORD: z.string().min(1, 'KAFKA_SASL_PASSWORD is required'),
  KAFKA_SASL_MECHANISM: z.enum(['PLAIN', 'SCRAM-SHA-256', 'SCRAM-SHA-512']).default('PLAIN'),

  // Series SMS
  SERIES_SENDER_NUMBER: z.string().min(1, 'SERIES_SENDER_NUMBER is required'),

  // Supabase Configuration
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // OpenAI Configuration
  OPENAI_API_KEY: z.string().optional(),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // HTTP Server
  PORT: z.string().optional(),
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

export type Env = z.infer<typeof envSchema>;
