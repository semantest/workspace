import { ImageGenerationEndpoint } from './test-image-endpoint';
import { ImageEventTypes } from '@semantest/contracts';
import { BaseEvent } from './types/events';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test script for the image generation endpoint
 * Demonstrates the complete workflow from request to download
 */
async function runImageEndpointTest() {
  console.log('🚀 Starting Image Generation Endpoint Test');
  console.log('=========================================\n');
  
  // Create endpoint instance
  const endpoint = new ImageGenerationEndpoint();
  
  // Set up event listeners to track the workflow
  const events: BaseEvent[] = [];
  
  // Listen for all image-related events
  endpoint.on(ImageEventTypes.GENERATION_STARTED, (event: BaseEvent) => {
    events.push(event);
    console.log('\n📍 Event: Generation Started', {
      requestId: event.payload.requestId,
      timestamp: event.payload.startedAt
    });
  });
  
  endpoint.on(ImageEventTypes.GENERATION_COMPLETED, (event: BaseEvent) => {
    events.push(event);
    console.log('\n📍 Event: Generation Completed', {
      requestId: event.payload.requestId,
      timestamp: event.payload.completedAt
    });
  });
  
  endpoint.on(ImageEventTypes.DOWNLOADED, (event: BaseEvent) => {
    events.push(event);
    console.log('\n📍 Event: Image Downloaded', {
      path: event.payload.path,
      size: event.payload.metadata?.size,
      requestId: event.payload.metadata?.requestId
    });
  });
  
  endpoint.on(ImageEventTypes.GENERATION_FAILED, (event: BaseEvent) => {
    events.push(event);
    console.log('\n❌ Event: Generation Failed', {
      requestId: event.payload.requestId,
      error: event.payload.error.message
    });
  });
  
  // Test Case 1: Simple image request
  console.log('\n📝 Test Case 1: Simple Image Request');
  console.log('------------------------------------');
  await endpoint.simulateImageRequest(
    'A beautiful sunset over mountains',
    'test-project-1',
    'test-chat-1'
  );
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test Case 2: Request without project (should not create project)
  console.log('\n📝 Test Case 2: Request Without Project');
  console.log('---------------------------------------');
  await endpoint.simulateImageRequest(
    'A robot writing code',
    undefined, // No project
    'test-chat-2'
  );
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test Case 3: Request without chat (should create new chat)
  console.log('\n📝 Test Case 3: Request Without Chat');
  console.log('-------------------------------------');
  await endpoint.simulateImageRequest(
    'Abstract digital art',
    'test-project-2',
    undefined // No chat
  );
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Verify results
  console.log('\n📊 Test Results');
  console.log('===============');
  
  const downloadDir = endpoint.getDownloadDirectory();
  console.log(`\n📁 Download Directory: ${downloadDir}`);
  
  const downloadedImages = endpoint.listDownloadedImages();
  console.log(`\n📸 Downloaded Images (${downloadedImages.length}):`);
  downloadedImages.forEach((image, index) => {
    const stats = fs.statSync(image);
    console.log(`  ${index + 1}. ${path.basename(image)} (${stats.size} bytes)`);
  });
  
  console.log(`\n📈 Events Captured (${events.length}):`);
  const eventSummary = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(eventSummary).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count}`);
  });
  
  // Test cleanup (optional)
  console.log('\n🧹 Cleanup Test');
  console.log('---------------');
  const cleanedCount = endpoint.cleanupOldImages(0); // Clean all for test
  console.log(`Cleaned up ${cleanedCount} test images`);
  
  console.log('\n✅ Image Endpoint Test Completed!');
  console.log('=================================\n');
}

// Run the test
if (require.main === module) {
  runImageEndpointTest().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}