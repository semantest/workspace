export default async function globalTeardown(): Promise<void> {
  console.log('Cleaning up test containers...');
  
  try {
    const redisContainer = (global as any).__REDIS_CONTAINER__;
    const kafkaContainer = (global as any).__KAFKA_CONTAINER__;
    
    if (redisContainer) {
      await redisContainer.stop();
      console.log('Redis container stopped');
    }
    
    if (kafkaContainer) {
      await kafkaContainer.stop();
      console.log('Kafka container stopped');
    }
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
}