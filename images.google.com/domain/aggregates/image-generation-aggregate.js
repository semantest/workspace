/**
 * Image Generation Aggregate
 * Manages the state and business logic for image generation requests
 */

const AggregateRoot = require('../events/aggregate');

class ImageGenerationAggregate extends AggregateRoot {
  constructor(id) {
    super(id);
    
    // Initial state
    this.status = 'pending';
    this.prompt = null;
    this.fileName = null;
    this.downloadFolder = null;
    this.domainName = null;
    this.model = null;
    this.parameters = {};
    this.imageUrl = null;
    this.imagePath = null;
    this.extensionId = null;
    this.error = null;
    this.startedAt = null;
    this.completedAt = null;
    this.attempts = 0;
    this.metadata = {};
  }
  
  /**
   * Static factory method to create a new image generation request
   */
  static create(requestId, prompt, fileName, downloadFolder, domainName, model, parameters) {
    const aggregate = new ImageGenerationAggregate(requestId);
    
    // Validate inputs
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required and cannot be empty');
    }
    
    if (!fileName || fileName.trim().length === 0) {
      throw new Error('File name is required');
    }
    
    if (!downloadFolder) {
      throw new Error('Download folder is required');
    }
    
    // Raise the initial event
    aggregate.raiseEvent('ImageGenerationRequested', {
      prompt,
      fileName,
      downloadFolder,
      domainName: domainName || 'chatgpt.com',
      model: model || 'dall-e-3',
      parameters: parameters || {}
    });
    
    return aggregate;
  }
  
  /**
   * Business Methods
   */
  
  assignToExtension(extensionId) {
    if (this.status !== 'pending') {
      throw new Error(`Cannot assign extension in status: ${this.status}`);
    }
    
    this.raiseEvent('ImageGenerationAssignedToExtension', {
      extensionId,
      assignedAt: new Date().toISOString()
    });
  }
  
  markAsInitiated() {
    if (this.status !== 'assigned') {
      throw new Error(`Cannot initiate in status: ${this.status}`);
    }
    
    this.raiseEvent('ImageGenerationInitiated', {
      initiatedAt: new Date().toISOString()
    });
  }
  
  updateProgress(progress, message) {
    if (this.status !== 'generating' && this.status !== 'assigned') {
      throw new Error(`Cannot update progress in status: ${this.status}`);
    }
    
    this.raiseEvent('ImageGenerationProgressUpdated', {
      progress,
      message,
      updatedAt: new Date().toISOString()
    });
  }
  
  markAsCompleted(imageUrl, imagePath, metadata) {
    if (this.status !== 'generating' && this.status !== 'assigned') {
      throw new Error(`Cannot complete in status: ${this.status}`);
    }
    
    this.raiseEvent('ImageGenerated', {
      imageUrl,
      imagePath,
      metadata: metadata || {},
      completedAt: new Date().toISOString()
    });
  }
  
  markAsFailed(error, canRetry = true) {
    if (this.status === 'completed' || this.status === 'failed') {
      throw new Error(`Cannot fail in status: ${this.status}`);
    }
    
    this.raiseEvent('ImageGenerationFailed', {
      error: error.message || error,
      canRetry,
      failedAt: new Date().toISOString(),
      attempts: this.attempts
    });
  }
  
  retry() {
    if (this.status !== 'failed') {
      throw new Error('Can only retry failed requests');
    }
    
    if (this.attempts >= 3) {
      throw new Error('Maximum retry attempts reached');
    }
    
    this.raiseEvent('ImageGenerationRetried', {
      attempt: this.attempts + 1,
      retriedAt: new Date().toISOString()
    });
  }
  
  cancel(reason) {
    if (this.status === 'completed' || this.status === 'cancelled') {
      throw new Error(`Cannot cancel in status: ${this.status}`);
    }
    
    this.raiseEvent('ImageGenerationCancelled', {
      reason,
      cancelledAt: new Date().toISOString()
    });
  }
  
  /**
   * Event Handlers
   */
  
  onImageGenerationRequested(payload) {
    this.status = 'pending';
    this.prompt = payload.prompt;
    this.fileName = payload.fileName;
    this.downloadFolder = payload.downloadFolder;
    this.domainName = payload.domainName;
    this.model = payload.model;
    this.parameters = payload.parameters;
    this.startedAt = new Date().toISOString();
  }
  
  onImageGenerationAssignedToExtension(payload) {
    this.status = 'assigned';
    this.extensionId = payload.extensionId;
  }
  
  onImageGenerationInitiated(payload) {
    this.status = 'generating';
  }
  
  onImageGenerationProgressUpdated(payload) {
    if (!this.metadata.progress) {
      this.metadata.progress = [];
    }
    this.metadata.progress.push({
      value: payload.progress,
      message: payload.message,
      timestamp: payload.updatedAt
    });
  }
  
  onImageGenerated(payload) {
    this.status = 'completed';
    this.imageUrl = payload.imageUrl;
    this.imagePath = payload.imagePath;
    this.metadata = { ...this.metadata, ...payload.metadata };
    this.completedAt = payload.completedAt;
  }
  
  onImageGenerationFailed(payload) {
    this.status = 'failed';
    this.error = payload.error;
    this.attempts = payload.attempts;
  }
  
  onImageGenerationRetried(payload) {
    this.status = 'pending';
    this.attempts = payload.attempt;
    this.error = null;
  }
  
  onImageGenerationCancelled(payload) {
    this.status = 'cancelled';
    this.error = payload.reason;
  }
  
  /**
   * Snapshot support
   */
  
  getSnapshotData() {
    return {
      status: this.status,
      prompt: this.prompt,
      fileName: this.fileName,
      downloadFolder: this.downloadFolder,
      domainName: this.domainName,
      model: this.model,
      parameters: this.parameters,
      imageUrl: this.imageUrl,
      imagePath: this.imagePath,
      extensionId: this.extensionId,
      error: this.error,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      attempts: this.attempts,
      metadata: this.metadata
    };
  }
  
  restoreFromSnapshot(snapshot) {
    this.id = snapshot.aggregateId;
    this.version = snapshot.version;
    
    const data = snapshot.data;
    this.status = data.status;
    this.prompt = data.prompt;
    this.fileName = data.fileName;
    this.downloadFolder = data.downloadFolder;
    this.domainName = data.domainName;
    this.model = data.model;
    this.parameters = data.parameters;
    this.imageUrl = data.imageUrl;
    this.imagePath = data.imagePath;
    this.extensionId = data.extensionId;
    this.error = data.error;
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this.attempts = data.attempts;
    this.metadata = data.metadata;
  }
  
  /**
   * Query methods
   */
  
  isCompleted() {
    return this.status === 'completed';
  }
  
  isFailed() {
    return this.status === 'failed';
  }
  
  isPending() {
    return this.status === 'pending';
  }
  
  isGenerating() {
    return this.status === 'generating';
  }
  
  canRetry() {
    return this.status === 'failed' && this.attempts < 3;
  }
  
  getDuration() {
    if (!this.startedAt) return null;
    
    const endTime = this.completedAt || new Date().toISOString();
    return new Date(endTime) - new Date(this.startedAt);
  }
  
  toJSON() {
    return {
      id: this.id,
      version: this.version,
      status: this.status,
      prompt: this.prompt,
      fileName: this.fileName,
      downloadFolder: this.downloadFolder,
      domainName: this.domainName,
      model: this.model,
      parameters: this.parameters,
      imageUrl: this.imageUrl,
      imagePath: this.imagePath,
      extensionId: this.extensionId,
      error: this.error,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      attempts: this.attempts,
      metadata: this.metadata,
      duration: this.getDuration()
    };
  }
}

module.exports = ImageGenerationAggregate;