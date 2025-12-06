/**
 * Kafka Diagnostic Tool
 * Checks consumer group membership and partition assignment
 */

import { kafka, kafkaConfig } from './config/kafka';

async function diagnose() {
  console.log('\n🔍 Kafka Diagnostic Tool\n');
  console.log('═'.repeat(50));

  const admin = kafka.admin();
  
  try {
    await admin.connect();
    console.log('✅ Connected to Kafka admin\n');

    // Get topic info
    console.log('📋 Topic Info:');
    const topics = await admin.fetchTopicMetadata({ topics: [kafkaConfig.topic] });
    const topicInfo = topics.topics[0];
    console.log(`   Topic: ${topicInfo.name}`);
    console.log(`   Partitions: ${topicInfo.partitions.length}`);
    topicInfo.partitions.forEach(p => {
      console.log(`     Partition ${p.partitionId}: Leader=${p.leader}`);
    });

    // Get consumer group info
    console.log('\n👥 Consumer Group Info:');
    const groups = await admin.describeGroups([kafkaConfig.consumerGroup]);
    const group = groups.groups[0];
    
    console.log(`   Group ID: ${group.groupId}`);
    console.log(`   State: ${group.state}`);
    console.log(`   Protocol: ${group.protocol}`);
    console.log(`   Members: ${group.members.length}`);
    
    if (group.members.length > 0) {
      console.log('\n   📍 Member Details:');
      group.members.forEach((member, i) => {
        console.log(`\n   Member ${i + 1}:`);
        console.log(`     Client ID: ${member.clientId}`);
        console.log(`     Member ID: ${member.memberId.substring(0, 50)}...`);
        console.log(`     Client Host: ${member.clientHost}`);
        
        // Parse assignment
        if (member.memberAssignment) {
          try {
            // KafkaJS encodes assignment, try to decode
            const assignment = member.memberAssignment;
            console.log(`     Assignment: ${assignment.length} bytes`);
          } catch {
            console.log(`     Assignment: (encoded)`);
          }
        }
      });
    }

    // Check for other consumer groups with similar names
    console.log('\n🔎 All Consumer Groups (looking for similar):');
    const allGroups = await admin.listGroups();
    const related = allGroups.groups.filter(g => 
      g.groupId.includes('team-cg-ea5cc23f') || g.groupId.includes('social-oracle')
    );
    
    if (related.length > 0) {
      related.forEach(g => {
        const isOurs = g.groupId === kafkaConfig.consumerGroup;
        console.log(`   ${isOurs ? '→' : ' '} ${g.groupId} (${g.protocolType})`);
      });
    } else {
      console.log('   No related groups found');
    }

    // Get latest offsets
    console.log('\n📊 Topic Offsets:');
    const offsets = await admin.fetchTopicOffsets(kafkaConfig.topic);
    offsets.forEach(o => {
      console.log(`   Partition ${o.partition}: offset ${o.offset} (high: ${o.high}, low: ${o.low})`);
    });

    // Get consumer group offsets
    console.log('\n📍 Consumer Group Offsets:');
    const groupOffsets = await admin.fetchOffsets({ 
      groupId: kafkaConfig.consumerGroup,
      topics: [kafkaConfig.topic]
    });
    groupOffsets.forEach(t => {
      t.partitions.forEach(p => {
        console.log(`   Partition ${p.partition}: committed offset ${p.offset}`);
      });
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await admin.disconnect();
  }

  console.log('\n' + '═'.repeat(50));
  console.log('💡 If you see multiple members, other consumers are running!');
  console.log('   Kill them or use a different consumer group.\n');
}

diagnose();
