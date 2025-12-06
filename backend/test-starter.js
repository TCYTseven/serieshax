// Install: npm install kafkajs

const { Kafka } = require('kafkajs');

// Kafka Configuration - EXACT copy from Series starter code
const kafka = new Kafka({
  clientId: 'team-client-ea5cc23f325342af8ce44698138ec42d',
  brokers: 'pkc-619z3.us-east1.gcp.confluent.cloud:9092'.split(','),
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: 'c9b13d09-3b16-4ff2-b1cf-82fb0cac8be1',
    password: 'cfltTIivf3OHq6tr9fpASLxV4pp7vzPfvnz3cwT8+NAoOAJUCZwRuxuk1sSZTK+w'
  }
});

const producer = kafka.producer();

async function sendMessage() {
  console.log('🔌 Attempting to connect to Kafka...');
  console.log('   Broker: pkc-619z3.us-east1.gcp.confluent.cloud:9092');
  console.log('   Username: c9b13d09-3b16-4ff2-b1cf-82fb0cac8be1');
  console.log('');
  
  await producer.connect();
  console.log('✅ Connected to Kafka!');
  
  const message = {
    event: 'test_message',
    data: {
      message: 'Hello from Oracle!',
      timestamp: new Date().toISOString()
    }
  };

  try {
    const result = await producer.send({
      topic: 'team.team.ea5cc23f325342af8ce44698138ec42d',
      messages: [
        {
          value: JSON.stringify(message)
        }
      ]
    });

    console.log('✅ Message sent successfully!');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Error sending message:', error);
  } finally {
    await producer.disconnect();
  }
}

sendMessage().catch(err => {
  console.error('❌ Failed to connect:', err.message);
  process.exit(1);
});
