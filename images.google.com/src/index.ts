// images.google.com/src/index.ts
// Google Images Domain Module - Main Entry Point

// Domain Layer Exports
export * from './domain/entities';
export * from './domain/events';
export * from './domain/value-objects';
export * from './domain/repositories';

// Application Layer Exports
export * from './application';

// Infrastructure Layer Exports (Interfaces only)
export * from './infrastructure/adapters/interfaces';
export * from './infrastructure/repositories/interfaces';

// Module Information
export const MODULE_INFO = {
  name: '@semantest/images.google.com',
  version: '2.0.0',
  description: 'Google Images domain module for Semantest',
  domain: 'images.google.com',
  capabilities: [
    'image-search',
    'image-download',
    'image-metadata-extraction',
    'search-result-parsing',
    'download-automation'
  ]
} as const;

export type ModuleCapabilities = typeof MODULE_INFO.capabilities[number];