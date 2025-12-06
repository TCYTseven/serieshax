import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { seriesProducer } from './kafka/producer';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

/**
 * POST /api/send-sms
 * Send an SMS message via Kafka
 */
app.post('/api/send-sms', async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to, message' 
      });
    }

    // Connect producer if not already connected
    if (!seriesProducer.isProducerConnected()) {
      await seriesProducer.connect();
    }

    // Send message via Kafka
    await seriesProducer.sendMessage(to, message);

    res.json({ 
      success: true, 
      message: 'SMS sent successfully' 
    });
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to send SMS' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Backend HTTP server running on port ${PORT}`);
  });
}

export default app;

