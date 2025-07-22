import { z } from 'zod';

// Core service interface
export interface ImageGenerationService {
  generateImage(params: ImageGenerationParams): Promise<ImageGenerationResult>;
  getStatus(requestId: string): Promise<GenerationStatus>;
  cancelGeneration(requestId: string): Promise<void>;
  saveImage(data: Buffer, options: SaveOptions): Promise<string>;
}

// Request parameters
export interface ImageGenerationParams {
  prompt: string;
  style?: 'realistic' | 'artistic' | 'cartoon' | 'abstract';
  quality?: 'standard' | 'high' | 'ultra';
  size?: '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
  format?: 'png' | 'jpeg' | 'webp';
  metadata?: {
    requestId: string;
    userId: string;
    source: 'chatgpt' | 'api' | 'cli';
    conversationId?: string;
    messageId?: string;
  };
}

// Generation result
export interface ImageGenerationResult {
  requestId: string;
  imageId: string;
  data?: Buffer;
  url?: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    generatedAt: string;
    model: string;
    parameters: ImageGenerationParams;
  };
}

// Generation status
export interface GenerationStatus {
  requestId: string;
  status: 'queued' | 'processing' | 'generating' | 'saving' | 'completed' | 'failed';
  progress: number; // 0-100
  startedAt: string;
  completedAt?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

// Save options
export interface SaveOptions {
  directory: string;
  filename?: string;
  overwrite?: boolean;
  metadata?: Record<string, any>;
}

// Event interfaces
export interface ImageRequestReceivedEvent {
  type: 'chatgpt:image/request-received';
  id: string;
  timestamp: number;
  payload: {
    project?: string;
    chat?: string;
    prompt: string;
    metadata?: {
      requestId: string;
      userId: string;
      timestamp: number;
      source?: 'chatgpt' | 'api' | 'cli';
    };
  };
}

export interface ImageDownloadedEvent {
  type: 'chatgpt:image/downloaded';
  id: string;
  timestamp: number;
  correlationId: string;
  payload: {
    path: string;
    metadata: {
      size: number;
      mimeType: string;
      width: number;
      height: number;
      requestId: string;
    };
  };
}

export interface ImageGenerationProgressEvent {
  type: 'chatgpt:image/generation-progress';
  id: string;
  timestamp: number;
  correlationId: string;
  payload: {
    requestId: string;
    progress: number;
    stage: 'queued' | 'processing' | 'generating' | 'saving' | 'completed';
    estimatedTimeRemaining?: number;
  };
}

// Provider interface for extensibility
export interface ImageProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generate(params: ImageGenerationParams): Promise<ImageGenerationResult>;
}

// Error types
export enum ImageErrorCode {
  INVALID_PROMPT = 'IMG_001',
  PROMPT_TOO_LONG = 'IMG_002',
  GENERATION_FAILED = 'IMG_101',
  MODEL_UNAVAILABLE = 'IMG_102',
  TIMEOUT = 'IMG_103',
  STORAGE_FULL = 'IMG_201',
  RATE_LIMIT_EXCEEDED = 'IMG_301',
  SERVICE_UNAVAILABLE = 'IMG_401',
}

// Validation schemas
export const ImageGenerationParamsSchema = z.object({
  prompt: z.string().min(1).max(1000),
  style: z.enum(['realistic', 'artistic', 'cartoon', 'abstract']).optional(),
  quality: z.enum(['standard', 'high', 'ultra']).optional(),
  size: z.enum(['512x512', '1024x1024', '1024x1792', '1792x1024']).optional(),
  format: z.enum(['png', 'jpeg', 'webp']).optional(),
  metadata: z.object({
    requestId: z.string(),
    userId: z.string(),
    source: z.enum(['chatgpt', 'api', 'cli']),
    conversationId: z.string().optional(),
    messageId: z.string().optional(),
  }).optional(),
});