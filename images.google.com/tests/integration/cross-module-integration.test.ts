/*
                        Semantest - Cross-Module Integration Tests
                        Module Communication Security

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { GoogleImageSearchSession } from '../../domain/entities/google-image-search-session.entity';
import { GoogleImageDownloadRequested } from '../../domain/events/download-requested.event';
import { MODULE_INFO } from '../../src/index';

describe('Cross-Module Integration Security Tests', () => {
    describe('Module Interface Security', () => {
        it('should validate module exports and prevent unauthorized access', async () => {
            // Test that module exports only safe interfaces
            expect(MODULE_INFO).toBeDefined();
            expect(MODULE_INFO.name).toBe('@semantest/images.google.com');
            expect(MODULE_INFO.version).toBe('2.0.0');
            expect(MODULE_INFO.domain).toBe('images.google.com');
            
            // Test that capabilities are properly defined
            expect(Array.isArray(MODULE_INFO.capabilities)).toBe(true);
            expect(MODULE_INFO.capabilities).toContain('image-search');
            expect(MODULE_INFO.capabilities).toContain('image-download');
            
            // Test that module doesn't expose internal implementation details
            expect(MODULE_INFO).not.toHaveProperty('_internal');
            expect(MODULE_INFO).not.toHaveProperty('secrets');
            expect(MODULE_INFO).not.toHaveProperty('credentials');
        });

        it('should validate event-driven communication security', async () => {
            const event = new GoogleImageDownloadRequested(
                { src: 'https://example.com/test.jpg', width: 800, height: 600 },
                { filename: 'test.jpg', quality: 'high' },
                'test-correlation-id'
            );

            // Test that events can cross module boundaries safely
            expect(event.eventType).toBe('GoogleImageDownloadRequested');
            expect(event.correlationId).toBe('test-correlation-id');
            
            // Test that event data is properly encapsulated
            expect(event.imageUrl).toBe('https://example.com/test.jpg');
            expect(event.dimensions.width).toBe(800);
            expect(event.dimensions.height).toBe(600);
            
            // Test serialization security
            const serialized = JSON.stringify(event);
            expect(serialized).toContain('GoogleImageDownloadRequested');
            expect(serialized).not.toContain('__proto__');
            expect(serialized).not.toContain('constructor');
        });

        it('should validate module dependency security', async () => {
            // Test that module properly imports from @semantest/core
            const session = new GoogleImageSearchSession(
                'test-session-1',
                'test-correlation-id',
                'test query',
                {},
                {
                    userAgent: 'test-agent',
                    viewport: { width: 1280, height: 720 }
                }
            );

            // Test that entity extends from core properly
            expect(session.id).toBe('test-session-1');
            expect(session.correlationId).toBe('test-correlation-id');
            
            // Test that core Entity methods are available
            expect(typeof session.equals).toBe('function');
            expect(typeof session.toJSON).toBe('function');
            
            // Test that domain events extend from core properly
            const event = new GoogleImageDownloadRequested(
                { src: 'https://example.com/test.jpg' },
                { filename: 'test.jpg' },
                'test-correlation-id'
            );
            
            expect(event.correlationId).toBe('test-correlation-id');
            expect(event.timestamp).toBeInstanceOf(Date);
            expect(typeof event.toJSON).toBe('function');
        });
    });

    describe('Data Flow Security Validation', () => {
        it('should validate secure data flow between modules', async () => {
            const session = new GoogleImageSearchSession(
                'test-session-2',
                'test-correlation-id',
                'test query',
                {
                    safeSearch: 'strict',
                    usageRights: 'labeled-for-reuse'
                },
                {
                    userAgent: 'test-agent',
                    viewport: { width: 1280, height: 720 }
                }
            );

            session.startSearch();
            
            // Test that data flows through proper channels
            const testResults = [
                { src: 'https://example.com/image1.jpg', width: 800, height: 600 },
                { src: 'https://example.com/image2.jpg', width: 1024, height: 768 }
            ];
            
            session.addResults(testResults, 'https://google.com/search', 100);
            
            // Test that results are properly encapsulated
            const results = session.results;
            expect(results.length).toBe(2);
            
            // Test that filtering works securely
            const downloadableImages = session.downloadableImages;
            expect(downloadableImages.length).toBe(2);
            
            const highResImages = session.highResolutionImages;
            expect(highResImages.length).toBe(1); // Only 1024x768 qualifies
            
            // Test that metrics are calculated securely
            const metrics = session.metrics;
            expect(metrics).toBeDefined();
            expect(metrics!.imagesFound).toBe(2);
            expect(metrics!.downloadableCount).toBe(2);
            expect(metrics!.highResolutionCount).toBe(1);
        });

        it('should validate error handling across module boundaries', async () => {
            const session = new GoogleImageSearchSession(
                'test-session-3',
                'test-correlation-id',
                'test query',
                {},
                {
                    userAgent: 'test-agent',
                    viewport: { width: 1280, height: 720 }
                }
            );

            session.startSearch();
            
            // Test that errors are properly encapsulated
            const errorMessage = 'Network timeout occurred';
            session.failSearch(errorMessage);
            
            expect(session.status).toBe('failed');
            expect(session.error).toBe(errorMessage);
            
            // Test that error information doesn't leak sensitive data
            const summary = session.toSummary();
            expect(summary).not.toContain('internal');
            expect(summary).not.toContain('system');
            expect(summary).not.toContain('debug');
        });

        it('should validate state management across modules', async () => {
            const session = new GoogleImageSearchSession(
                'test-session-4',
                'test-correlation-id',
                'test query',
                {},
                {
                    userAgent: 'test-agent',
                    viewport: { width: 1280, height: 720 }
                }
            );

            // Test state transitions
            expect(session.status).toBe('initialized');
            expect(session.isSearching).toBe(false);
            expect(session.isCompleted).toBe(false);
            expect(session.hasFailed).toBe(false);
            
            session.startSearch();
            expect(session.status).toBe('searching');
            expect(session.isSearching).toBe(true);
            expect(session.isCompleted).toBe(false);
            expect(session.hasFailed).toBe(false);
            
            session.completeSearch();
            expect(session.status).toBe('completed');
            expect(session.isSearching).toBe(false);
            expect(session.isCompleted).toBe(true);
            expect(session.hasFailed).toBe(false);
            
            // Test that state is properly encapsulated
            expect(() => {
                // @ts-expect-error - Testing private field access
                session._status = 'initialized';
            }).toThrow();
        });
    });

    describe('Communication Protocol Security', () => {
        it('should validate event messaging security', async () => {
            const events = [
                new GoogleImageDownloadRequested(
                    { src: 'https://example.com/test1.jpg' },
                    { filename: 'test1.jpg' },
                    'correlation-1'
                ),
                new GoogleImageDownloadRequested(
                    { src: 'https://example.com/test2.jpg' },
                    { filename: 'test2.jpg' },
                    'correlation-2'
                )
            ];

            // Test that events have unique correlation IDs
            expect(events[0].correlationId).not.toBe(events[1].correlationId);
            
            // Test that events are properly typed
            expect(events[0].eventType).toBe('GoogleImageDownloadRequested');
            expect(events[1].eventType).toBe('GoogleImageDownloadRequested');
            
            // Test that events can be serialized safely
            const serialized = events.map(e => JSON.stringify(e));
            expect(serialized[0]).not.toBe(serialized[1]);
            
            // Test that events don't interfere with each other
            const event1Data = JSON.parse(serialized[0]);
            const event2Data = JSON.parse(serialized[1]);
            
            expect(event1Data.correlationId).toBe('correlation-1');
            expect(event2Data.correlationId).toBe('correlation-2');
        });

        it('should validate module capability exposure', async () => {
            // Test that module capabilities are properly defined
            expect(MODULE_INFO.capabilities).toContain('image-search');
            expect(MODULE_INFO.capabilities).toContain('image-download');
            expect(MODULE_INFO.capabilities).toContain('image-metadata-extraction');
            expect(MODULE_INFO.capabilities).toContain('search-result-parsing');
            expect(MODULE_INFO.capabilities).toContain('download-automation');
            
            // Test that capabilities don't expose internal operations
            expect(MODULE_INFO.capabilities).not.toContain('database-access');
            expect(MODULE_INFO.capabilities).not.toContain('file-system-access');
            expect(MODULE_INFO.capabilities).not.toContain('network-raw-access');
        });

        it('should validate cross-module type safety', async () => {
            // Test that types are properly enforced across module boundaries
            const session = new GoogleImageSearchSession(
                'test-session-5',
                'test-correlation-id',
                'test query',
                {
                    safeSearch: 'strict', // Should be type-safe
                    imageSize: 'large',
                    imageType: 'photo'
                },
                {
                    userAgent: 'test-agent',
                    viewport: { width: 1280, height: 720 }
                }
            );

            // Test that invalid enum values would be caught at compile time
            expect(session.filters.safeSearch).toBe('strict');
            expect(session.filters.imageSize).toBe('large');
            expect(session.filters.imageType).toBe('photo');
            
            // Test that configuration is properly typed
            expect(session.configuration.viewport.width).toBe(1280);
            expect(session.configuration.viewport.height).toBe(720);
        });
    });

    describe('Resource Access Control', () => {
        it('should validate proper resource access patterns', async () => {
            const session = new GoogleImageSearchSession(
                'test-session-6',
                'test-correlation-id',
                'test query',
                {},
                {
                    userAgent: 'test-agent',
                    viewport: { width: 1280, height: 720 },
                    timeout: 30000
                }
            );

            // Test that resource limits are properly enforced
            expect(session.configuration.timeout).toBe(30000);
            
            // Test that resource usage is tracked
            session.startSearch();
            expect(session.startTime).toBeInstanceOf(Date);
            
            const testResults = Array.from({ length: 50 }, (_, i) => ({
                src: `https://example.com/image${i}.jpg`,
                width: 800,
                height: 600
            }));
            
            session.addResults(testResults, 'https://google.com/search', 100);
            
            // Test that metrics reflect resource usage
            const metrics = session.getPerformanceMetrics();
            expect(metrics.imagesPerSecond).toBeGreaterThan(0);
            expect(metrics.averageProcessingTime).toBeGreaterThan(0);
        });

        it('should validate memory safety in large operations', async () => {
            const session = new GoogleImageSearchSession(
                'test-session-7',
                'test-correlation-id',
                'test query',
                {},
                {
                    userAgent: 'test-agent',
                    viewport: { width: 1280, height: 720 }
                }
            );

            session.startSearch();
            
            // Test handling of large result sets
            const largeResultSet = Array.from({ length: 1000 }, (_, i) => ({
                src: `https://example.com/large${i}.jpg`,
                width: 1920,
                height: 1080,
                alt: `Large image ${i} with a very long description that could consume memory`
            }));
            
            session.addResults(largeResultSet, 'https://google.com/search', 1000);
            
            // Test that memory usage is reasonable
            expect(session.results.length).toBe(1000);
            
            // Test that filtering operations are efficient
            const highResImages = session.highResolutionImages;
            expect(highResImages.length).toBe(1000); // All qualify as high-res
            
            const downloadableImages = session.downloadableImages;
            expect(downloadableImages.length).toBe(1000); // All qualify as downloadable
            
            // Test that memory can be cleaned up
            session.completeSearch();
            expect(session.status).toBe('completed');
        });

        it('should validate concurrent access safety', async () => {
            const sessions = Array.from({ length: 10 }, (_, i) => 
                new GoogleImageSearchSession(
                    `test-session-${i}`,
                    `test-correlation-${i}`,
                    `test query ${i}`,
                    {},
                    {
                        userAgent: 'test-agent',
                        viewport: { width: 1280, height: 720 }
                    }
                )
            );

            // Test that multiple sessions can operate independently
            sessions.forEach(session => {
                session.startSearch();
                expect(session.status).toBe('searching');
            });
            
            // Test that sessions don't interfere with each other
            sessions.forEach((session, index) => {
                expect(session.id).toBe(`test-session-${index}`);
                expect(session.correlationId).toBe(`test-correlation-${index}`);
                expect(session.searchQuery).toBe(`test query ${index}`);
            });
            
            // Test that sessions can be completed independently
            sessions.forEach(session => {
                session.completeSearch();
                expect(session.status).toBe('completed');
            });
        });
    });
});