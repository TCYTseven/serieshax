import express, { Request, Response } from 'express';
import cors from 'cors';
import { seriesProducer } from './kafka/producer';
import { getSupabaseClient } from './config/supabase';

const app = express();

// Enable CORS for frontend
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false,
}));

app.use(express.json());

/**
 * Format event information into a text message
 */
function formatEventMessage(event: {
  name: string;
  type: string;
  description: string;
  price?: string;
  distance?: string;
}): string {
  let message = `🎉 Event Agent Activated!\n\n`;
  message += `📍 ${event.name}\n`;
  message += `Type: ${event.type}\n`;
  if (event.price) {
    message += `Price: ${event.price}\n`;
  }
  if (event.distance) {
    message += `Distance: ${event.distance}\n`;
  }
  message += `\n${event.description}\n\n`;
  message += `Ready to help you plan your night out! 🚀`;

  return message;
}

/**
 * API endpoint to activate event agent
 * POST /api/activate-event-agent
 */
app.post('/api/activate-event-agent', async (req: Request, res: Response) => {
  try {
    const { event, userId } = req.body;

    if (!event || !userId) {
      return res.status(400).json({
        error: 'Missing event or userId',
      });
    }

    // Get user's phone number from Supabase
    const supabase = getSupabaseClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return res.status(500).json({
        error: 'Failed to fetch user profile',
      });
    }

    if (!profile.phone_number) {
      return res.status(400).json({
        error: 'User phone number not found in profile',
      });
    }

    // Format the event message
    const messageText = formatEventMessage(event);

    // Send message via Kafka
    const result = await seriesProducer.sendMessage(profile.phone_number, messageText);

    console.log('✅ Event agent message sent via Kafka');
    console.log(`   To: ${profile.phone_number}`);
    console.log(`   Partition: ${result[0].partition}`);
    console.log(`   Offset: ${result[0].offset}`);

    return res.json({
      success: true,
      message: 'Event agent activated and message sent',
      partition: result[0].partition,
      offset: result[0].offset,
    });
  } catch (error) {
    console.error('Error activating event agent:', error);
    return res.status(500).json({
      error: 'Failed to activate event agent',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

export function startServer(port: number = 3001): void {
  app.listen(port, () => {
    console.log(`🌐 HTTP server running on port ${port}`);
    console.log(`   API endpoint: http://localhost:${port}/api/activate-event-agent`);
  });
}

