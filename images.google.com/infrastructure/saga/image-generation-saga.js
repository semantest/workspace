/**
 * Image Generation Saga
 * Orchestrates the complete image generation workflow
 */

const { Saga } = require('./saga');
const { DomainEvent } = require('../../domain/events/event');
const ImageGenerationAggregate = require('../../domain/aggregates/image-generation-aggregate');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const https = require('https');

class ImageGenerationSaga {
  /**
   * Define the saga workflow
   */
  static define(sagaManager, websocketServer) {
    sagaManager.registerSaga('ImageGenerationWorkflow', (saga) => {
      saga
        // Step 1: Validate the request
        .addStep('ValidateRequest', 
          async (context, eventStore) => {
            const { triggerEvent } = context;
            
            console.log(`[Saga] Validating request: ${triggerEvent.aggregateId}`);
            
            // Load or create aggregate
            const events = await eventStore.readStream(triggerEvent.aggregateId);
            let aggregate;
            
            if (events.length === 0) {
              // Create new aggregate
              aggregate = ImageGenerationAggregate.create(
                triggerEvent.aggregateId,
                triggerEvent.payload.prompt,
                triggerEvent.payload.fileName,
                triggerEvent.payload.downloadFolder,
                triggerEvent.payload.domainName,
                triggerEvent.payload.model,
                triggerEvent.payload.parameters
              );
              
              // Save the initial events
              const uncommittedEvents = aggregate.getUncommittedEvents();
              await eventStore.appendEvents(aggregate.id, uncommittedEvents);
              aggregate.markEventsAsCommitted();
            } else {
              // Load existing aggregate
              aggregate = ImageGenerationAggregate.loadFromHistory(events);
            }
            
            context.aggregate = aggregate;
            context.requestId = aggregate.id;
            
            // Validate download folder exists
            try {
              await fs.access(aggregate.downloadFolder);
            } catch (err) {
              // Create folder if it doesn't exist
              await fs.mkdir(aggregate.downloadFolder, { recursive: true });
              console.log(`[Saga] Created download folder: ${aggregate.downloadFolder}`);
            }
            
            return {
              validated: true,
              aggregateId: aggregate.id,
              status: aggregate.status
            };
          },
          // Compensation: Mark request as failed
          async (data, context, eventStore) => {
            console.log(`[Saga] Compensating: Marking request as failed`);
            
            const { aggregate } = context;
            aggregate.markAsFailed('Validation failed - compensating');
            
            const events = aggregate.getUncommittedEvents();
            await eventStore.appendEvents(aggregate.id, events);
          }
        )
        
        // Step 2: Find available extension
        .addStep('FindAvailableExtension',
          async (context, eventStore) => {
            console.log(`[Saga] Finding available extension`);
            
            // Access WebSocket server through context
            const wsServer = websocketServer;
            if (!wsServer) {
              throw new Error('WebSocket server not available');
            }
            
            // Find an authenticated extension
            let extensionClient = null;
            wsServer.connections.forEach((client) => {
              if (client.type === 'extension' && 
                  client.authenticated && 
                  client.ws.readyState === 1) { // WebSocket.OPEN
                extensionClient = client;
              }
            });
            
            if (!extensionClient) {
              throw new Error('No available extension to handle request');
            }
            
            // Assign to extension
            const { aggregate } = context;
            aggregate.assignToExtension(extensionClient.id);
            
            const events = aggregate.getUncommittedEvents();
            await eventStore.appendEvents(aggregate.id, events);
            aggregate.markEventsAsCommitted();
            
            context.extensionClient = extensionClient;
            
            return {
              extensionId: extensionClient.id,
              extensionType: extensionClient.type
            };
          },
          // Compensation: Release extension assignment
          async (data, context, eventStore) => {
            console.log(`[Saga] Compensating: Releasing extension assignment`);
            
            const releaseEvent = new DomainEvent(
              context.requestId,
              'ExtensionAssignmentReleased',
              { extensionId: data.extensionId },
              { correlationId: context.correlationId }
            );
            
            await eventStore.appendEvents(context.requestId, [releaseEvent]);
          }
        )
        
        // Step 3: Send request to extension
        .addStep('SendToExtension',
          async (context, eventStore) => {
            const { extensionClient, aggregate, correlationId } = context;
            
            console.log(`[Saga] Sending to extension ${extensionClient.id}`);
            
            // Send the request to the extension
            const message = {
              type: 'generate_image',
              requestId: aggregate.id,
              prompt: aggregate.prompt,
              fileName: aggregate.fileName,
              downloadFolder: aggregate.downloadFolder,
              domainName: aggregate.domainName,
              model: aggregate.model,
              parameters: aggregate.parameters,
              correlationId
            };
            
            extensionClient.ws.send(JSON.stringify(message));
            
            // Record that we sent the request
            const sentEvent = new DomainEvent(
              aggregate.id,
              'RequestSentToExtension',
              {
                extensionId: extensionClient.id,
                sentAt: new Date().toISOString()
              },
              { correlationId }
            );
            
            await eventStore.appendEvents(aggregate.id, [sentEvent]);
            
            // Set up timeout for response
            context.sentAt = Date.now();
            context.timeout = 5 * 60 * 1000; // 5 minutes
            
            return {
              sentAt: context.sentAt,
              timeout: context.timeout
            };
          },
          // Compensation: Send cancellation to extension
          async (data, context, eventStore) => {
            console.log(`[Saga] Compensating: Cancelling extension request`);
            
            const { extensionClient, requestId, correlationId } = context;
            
            if (extensionClient && extensionClient.ws.readyState === 1) {
              extensionClient.ws.send(JSON.stringify({
                type: 'cancel_generation',
                requestId,
                correlationId
              }));
            }
            
            const cancelEvent = new DomainEvent(
              requestId,
              'ExtensionRequestCancelled',
              { reason: 'Saga compensation' },
              { correlationId }
            );
            
            await eventStore.appendEvents(requestId, [cancelEvent]);
          }
        )
        
        // Step 4: Wait for extension response
        .addStep('WaitForResponse',
          async (context, eventStore) => {
            const { requestId, timeout, sentAt, correlationId } = context;
            
            console.log(`[Saga] Waiting for response from extension`);
            
            // This is a simplified wait - in production, this would be event-driven
            const startWait = Date.now();
            const maxWait = timeout || 5 * 60 * 1000;
            
            // Poll for completion events
            while (Date.now() - startWait < maxWait) {
              // Check for completion events
              const events = await eventStore.readStream(requestId);
              
              const hasCompleted = events.some(e => 
                e.eventType === 'ImageGenerated' ||
                e.eventType === 'ImageGenerationFailed'
              );
              
              if (hasCompleted) {
                console.log(`[Saga] Response received for ${requestId}`);
                
                // Reload aggregate with latest events
                const aggregate = ImageGenerationAggregate.loadFromHistory(events);
                context.aggregate = aggregate;
                
                if (aggregate.isCompleted()) {
                  return {
                    status: 'completed',
                    imageUrl: aggregate.imageUrl,
                    imagePath: aggregate.imagePath
                  };
                } else if (aggregate.isFailed()) {
                  throw new Error(`Image generation failed: ${aggregate.error}`);
                }
              }
              
              // Wait a bit before checking again
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Timeout reached
            throw new Error(`Timeout waiting for extension response after ${maxWait}ms`);
          }
        )
        
        // Step 5: Download image if URL provided
        .addStep('DownloadImage',
          async (context, eventStore) => {
            const { aggregate, correlationId } = context;
            
            if (!aggregate.imageUrl) {
              console.log(`[Saga] No image URL to download`);
              return { downloaded: false };
            }
            
            console.log(`[Saga] Downloading image from ${aggregate.imageUrl}`);
            
            const filepath = path.join(
              aggregate.downloadFolder,
              aggregate.fileName
            );
            
            try {
              await ImageGenerationSaga.downloadImage(
                aggregate.imageUrl,
                filepath
              );
              
              // Update aggregate with local path
              const downloadEvent = new DomainEvent(
                aggregate.id,
                'ImageDownloadedLocally',
                {
                  localPath: filepath,
                  downloadedAt: new Date().toISOString()
                },
                { correlationId }
              );
              
              await eventStore.appendEvents(aggregate.id, [downloadEvent]);
              
              return {
                downloaded: true,
                localPath: filepath
              };
            } catch (err) {
              console.error(`[Saga] Failed to download image: ${err.message}`);
              
              // Record download failure but don't fail the saga
              const failureEvent = new DomainEvent(
                aggregate.id,
                'ImageDownloadFailed',
                {
                  error: err.message,
                  imageUrl: aggregate.imageUrl
                },
                { correlationId }
              );
              
              await eventStore.appendEvents(aggregate.id, [failureEvent]);
              
              return {
                downloaded: false,
                error: err.message
              };
            }
          }
        )
        
        // Step 6: Notify completion
        .addStep('NotifyCompletion',
          async (context, eventStore) => {
            const { aggregate, correlationId } = context;
            
            console.log(`[Saga] Notifying completion for ${aggregate.id}`);
            
            // Create completion event
            const completionEvent = new DomainEvent(
              aggregate.id,
              'ImageGenerationWorkflowCompleted',
              {
                status: aggregate.status,
                imageUrl: aggregate.imageUrl,
                imagePath: aggregate.imagePath,
                duration: aggregate.getDuration(),
                completedAt: new Date().toISOString()
              },
              { correlationId }
            );
            
            await eventStore.appendEvents(aggregate.id, [completionEvent]);
            
            // Notify any waiting clients through WebSocket
            const wsServer = websocketServer;
            if (wsServer) {
              wsServer.connections.forEach((client) => {
                if (client.ws.readyState === 1) {
                  client.ws.send(JSON.stringify({
                    type: 'workflow_completed',
                    requestId: aggregate.id,
                    status: aggregate.status,
                    imageUrl: aggregate.imageUrl,
                    imagePath: aggregate.imagePath,
                    correlationId
                  }));
                }
              });
            }
            
            return {
              notified: true,
              status: aggregate.status
            };
          }
        );
    });
    
    // Register retry saga for failed requests
    sagaManager.registerSaga('ImageGenerationRetrySaga', (saga) => {
      saga
        .addStep('CheckRetryEligibility',
          async (context, eventStore) => {
            const { requestId } = context;
            
            const events = await eventStore.readStream(requestId);
            const aggregate = ImageGenerationAggregate.loadFromHistory(events);
            
            if (!aggregate.canRetry()) {
              throw new Error('Request cannot be retried');
            }
            
            // Retry the request
            aggregate.retry();
            
            const retryEvents = aggregate.getUncommittedEvents();
            await eventStore.appendEvents(aggregate.id, retryEvents);
            
            context.aggregate = aggregate;
            
            return { canRetry: true, attempts: aggregate.attempts };
          }
        )
        .addStep('RestartWorkflow',
          async (context, eventStore) => {
            // Start a new workflow saga for the retry
            const { aggregate, correlationId } = context;
            
            await sagaManager.startSaga(
              'ImageGenerationWorkflow',
              correlationId,
              {
                triggerEvent: {
                  aggregateId: aggregate.id,
                  payload: {
                    prompt: aggregate.prompt,
                    fileName: aggregate.fileName,
                    downloadFolder: aggregate.downloadFolder,
                    domainName: aggregate.domainName,
                    model: aggregate.model,
                    parameters: aggregate.parameters
                  }
                }
              }
            );
            
            return { restarted: true };
          }
        );
    });
  }
  
  /**
   * Helper method to download an image
   */
  static async downloadImage(imageUrl, filepath) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filepath);
      const protocol = imageUrl.startsWith('https') ? https : http;
      
      protocol.get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`✅ Image saved: ${filepath}`);
          resolve(filepath);
        });
      }).on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    });
  }
}

module.exports = ImageGenerationSaga;