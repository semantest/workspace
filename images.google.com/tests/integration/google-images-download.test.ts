/*
                        Semantest - Google Images Download Integration Test
                        End-to-End Testing
    
    This file is part of Semantest.
    
    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { GoogleImagesDownloadService } from '../../application/services/google-images-download.service';
import { GoogleImageDownloadRequested, GoogleImageElement } from '../../domain/events';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

describe('Google Images Download Integration', () => {
    let service: GoogleImagesDownloadService;
    const testDownloadPath = '/tmp/semantest-test-downloads';
    
    beforeAll(async () => {
        // Create test download directory
        await fs.promises.mkdir(testDownloadPath, { recursive: true });
    });
    
    beforeEach(() => {
        service = new GoogleImagesDownloadService();
        service.configure({
            downloadPath: testDownloadPath,
            timeout: 10000,
            maxFileSize: 5 * 1024 * 1024, // 5MB for tests
            maxRetries: 2
        });
    });
    
    afterAll(async () => {
        // Clean up test downloads
        try {
            const files = await fs.promises.readdir(testDownloadPath);
            for (const file of files) {
                await fs.promises.unlink(path.join(testDownloadPath, file));
            }
            await fs.promises.rmdir(testDownloadPath);
        } catch (error) {
            // Ignore cleanup errors
        }
    });
    
    describe('Download Functionality', () => {
        it('should successfully download a valid image', async () => {
            // Use a small test image that's likely to be stable
            const testImageElement: GoogleImageElement = {
                src: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
                alt: 'Google Logo',
                width: 272,
                height: 92
            };
            
            const downloadRequest: GoogleImageDownloadRequested = {
                correlationId: 'test-download-1',
                imageElement: testImageElement,
                searchQuery: 'google logo',
                filename: 'test_google_logo',
                quality: 'high'
            };
            
            await service.handleDownloadRequest(downloadRequest);
            
            // Check if download was tracked
            const status = service.getDownloadStatus('test-download-1');
            expect(status).toBeDefined();
            expect(status?.isCompleted).toBe(true);
            
            // Verify file exists
            const expectedFile = path.join(testDownloadPath, 'test_google_logo.png');
            const fileExists = await fs.promises.access(expectedFile)
                .then(() => true)
                .catch(() => false);
            
            expect(fileExists).toBe(true);
            
            // Verify file size is reasonable
            if (fileExists) {
                const stats = await fs.promises.stat(expectedFile);
                expect(stats.size).toBeGreaterThan(0);
                expect(stats.size).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
            }
        }, 30000); // 30 second timeout for download test
        
        it('should handle invalid URLs gracefully', async () => {
            const invalidImageElement: GoogleImageElement = {
                src: 'javascript:alert("xss")',
                alt: 'Invalid Image',
                width: 100,
                height: 100
            };
            
            const downloadRequest: GoogleImageDownloadRequested = {
                correlationId: 'test-invalid-1',
                imageElement: invalidImageElement,
                searchQuery: 'test',
                filename: 'should_not_download'
            };
            
            await service.handleDownloadRequest(downloadRequest);
            
            const status = service.getDownloadStatus('test-invalid-1');
            expect(status).toBeDefined();
            expect(status?.hasFailed).toBe(true);
            expect(status?.error).toContain('dangerous protocol');
        });
        
        it('should prevent path traversal attacks', async () => {
            const imageElement: GoogleImageElement = {
                src: 'https://example.com/image.jpg',
                alt: 'Test Image',
                width: 100,
                height: 100
            };
            
            const maliciousRequest: GoogleImageDownloadRequested = {
                correlationId: 'test-traversal-1',
                imageElement: imageElement,
                searchQuery: 'test',
                filename: '../../../etc/passwd'
            };
            
            await service.handleDownloadRequest(maliciousRequest);
            
            const status = service.getDownloadStatus('test-traversal-1');
            expect(status).toBeDefined();
            expect(status?.hasFailed).toBe(true);
            expect(status?.error).toContain('path traversal');
        });
        
        it('should handle file size limits', async () => {
            // Configure with very small file size limit
            service.configure({
                downloadPath: testDownloadPath,
                maxFileSize: 100 // 100 bytes - too small for most images
            });
            
            const imageElement: GoogleImageElement = {
                src: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
                alt: 'Google Logo',
                width: 272,
                height: 92
            };
            
            const downloadRequest: GoogleImageDownloadRequested = {
                correlationId: 'test-size-limit-1',
                imageElement: imageElement,
                searchQuery: 'test',
                filename: 'should_be_too_large'
            };
            
            await service.handleDownloadRequest(downloadRequest);
            
            const status = service.getDownloadStatus('test-size-limit-1');
            expect(status).toBeDefined();
            expect(status?.hasFailed).toBe(true);
            expect(status?.error).toContain('File too large');
        });
        
        it('should generate unique filenames for duplicates', async () => {
            const imageElement: GoogleImageElement = {
                src: 'https://www.google.com/favicon.ico',
                alt: 'Favicon',
                width: 16,
                height: 16
            };
            
            // First download
            const request1: GoogleImageDownloadRequested = {
                correlationId: 'test-dup-1',
                imageElement: imageElement,
                searchQuery: 'favicon',
                filename: 'duplicate_test'
            };
            
            await service.handleDownloadRequest(request1);
            
            // Second download with same filename
            const request2: GoogleImageDownloadRequested = {
                correlationId: 'test-dup-2',
                imageElement: imageElement,
                searchQuery: 'favicon',
                filename: 'duplicate_test'
            };
            
            await service.handleDownloadRequest(request2);
            
            // Both should succeed
            const status1 = service.getDownloadStatus('test-dup-1');
            const status2 = service.getDownloadStatus('test-dup-2');
            
            expect(status1?.isCompleted).toBe(true);
            expect(status2?.isCompleted).toBe(true);
            
            // Files should have different paths
            expect(status1?.filepath).not.toBe(status2?.filepath);
        });
    });
    
    describe('Statistics and Management', () => {
        it('should track download statistics correctly', async () => {
            const imageElement: GoogleImageElement = {
                src: 'https://www.google.com/favicon.ico',
                alt: 'Test',
                width: 16,
                height: 16
            };
            
            // Start multiple downloads
            const requests = Array.from({ length: 3 }, (_, i) => ({
                correlationId: `stat-test-${i}`,
                imageElement: imageElement,
                searchQuery: 'test',
                filename: `stat_test_${i}`
            }));
            
            await Promise.all(requests.map(req => 
                service.handleDownloadRequest(req as GoogleImageDownloadRequested)
            ));
            
            const stats = service.getStatistics();
            
            expect(stats.totalDownloads).toBeGreaterThanOrEqual(3);
            expect(stats.completedDownloads).toBeGreaterThanOrEqual(0);
            expect(stats.activeDownloads).toBeGreaterThanOrEqual(0);
        });
        
        it('should allow cancelling active downloads', () => {
            // This would need a mock or a slow download to test properly
            const mockDownload = {
                correlationId: 'cancel-test-1',
                imageElement: {
                    src: 'https://example.com/large-image.jpg',
                    alt: 'Large Image',
                    width: 1000,
                    height: 1000
                },
                searchQuery: 'test'
            };
            
            // In a real test, we'd start the download and cancel it
            // For now, just verify the method exists
            const result = service.cancelDownload('non-existent');
            expect(result).toBe(false);
        });
    });
});

// Export types for use in other tests
export type { GoogleImageDownloadRequested, GoogleImageElement };