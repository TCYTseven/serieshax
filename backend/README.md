# Social Oracle Backend

Kafka-powered backend for the Social Oracle SMS service, built for the Series hackathon.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your Series credentials

# Start the consumer
npm run dev
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── index.ts           # Entry point - starts consumer & producer
│   ├── config/
│   │   ├── env.ts         # Environment validation with Zod
│   │   └── kafka.ts       # Kafka client configuration
│   └── kafka/
│       ├── types.ts       # Message type definitions
│       ├── consumer.ts    # Kafka consumer (receives SMS)
│       ├── producer.ts    # Kafka producer (sends SMS)
│       └── test-producer.ts # Test script for sending messages
├── .env                   # Your credentials (don't commit!)
├── .env.example           # Template for credentials
├── package.json
└── tsconfig.json
```

## 🔑 Required Credentials

Get these from your [Series Dashboard](https://series.dev):

| Variable | Description | Example |
|----------|-------------|---------|
| `KAFKA_BOOTSTRAP_SERVERS` | Confluent Cloud broker | `pkc-619z3.us-east1.gcp.confluent.cloud:9092` |
| `KAFKA_TOPIC` | Your team's topic | `team.team.ea5cc23f...` |
| `KAFKA_CONSUMER_GROUP` | Consumer group ID | `team-cg-ea5cc23f...` |
| `KAFKA_CLIENT_ID` | Client identifier | `team-client-ea5cc23f...` |
| `KAFKA_SASL_USERNAME` | Confluent API Key | `QRHNR6BCKVHD4M3U` |
| `KAFKA_SASL_PASSWORD` | Confluent API Secret | *Get from dashboard* |
| `SERIES_SENDER_NUMBER` | Your Series SMS number | `+16463450518` |

## 📨 Message Types

### Incoming SMS (from users)
```typescript
interface IncomingMessage {
  event: 'message_received';
  data: {
    from: string;        // User phone number
    to: string;          // Series number
    body: string;        // Message content
    timestamp: string;   // ISO timestamp
    messageId: string;   // Unique ID
  };
}
```

### Outgoing SMS (to users)
```typescript
interface OutgoingMessage {
  event: 'send_message';
  data: {
    to: string;          // Recipient phone
    body: string;        // Message text
  };
}
```

## 📜 Scripts

```bash
# Start the consumer (development)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Test sending a message
npm run test:producer "+1234567890" "Test message"
```

## 🧪 Testing

1. Start the backend: `npm run dev`
2. Send an SMS to your Series number (`+16463450518`)
3. Watch the console for incoming message logs
4. Test outgoing messages: `npm run test:producer "+yourphone" "Hello!"`

## 🔍 Troubleshooting

### Authentication Failed
```
SASL PLAIN authentication failed: Authentication failed
```
**Solution:** Your `KAFKA_SASL_PASSWORD` is incorrect. This should be the **API Secret** from Confluent, not the API Key. Check your Series dashboard for the correct secret.

### Connection Timeout
```
Connection timeout
```
**Solution:** Check your internet connection and firewall settings. Confluent Cloud requires port 9092 to be accessible.

### Topic Not Found
```
This server does not host this topic-partition
```
**Solution:** Verify your `KAFKA_TOPIC` is correct and matches your team's assigned topic.

## 📝 Next Steps (Phase 3.2)

- [ ] Implement message processing logic
- [ ] Add Supabase integration for user data
- [ ] Connect OpenAI for intelligent responses
- [ ] Add rate limiting and error handling
