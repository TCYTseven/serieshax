/**
 * Social Oracle Backend - Server Only Mode
 * 
 * Runs the backend services WITHOUT Kafka consumer.
 * Includes Express API server for frontend event creation.
 */

import express from 'express';
import cors from 'cors';
import { isSupabaseConfigured } from './config/supabase';
import { isOpenAIConfigured } from './services';
import eventCreationRouter from './api/eventCreation';

const PORT = process.env.PORT || 3001;

console.log('');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║           🔮 SOCIAL ORACLE BACKEND                        ║');
console.log('║           Server Only Mode (No Kafka)                     ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');

async function main(): Promise<void> {
  console.log('🚀 Starting Backend Server (Kafka DISABLED)...\n');

  // Log configuration status
  console.log('📋 Configuration:');
  console.log(`   Supabase: ${isSupabaseConfigured() ? '✅ Configured' : '⚠️ Not configured'}`);
  console.log(`   OpenAI: ${isOpenAIConfigured() ? '✅ Configured' : '⚠️ Not configured'}`);
  console.log(`   Kafka: ❌ DISABLED`);
  console.log('');

  // Initialize Express
  const app = express();

  // Middleware
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'social-oracle-backend',
      timestamp: new Date().toISOString(),
      config: {
        supabase: isSupabaseConfigured(),
        openai: isOpenAIConfigured(),
        kafka: false,
      },
    });
  });

  // API Routes
  app.use('/api/events', eventCreationRouter);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Social Oracle Backend',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        createEvent: 'POST /api/events/create',
        testEvent: 'POST /api/events/test',
        eventHealth: '/api/events/health',
      },
    });
  });

  // Start server
  app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Backend server is running on port ${PORT}!`);
    console.log(`🌐 API: http://localhost:${PORT}`);
    console.log(`📦 Supabase: Ready for database operations`);
    console.log('🚫 Kafka: Disabled (no SMS processing)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n💡 API Endpoints:');
    console.log(`   GET  http://localhost:${PORT}/health`);
    console.log(`   POST http://localhost:${PORT}/api/events/create`);
    console.log(`   POST http://localhost:${PORT}/api/events/test`);
    console.log('');
  });
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

main().catch(console.error);
