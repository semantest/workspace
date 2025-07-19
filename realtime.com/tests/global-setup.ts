import { GenericContainer, StartedTestContainer } from 'testcontainers';

let kafkaContainer: StartedTestContainer;
let redisContainer: StartedTestContainer;

export default async function globalSetup(): Promise<void> {
  console.log('Starting test containers...');
  
  try {
    // Start Redis container
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withEnvironment({
        'REDIS_PASSWORD': ''
      })
      .start();
    
    const redisPort = redisContainer.getMappedPort(6379);
    process.env.REDIS_URL = `redis://localhost:${redisPort}`;
    
    // Start Kafka container (using Confluent Platform)
    kafkaContainer = await new GenericContainer('confluentinc/cp-kafka:latest')
      .withExposedPorts(9092, 9093)
      .withEnvironment({
        'KAFKA_BROKER_ID': '1',
        'KAFKA_ZOOKEEPER_CONNECT': 'zookeeper:2181',
        'KAFKA_ADVERTISED_LISTENERS': 'PLAINTEXT://localhost:9092,PLAINTEXT_HOST://localhost:9093',
        'KAFKA_LISTENER_SECURITY_PROTOCOL_MAP': 'PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT',
        'KAFKA_INTER_BROKER_LISTENER_NAME': 'PLAINTEXT',
        'KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR': '1',
        'KAFKA_AUTO_CREATE_TOPICS_ENABLE': 'true'
      })
      .start();
    
    const kafkaPort = kafkaContainer.getMappedPort(9092);
    process.env.KAFKA_BROKERS = `localhost:${kafkaPort}`;
    
    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log(`Redis started on port: ${redisPort}`);
    console.log(`Kafka started on port: ${kafkaPort}`);
    
    // Store container references globally for cleanup
    (global as any).__REDIS_CONTAINER__ = redisContainer;
    (global as any).__KAFKA_CONTAINER__ = kafkaContainer;
    
  } catch (error) {
    console.error('Failed to start test containers:', error);
    
    // Fallback to local services if containers fail
    console.log('Falling back to local services...');
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.KAFKA_BROKERS = 'localhost:9092';
  }
}