/*
                      @semantest/mobile-app

  Copyright (C) 2025-today  Semantest Team

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * @fileoverview Offline Manager for local test storage and synchronization
 * @author Semantest Team
 * @module services/offline/OfflineManager
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { compress, decompress } from '../compression/CompressionService';
import { EncryptionService } from '../encryption/EncryptionService';

/**
 * Offline test data structure
 */
export interface OfflineTestData {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  testType: 'unit' | 'integration' | 'e2e' | 'api' | 'visual' | 'performance';
  status: 'draft' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled';
  config: TestConfiguration;
  results?: TestResults;
  artifacts: TestArtifacts;
  metadata: TestMetadata;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'local' | 'synced' | 'pending' | 'conflict';
  lastSyncAt?: string;
  version: number;
}

/**
 * Test configuration interface
 */
export interface TestConfiguration {
  browser?: string;
  device?: string;
  viewport?: { width: number; height: number };
  environment?: 'development' | 'staging' | 'production';
  timeout?: number;
  retryAttempts?: number;
  screenshots?: boolean;
  recording?: boolean;
  assertions: TestAssertion[];
  steps: TestStep[];
}

/**
 * Test assertion interface
 */
export interface TestAssertion {
  id: string;
  type: 'element' | 'text' | 'url' | 'performance' | 'accessibility' | 'visual';
  target: string;
  operator: 'equals' | 'contains' | 'exists' | 'not_exists' | 'greater_than' | 'less_than';
  expected: any;
  actual?: any;
  passed?: boolean;
  error?: string;
}

/**
 * Test step interface
 */
export interface TestStep {
  id: string;
  type: 'navigate' | 'click' | 'type' | 'wait' | 'scroll' | 'screenshot' | 'custom';
  target?: string;
  value?: string;
  timeout?: number;
  optional?: boolean;
  description: string;
  executed?: boolean;
  executedAt?: string;
  duration?: number;
  error?: string;
}

/**
 * Test results interface
 */
export interface TestResults {
  executionId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'passed' | 'failed' | 'skipped' | 'timeout';
  summary: {
    totalSteps: number;
    passedSteps: number;
    failedSteps: number;
    skippedSteps: number;
    totalAssertions: number;
    passedAssertions: number;
    failedAssertions: number;
  };
  steps: TestStep[];
  assertions: TestAssertion[];
  errors: TestError[];
  performance?: PerformanceMetrics;
  accessibility?: AccessibilityResults;
}

/**
 * Test artifacts interface
 */
export interface TestArtifacts {
  screenshots: Screenshot[];
  recordings: Recording[];
  logs: LogEntry[];
  reports: Report[];
  files: FileArtifact[];
}

/**
 * Test metadata interface
 */
export interface TestMetadata {
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  author: string;
  lastExecutedBy?: string;
  executionCount: number;
  averageDuration?: number;
  lastPassedAt?: string;
  lastFailedAt?: string;
  flakyCount: number;
  device?: DeviceInfo;
  environment?: EnvironmentInfo;
}

/**
 * Storage configuration
 */
export interface OfflineStorageConfig {
  maxStorageSize: number; // in bytes
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  autoCleanup: boolean;
  retentionDays: number;
  syncBatchSize: number;
}

/**
 * Default storage configuration
 */
const DEFAULT_CONFIG: OfflineStorageConfig = {
  maxStorageSize: 500 * 1024 * 1024, // 500MB
  compressionEnabled: true,
  encryptionEnabled: true,
  autoCleanup: true,
  retentionDays: 30,
  syncBatchSize: 10,
};

/**
 * Offline Manager for test data storage and synchronization
 */
export class OfflineManager {
  private config: OfflineStorageConfig;
  private encryptionService: EncryptionService;
  private documentsDirectory: string;
  private testDataDirectory: string;
  private artifactsDirectory: string;

  constructor(config: Partial<OfflineStorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.encryptionService = new EncryptionService();
    this.documentsDirectory = FileSystem.documentDirectory!;
    this.testDataDirectory = `${this.documentsDirectory}tests/`;
    this.artifactsDirectory = `${this.documentsDirectory}artifacts/`;
    
    this.initialize();
  }

  /**
   * Initialize offline storage
   */
  private async initialize(): Promise<void> {
    try {
      // Create directories if they don't exist
      await this.ensureDirectoryExists(this.testDataDirectory);
      await this.ensureDirectoryExists(this.artifactsDirectory);
      
      // Setup auto-cleanup if enabled
      if (this.config.autoCleanup) {
        this.scheduleCleanup();
      }
      
      console.log('OfflineManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OfflineManager:', error);
    }
  }

  /**
   * Store test data offline
   */
  async storeTest(testData: OfflineTestData): Promise<void> {
    try {
      // Check storage limits
      await this.checkStorageSpace();
      
      // Prepare data for storage
      const dataToStore = {
        ...testData,
        updatedAt: new Date().toISOString(),
        syncStatus: 'local' as const,
        version: testData.version + 1
      };
      
      // Compress if enabled
      let serializedData = JSON.stringify(dataToStore);
      if (this.config.compressionEnabled) {
        serializedData = await compress(serializedData);
      }
      
      // Encrypt if enabled
      if (this.config.encryptionEnabled) {
        serializedData = await this.encryptionService.encrypt(serializedData);
      }
      
      // Store in AsyncStorage for quick access
      await AsyncStorage.setItem(
        `test_${testData.id}`, 
        JSON.stringify({
          id: testData.id,
          name: testData.name,
          status: testData.status,
          syncStatus: 'local',
          updatedAt: dataToStore.updatedAt
        })
      );
      
      // Store full data in file system
      const filePath = `${this.testDataDirectory}${testData.id}.json`;
      await FileSystem.writeAsStringAsync(filePath, serializedData);
      
      // Store artifacts separately
      await this.storeTestArtifacts(testData.id, testData.artifacts);
      
      console.log(`Test ${testData.id} stored offline successfully`);
    } catch (error) {
      console.error('Failed to store test offline:', error);
      throw error;
    }
  }

  /**
   * Retrieve test data from offline storage
   */
  async getTest(testId: string): Promise<OfflineTestData | null> {
    try {
      const filePath = `${this.testDataDirectory}${testId}.json`;
      
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        return null;
      }
      
      // Read file content
      let fileContent = await FileSystem.readAsStringAsync(filePath);
      
      // Decrypt if enabled
      if (this.config.encryptionEnabled) {
        fileContent = await this.encryptionService.decrypt(fileContent);
      }
      
      // Decompress if enabled
      if (this.config.compressionEnabled) {
        fileContent = await decompress(fileContent);
      }
      
      const testData = JSON.parse(fileContent) as OfflineTestData;
      
      // Load artifacts
      testData.artifacts = await this.getTestArtifacts(testId);
      
      return testData;
    } catch (error) {
      console.error('Failed to retrieve test from offline storage:', error);
      return null;
    }
  }

  /**
   * Get all offline tests
   */
  async getAllTests(): Promise<OfflineTestData[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const testKeys = keys.filter(key => key.startsWith('test_'));
      
      const tests: OfflineTestData[] = [];
      
      for (const key of testKeys) {
        const testId = key.replace('test_', '');
        const testData = await this.getTest(testId);
        if (testData) {
          tests.push(testData);
        }
      }
      
      return tests.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error('Failed to get all tests:', error);
      return [];
    }
  }

  /**
   * Get tests by project
   */
  async getTestsByProject(projectId: string): Promise<OfflineTestData[]> {
    const allTests = await this.getAllTests();
    return allTests.filter(test => test.projectId === projectId);
  }

  /**
   * Get tests by status
   */
  async getTestsByStatus(status: OfflineTestData['status']): Promise<OfflineTestData[]> {
    const allTests = await this.getAllTests();
    return allTests.filter(test => test.status === status);
  }

  /**
   * Get tests by sync status
   */
  async getTestsBySyncStatus(syncStatus: OfflineTestData['syncStatus']): Promise<OfflineTestData[]> {
    const allTests = await this.getAllTests();
    return allTests.filter(test => test.syncStatus === syncStatus);
  }

  /**
   * Update test data
   */
  async updateTest(testId: string, updates: Partial<OfflineTestData>): Promise<void> {
    const existingTest = await this.getTest(testId);
    if (!existingTest) {
      throw new Error(`Test ${testId} not found`);
    }
    
    const updatedTest: OfflineTestData = {
      ...existingTest,
      ...updates,
      id: testId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
      version: existingTest.version + 1,
      syncStatus: 'local' // Mark as needing sync
    };
    
    await this.storeTest(updatedTest);
  }

  /**
   * Delete test from offline storage
   */
  async deleteTest(testId: string): Promise<void> {
    try {
      // Remove from AsyncStorage
      await AsyncStorage.removeItem(`test_${testId}`);
      
      // Remove test data file
      const filePath = `${this.testDataDirectory}${testId}.json`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
      }
      
      // Remove artifacts
      await this.deleteTestArtifacts(testId);
      
      console.log(`Test ${testId} deleted from offline storage`);
    } catch (error) {
      console.error('Failed to delete test:', error);
      throw error;
    }
  }

  /**
   * Store test artifacts
   */
  private async storeTestArtifacts(testId: string, artifacts: TestArtifacts): Promise<void> {
    const testArtifactsDir = `${this.artifactsDirectory}${testId}/`;
    await this.ensureDirectoryExists(testArtifactsDir);
    
    // Store screenshots
    for (const screenshot of artifacts.screenshots) {
      if (screenshot.base64Data) {
        const filePath = `${testArtifactsDir}screenshot_${screenshot.id}.png`;
        await FileSystem.writeAsStringAsync(filePath, screenshot.base64Data, {
          encoding: FileSystem.EncodingType.Base64
        });
      }
    }
    
    // Store recordings
    for (const recording of artifacts.recordings) {
      if (recording.filePath) {
        const fileName = `recording_${recording.id}.mp4`;
        const destPath = `${testArtifactsDir}${fileName}`;
        await FileSystem.copyAsync({
          from: recording.filePath,
          to: destPath
        });
      }
    }
    
    // Store logs and reports as JSON files
    const logsPath = `${testArtifactsDir}logs.json`;
    await FileSystem.writeAsStringAsync(logsPath, JSON.stringify(artifacts.logs));
    
    const reportsPath = `${testArtifactsDir}reports.json`;
    await FileSystem.writeAsStringAsync(reportsPath, JSON.stringify(artifacts.reports));
  }

  /**
   * Get test artifacts
   */
  private async getTestArtifacts(testId: string): Promise<TestArtifacts> {
    const testArtifactsDir = `${this.artifactsDirectory}${testId}/`;
    
    try {
      const artifacts: TestArtifacts = {
        screenshots: [],
        recordings: [],
        logs: [],
        reports: [],
        files: []
      };
      
      // Check if artifacts directory exists
      const dirInfo = await FileSystem.getInfoAsync(testArtifactsDir);
      if (!dirInfo.exists) {
        return artifacts;
      }
      
      // Read directory contents
      const files = await FileSystem.readDirectoryAsync(testArtifactsDir);
      
      for (const file of files) {
        const filePath = `${testArtifactsDir}${file}`;
        
        if (file.startsWith('screenshot_')) {
          const base64Data = await FileSystem.readAsStringAsync(filePath, {
            encoding: FileSystem.EncodingType.Base64
          });
          artifacts.screenshots.push({
            id: file.replace('screenshot_', '').replace('.png', ''),
            name: file,
            timestamp: new Date().toISOString(),
            base64Data,
            size: base64Data.length
          });
        } else if (file.startsWith('recording_')) {
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          artifacts.recordings.push({
            id: file.replace('recording_', '').replace('.mp4', ''),
            name: file,
            filePath,
            duration: 0, // Would need to extract from video metadata
            size: fileInfo.size || 0,
            timestamp: new Date().toISOString()
          });
        } else if (file === 'logs.json') {
          const logsContent = await FileSystem.readAsStringAsync(filePath);
          artifacts.logs = JSON.parse(logsContent);
        } else if (file === 'reports.json') {
          const reportsContent = await FileSystem.readAsStringAsync(filePath);
          artifacts.reports = JSON.parse(reportsContent);
        }
      }
      
      return artifacts;
    } catch (error) {
      console.error('Failed to get test artifacts:', error);
      return {
        screenshots: [],
        recordings: [],
        logs: [],
        reports: [],
        files: []
      };
    }
  }

  /**
   * Delete test artifacts
   */
  private async deleteTestArtifacts(testId: string): Promise<void> {
    const testArtifactsDir = `${this.artifactsDirectory}${testId}/`;
    
    try {
      const dirInfo = await FileSystem.getInfoAsync(testArtifactsDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(testArtifactsDir, { idempotent: true });
      }
    } catch (error) {
      console.error('Failed to delete test artifacts:', error);
    }
  }

  /**
   * Store queued request for offline processing
   */
  async storeQueuedRequest(requestId: string, request: any): Promise<void> {
    try {
      const queuedRequests = await this.getQueuedRequests();
      queuedRequests[requestId] = {
        ...request,
        queuedAt: new Date().toISOString()
      };
      
      await AsyncStorage.setItem('queued_requests', JSON.stringify(queuedRequests));
    } catch (error) {
      console.error('Failed to store queued request:', error);
    }
  }

  /**
   * Get all queued requests
   */
  async getQueuedRequests(): Promise<Record<string, any>> {
    try {
      const queuedRequests = await AsyncStorage.getItem('queued_requests');
      return queuedRequests ? JSON.parse(queuedRequests) : {};
    } catch (error) {
      console.error('Failed to get queued requests:', error);
      return {};
    }
  }

  /**
   * Remove queued request
   */
  async removeQueuedRequest(requestId: string): Promise<void> {
    try {
      const queuedRequests = await this.getQueuedRequests();
      delete queuedRequests[requestId];
      await AsyncStorage.setItem('queued_requests', JSON.stringify(queuedRequests));
    } catch (error) {
      console.error('Failed to remove queued request:', error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalSize: number;
    testCount: number;
    artifactCount: number;
    queuedRequestCount: number;
    freeSpace: number;
  }> {
    try {
      const testDirInfo = await FileSystem.getInfoAsync(this.testDataDirectory);
      const artifactsDirInfo = await FileSystem.getInfoAsync(this.artifactsDirectory);
      
      const allTests = await this.getAllTests();
      const queuedRequests = await this.getQueuedRequests();
      
      const totalSize = (testDirInfo.size || 0) + (artifactsDirInfo.size || 0);
      const freeSpace = this.config.maxStorageSize - totalSize;
      
      // Count artifacts
      let artifactCount = 0;
      for (const test of allTests) {
        artifactCount += test.artifacts.screenshots.length;
        artifactCount += test.artifacts.recordings.length;
        artifactCount += test.artifacts.files.length;
      }
      
      return {
        totalSize,
        testCount: allTests.length,
        artifactCount,
        queuedRequestCount: Object.keys(queuedRequests).length,
        freeSpace
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalSize: 0,
        testCount: 0,
        artifactCount: 0,
        queuedRequestCount: 0,
        freeSpace: this.config.maxStorageSize
      };
    }
  }

  /**
   * Check storage space and cleanup if necessary
   */
  private async checkStorageSpace(): Promise<void> {
    const stats = await this.getStorageStats();
    
    if (stats.freeSpace < 0) {
      console.warn('Storage space exceeded, performing cleanup');
      await this.performCleanup();
    }
  }

  /**
   * Perform storage cleanup
   */
  private async performCleanup(): Promise<void> {
    try {
      const allTests = await this.getAllTests();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
      
      // Delete old tests
      for (const test of allTests) {
        const testDate = new Date(test.updatedAt);
        if (testDate < cutoffDate && test.syncStatus === 'synced') {
          await this.deleteTest(test.id);
        }
      }
      
      console.log('Storage cleanup completed');
    } catch (error) {
      console.error('Failed to perform cleanup:', error);
    }
  }

  /**
   * Schedule automatic cleanup
   */
  private scheduleCleanup(): void {
    // Run cleanup every 24 hours
    setInterval(() => {
      this.performCleanup();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
  }

  /**
   * Export offline data
   */
  async exportData(): Promise<string> {
    try {
      const allTests = await this.getAllTests();
      const stats = await this.getStorageStats();
      
      const exportData = {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        statistics: stats,
        tests: allTests
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  /**
   * Import offline data
   */
  async importData(data: string, overwrite: boolean = false): Promise<void> {
    try {
      const importData = JSON.parse(data);
      
      if (!overwrite) {
        const existingTests = await this.getAllTests();
        if (existingTests.length > 0) {
          throw new Error('Existing data found. Use overwrite=true to replace.');
        }
      }
      
      // Clear existing data if overwriting
      if (overwrite) {
        await this.clearAllData();
      }
      
      // Import tests
      for (const test of importData.tests) {
        await this.storeTest(test);
      }
      
      console.log(`Imported ${importData.tests.length} tests successfully`);
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }

  /**
   * Clear all offline data
   */
  async clearAllData(): Promise<void> {
    try {
      // Clear AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const testKeys = keys.filter(key => key.startsWith('test_'));
      await AsyncStorage.multiRemove(testKeys);
      await AsyncStorage.removeItem('queued_requests');
      
      // Clear file system
      await FileSystem.deleteAsync(this.testDataDirectory, { idempotent: true });
      await FileSystem.deleteAsync(this.artifactsDirectory, { idempotent: true });
      
      // Recreate directories
      await this.ensureDirectoryExists(this.testDataDirectory);
      await this.ensureDirectoryExists(this.artifactsDirectory);
      
      console.log('All offline data cleared');
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }
}

// Export additional types
export type {
  TestConfiguration,
  TestAssertion,
  TestStep,
  TestResults,
  TestArtifacts,
  TestMetadata,
  OfflineStorageConfig
};

// Export interfaces for external use
export interface Screenshot {
  id: string;
  name: string;
  timestamp: string;
  base64Data?: string;
  size: number;
}

export interface Recording {
  id: string;
  name: string;
  filePath?: string;
  duration: number;
  size: number;
  timestamp: string;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  data?: any;
}

export interface Report {
  id: string;
  type: 'execution' | 'performance' | 'accessibility' | 'visual';
  format: 'json' | 'html' | 'pdf';
  content: string;
  generatedAt: string;
}

export interface FileArtifact {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string;
  createdAt: string;
}

export interface TestError {
  message: string;
  stack?: string;
  code?: string;
  timestamp: string;
  step?: string;
}

export interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  memoryUsage?: number;
  networkRequests?: number;
}

export interface AccessibilityResults {
  violations: Array<{
    id: string;
    description: string;
    impact: 'minor' | 'moderate' | 'serious' | 'critical';
    nodes: Array<{
      target: string;
      html: string;
    }>;
  }>;
  passes: number;
  incomplete: number;
  violations_count: number;
}

export interface DeviceInfo {
  platform: string;
  version: string;
  model: string;
  manufacturer: string;
  screenSize: { width: number; height: number };
  pixelDensity: number;
}

export interface EnvironmentInfo {
  name: string;
  url: string;
  version: string;
  branch: string;
  commit: string;
}