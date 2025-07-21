import { EVENT_TYPE_PREFIX } from '@semantest/core';

/**
 * Custom event builder
 */
export function createCustomEventType(domain: string, action: string): string {
  return `${EVENT_TYPE_PREFIX.CUSTOM}/${domain}/${action}`;
}

/**
 * ChatGPT-specific event types
 */
export const ChatGPTEventTypes = {
  CONVERSATION_START: createCustomEventType('chatgpt', 'conversation/start'),
  CONVERSATION_END: createCustomEventType('chatgpt', 'conversation/end'),
  MESSAGE_SEND: createCustomEventType('chatgpt', 'message/send'),
  MESSAGE_RECEIVE: createCustomEventType('chatgpt', 'message/receive'),
  MODEL_CHANGE: createCustomEventType('chatgpt', 'model/change'),
  PLUGIN_ENABLE: createCustomEventType('chatgpt', 'plugin/enable'),
  PLUGIN_DISABLE: createCustomEventType('chatgpt', 'plugin/disable'),
  CODE_EXECUTE: createCustomEventType('chatgpt', 'code/execute'),
  FILE_UPLOAD: createCustomEventType('chatgpt', 'file/upload'),
  EXPORT_CHAT: createCustomEventType('chatgpt', 'export/chat')
} as const;

/**
 * ChatGPT conversation start payload
 */
export interface ChatGPTConversationStartPayload {
  conversationId: string;
  title?: string;
  model: string;
  plugins?: string[];
}

/**
 * ChatGPT message payload
 */
export interface ChatGPTMessagePayload {
  conversationId: string;
  messageId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Array<{
    type: 'image' | 'file' | 'code';
    name: string;
    url?: string;
  }>;
  timestamp: number;
}

/**
 * ChatGPT model change payload
 */
export interface ChatGPTModelChangePayload {
  conversationId: string;
  previousModel: string;
  newModel: string;
}

/**
 * Google-specific event types
 */
export const GoogleEventTypes = {
  SEARCH: createCustomEventType('google', 'search'),
  RESULT_CLICK: createCustomEventType('google', 'result/click'),
  IMAGE_VIEW: createCustomEventType('google', 'image/view'),
  VIDEO_PLAY: createCustomEventType('google', 'video/play'),
  MAP_INTERACT: createCustomEventType('google', 'map/interact')
} as const;

/**
 * Google search payload
 */
export interface GoogleSearchPayload {
  query: string;
  type: 'web' | 'image' | 'video' | 'news' | 'maps';
  filters?: Record<string, unknown>;
  resultCount?: number;
}

/**
 * Generic custom event payload
 */
export interface CustomEventPayload {
  domain: string;
  action: string;
  data: Record<string, unknown>;
}

/**
 * Image generation event types (PAST TENSE)
 */
export const ImageEventTypes = {
  REQUEST_RECEIVED: createCustomEventType('image', 'request/received'),
  DOWNLOADED: createCustomEventType('image', 'downloaded'),
  GENERATION_STARTED: createCustomEventType('image', 'generation/started'),
  GENERATION_COMPLETED: createCustomEventType('image', 'generation/completed'),
  GENERATION_FAILED: createCustomEventType('image', 'generation/failed')
} as const;

/**
 * Image request received payload
 */
export interface ImageRequestReceivedPayload {
  /**
   * Optional project identifier
   * If null, don't create project
   */
  project?: string;
  
  /**
   * Optional chat/conversation identifier
   * If null, create new chat
   */
  chat?: string;
  
  /**
   * The prompt for image generation
   */
  prompt: string;
  
  /**
   * Optional metadata
   */
  metadata?: {
    requestId?: string;
    userId?: string;
    timestamp?: number;
  };
}

/**
 * Image downloaded payload
 */
export interface ImageDownloadedPayload {
  /**
   * File path where image was saved
   */
  path: string;
  
  /**
   * Optional metadata
   */
  metadata?: {
    size?: number;
    mimeType?: string;
    width?: number;
    height?: number;
    requestId?: string;
  };
}