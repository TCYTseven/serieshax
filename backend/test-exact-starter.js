// EXACT copy of CORRECT Series starter code - using SASL Username

const { Kafka } = require('kafkajs');

// Kafka Configuration
const kafka = new Kafka({
  clientId: 'team-client-ea5cc23f325342af8ce44698138ec42d',
  brokers: 'pkc-619z3.us-east1.gcp.confluent.cloud:9092'.split(','),
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: 'QRHNR6BCKVHD4M3U',
    password: 'cfltTIivf3OHq6tr9fpASLxV4pp7vzPfvnz3cwT8+NAoOAJUCZwRuxuk1sSZTK+w'
  }
});

const consumer = kafka.consumer({ 
  groupId: 'team-cg-ea5cc23f325342af8ce44698138ec42d'
});

async function consumeMessages() {
  await consumer.connect();
  await consumer.subscribe({ 
    topic: 'team.team.ea5cc23f325342af8ce44698138ec42d',
    fromBeginning: true 
  });

  console.log('✅ Connected to Kafka!');
  console.log('Listening to topic: team.team.ea5cc23f325342af8ce44698138ec42d');
  console.log('Waiting for messages... (Press Ctrl+C to stop)');

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log('\n📨 Received message:');
      console.log('Topic:', topic);
      console.log('Partition:', partition);
      console.log('Offset:', message.offset);
      console.log('Value:', message.value.toString());
    }
  });
}

consumeMessages().catch(console.error);
