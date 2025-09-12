#!/usr/bin/env node

/**
 * Performance Benchmark Suite for ChatGPT Image Generation System
 * 
 * This suite measures:
 * - Response times under various loads
 * - Memory usage patterns
 * - CPU utilization
 * - Throughput capabilities
 * - Resource leak detection
 * - Stress testing limits
 */

const { performance } = require('perf_hooks');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const WebSocket = require('ws');
const EventEmitter = require('events');

class PerformanceBenchmark extends EventEmitter {
  constructor() {
    super();
    this.results = [];
    this.metrics = {
      responseTime: [],
      memoryUsage: [],
      cpuUsage: [],
      throughput: [],
      errors: []
    };
    
    this.config = {
      eventServerUrl: 'ws://localhost:8082/ws-events',
      warmupRequests: 5,
      testDuration: 60000, // 1 minute
      maxConcurrency: 20,
      memoryCheckInterval: 1000, // 1 second
      cpuCheckInterval: 500, // 0.5 seconds
      resultsDir: './tests/benchmark-results'
    };
  }

  async run() {
    console.log('🚀 Starting Performance Benchmark Suite\n');
    
    try {
      await this.setupEnvironment();
      
      // Warm up the system
      await this.warmupSystem();
      
      // Run benchmark tests
      await this.runResponseTimeBenchmark();
      await this.runThroughputBenchmark();
      await this.runConcurrencyBenchmark();
      await this.runMemoryStressBenchmark();
      await this.runSustainedLoadBenchmark();
      await this.runResourceLeakDetection();
      
      // Generate comprehensive report
      await this.generateBenchmarkReport();
      
    } catch (error) {
      console.error('❌ Benchmark suite failed:', error);
      process.exit(1);
    }
  }

  async setupEnvironment() {
    console.log('📋 Setting up benchmark environment...');
    
    try {
      await fs.mkdir(this.config.resultsDir, { recursive: true });
      
      // Start monitoring system resources
      this.startResourceMonitoring();
      
      console.log('✅ Environment ready\n');
    } catch (error) {
      throw new Error(`Environment setup failed: ${error.message}`);
    }
  }

  startResourceMonitoring() {
    // Memory monitoring
    this.memoryMonitor = setInterval(() => {
      const memUsage = process.memoryUsage();
      const systemMem = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      };
      
      this.metrics.memoryUsage.push({
        timestamp: Date.now(),
        process: memUsage,
        system: systemMem,
        heapUtilization: (memUsage.heapUsed / memUsage.heapTotal) * 100
      });
    }, this.config.memoryCheckInterval);

    // CPU monitoring
    let lastCpuUsage = process.cpuUsage();
    this.cpuMonitor = setInterval(() => {
      const currentCpuUsage = process.cpuUsage(lastCpuUsage);
      const cpuPercent = (currentCpuUsage.user + currentCpuUsage.system) / 1000000 * 100;
      
      this.metrics.cpuUsage.push({
        timestamp: Date.now(),
        percent: cpuPercent,
        system: os.loadavg()
      });
      
      lastCpuUsage = process.cpuUsage();
    }, this.config.cpuCheckInterval);
  }

  async warmupSystem() {
    console.log('🔥 Warming up system...');
    
    const warmupRequests = [];
    for (let i = 0; i < this.config.warmupRequests; i++) {
      warmupRequests.push(this.createTestRequest({
        prompt: `Warmup request ${i}`,
        fileName: `warmup-${i}.png`
      }));
    }
    
    await Promise.allSettled(warmupRequests);
    console.log('✅ System warmup complete\n');
  }

  async runResponseTimeBenchmark() {
    console.log('⏱️  Response Time Benchmark');
    console.log('================================');
    
    const testSizes = [
      { name: 'Small Prompt', size: 50 },
      { name: 'Medium Prompt', size: 200 },
      { name: 'Large Prompt', size: 500 },
      { name: 'Extra Large Prompt', size: 1000 }
    ];
    
    for (const testSize of testSizes) {
      console.log(`Testing ${testSize.name} (${testSize.size} chars)...`);
      
      const prompt = 'A beautiful landscape painting with mountains and rivers '.repeat(
        Math.ceil(testSize.size / 60)
      ).substring(0, testSize.size);
      
      const times = [];
      const iterations = 10;
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        try {
          await this.createTestRequest({
            prompt,
            fileName: `response-test-${testSize.name}-${i}.png`,
            timeout: 30000
          });
          
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          times.push(responseTime);
          
        } catch (error) {
          console.log(`  Request ${i + 1} failed: ${error.message}`);
          this.metrics.errors.push({
            test: 'Response Time',
            error: error.message,
            timestamp: Date.now()
          });
        }
      }
      
      if (times.length > 0) {
        const stats = this.calculateStatistics(times);
        this.results.push({
          test: 'Response Time',
          category: testSize.name,
          stats
        });
        
        console.log(`  Average: ${stats.mean.toFixed(2)}ms`);
        console.log(`  Median: ${stats.median.toFixed(2)}ms`);
        console.log(`  Min: ${stats.min.toFixed(2)}ms`);
        console.log(`  Max: ${stats.max.toFixed(2)}ms`);
        console.log(`  95th percentile: ${stats.p95.toFixed(2)}ms`);
      }
    }
    
    console.log('');
  }

  async runThroughputBenchmark() {
    console.log('📊 Throughput Benchmark');
    console.log('========================');
    
    const durations = [10000, 30000, 60000]; // 10s, 30s, 1min
    
    for (const duration of durations) {
      console.log(`Testing throughput for ${duration / 1000} seconds...`);
      
      const startTime = Date.now();
      let requestCount = 0;
      let successCount = 0;
      let errorCount = 0;
      
      const promises = [];
      
      // Keep sending requests until duration expires
      while (Date.now() - startTime < duration) {
        const promise = this.createTestRequest({
          prompt: `Throughput test request ${requestCount}`,
          fileName: `throughput-${requestCount}.png`,
          timeout: 15000
        }).then(() => {
          successCount++;
        }).catch(() => {
          errorCount++;
        });
        
        promises.push(promise);
        requestCount++;
        
        // Small delay to prevent overwhelming
        await this.delay(100);
      }
      
      // Wait for all requests to complete
      await Promise.allSettled(promises);
      
      const actualDuration = Date.now() - startTime;
      const throughput = (requestCount / actualDuration) * 1000; // requests per second
      const successRate = (successCount / requestCount) * 100;
      
      this.results.push({
        test: 'Throughput',
        category: `${duration / 1000}s test`,
        metrics: {
          totalRequests: requestCount,
          successfulRequests: successCount,
          failedRequests: errorCount,
          duration: actualDuration,
          throughput,
          successRate
        }
      });
      
      console.log(`  Requests: ${requestCount}`);
      console.log(`  Successful: ${successCount}`);
      console.log(`  Failed: ${errorCount}`);
      console.log(`  Throughput: ${throughput.toFixed(2)} req/s`);
      console.log(`  Success Rate: ${successRate.toFixed(2)}%`);
    }
    
    console.log('');
  }

  async runConcurrencyBenchmark() {
    console.log('🔄 Concurrency Benchmark');
    console.log('=========================');
    
    const concurrencyLevels = [1, 5, 10, 15, 20];
    
    for (const concurrency of concurrencyLevels) {
      console.log(`Testing with ${concurrency} concurrent requests...`);
      
      const startTime = performance.now();
      const promises = [];
      
      for (let i = 0; i < concurrency; i++) {
        const promise = this.createTestRequest({
          prompt: `Concurrent request ${i} at level ${concurrency}`,
          fileName: `concurrent-${concurrency}-${i}.png`,
          timeout: 45000
        });
        promises.push(promise);
      }
      
      const results = await Promise.allSettled(promises);
      const endTime = performance.now();
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrency;
      
      this.results.push({
        test: 'Concurrency',
        category: `${concurrency} concurrent`,
        metrics: {
          concurrency,
          successful,
          failed,
          totalTime,
          averageTime,
          successRate: (successful / concurrency) * 100
        }
      });
      
      console.log(`  Successful: ${successful}/${concurrency}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average time: ${averageTime.toFixed(2)}ms`);
      console.log(`  Success rate: ${((successful / concurrency) * 100).toFixed(2)}%`);
    }
    
    console.log('');
  }

  async runMemoryStressBenchmark() {
    console.log('💾 Memory Stress Test');
    console.log('======================');
    
    const initialMemory = process.memoryUsage();
    console.log(`Initial memory usage: ${this.formatBytes(initialMemory.heapUsed)}`);
    
    // Run many requests to test memory usage
    const stressRequests = 50;
    const batchSize = 10;
    
    for (let batch = 0; batch < stressRequests / batchSize; batch++) {
      console.log(`Running batch ${batch + 1}/${stressRequests / batchSize}...`);
      
      const batchPromises = [];
      for (let i = 0; i < batchSize; i++) {
        batchPromises.push(this.createTestRequest({
          prompt: `Memory stress test batch ${batch} request ${i}`,
          fileName: `memory-stress-${batch}-${i}.png`,
          timeout: 20000
        }).catch(() => {})); // Ignore individual failures
      }
      
      await Promise.allSettled(batchPromises);
      
      // Check memory usage after each batch
      const currentMemory = process.memoryUsage();
      const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`  Memory after batch ${batch + 1}: ${this.formatBytes(currentMemory.heapUsed)} (+${this.formatBytes(memoryIncrease)})`);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        const afterGcMemory = process.memoryUsage();
        console.log(`  Memory after GC: ${this.formatBytes(afterGcMemory.heapUsed)}`);
      }
      
      // Small delay between batches
      await this.delay(1000);
    }
    
    const finalMemory = process.memoryUsage();
    const totalMemoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    this.results.push({
      test: 'Memory Stress',
      category: 'Full Test',
      metrics: {
        initialMemory: initialMemory.heapUsed,
        finalMemory: finalMemory.heapUsed,
        memoryIncrease: totalMemoryIncrease,
        memoryIncreasePercent: (totalMemoryIncrease / initialMemory.heapUsed) * 100
      }
    });
    
    console.log(`Final memory increase: ${this.formatBytes(totalMemoryIncrease)} (${((totalMemoryIncrease / initialMemory.heapUsed) * 100).toFixed(2)}%)`);
    console.log('');
  }

  async runSustainedLoadBenchmark() {
    console.log('⏳ Sustained Load Test');
    console.log('=======================');
    
    const testDuration = 120000; // 2 minutes
    const requestInterval = 2000; // One request every 2 seconds
    
    console.log(`Running sustained load for ${testDuration / 1000} seconds...`);
    
    const startTime = Date.now();
    let requestCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    const responseTimeHistory = [];
    
    while (Date.now() - startTime < testDuration) {
      const requestStart = performance.now();
      
      try {
        await this.createTestRequest({
          prompt: `Sustained load request ${requestCount}`,
          fileName: `sustained-${requestCount}.png`,
          timeout: 30000
        });
        
        const requestTime = performance.now() - requestStart;
        responseTimeHistory.push(requestTime);
        successCount++;
        
      } catch (error) {
        errorCount++;
        this.metrics.errors.push({
          test: 'Sustained Load',
          error: error.message,
          timestamp: Date.now()
        });
      }
      
      requestCount++;
      
      // Log progress every 10 requests
      if (requestCount % 10 === 0) {
        const elapsed = Date.now() - startTime;
        console.log(`  ${requestCount} requests in ${(elapsed / 1000).toFixed(1)}s (${successCount} success, ${errorCount} errors)`);
      }
      
      // Wait for next interval
      await this.delay(requestInterval);
    }
    
    const totalDuration = Date.now() - startTime;
    const averageResponseTime = responseTimeHistory.length > 0 
      ? responseTimeHistory.reduce((a, b) => a + b, 0) / responseTimeHistory.length 
      : 0;
    
    this.results.push({
      test: 'Sustained Load',
      category: 'Full Test',
      metrics: {
        duration: totalDuration,
        totalRequests: requestCount,
        successfulRequests: successCount,
        failedRequests: errorCount,
        averageResponseTime,
        throughput: (requestCount / totalDuration) * 1000,
        successRate: (successCount / requestCount) * 100
      }
    });
    
    console.log(`Completed ${requestCount} requests in ${(totalDuration / 1000).toFixed(1)} seconds`);
    console.log(`Success rate: ${((successCount / requestCount) * 100).toFixed(2)}%`);
    console.log(`Average response time: ${averageResponseTime.toFixed(2)}ms`);
    console.log('');
  }

  async runResourceLeakDetection() {
    console.log('🔍 Resource Leak Detection');
    console.log('===========================');
    
    // Capture baseline metrics
    const baseline = {
      memory: process.memoryUsage(),
      handles: process._getActiveHandles().length,
      requests: process._getActiveRequests().length
    };
    
    console.log('Baseline metrics:');
    console.log(`  Memory: ${this.formatBytes(baseline.memory.heapUsed)}`);
    console.log(`  Active handles: ${baseline.handles}`);
    console.log(`  Active requests: ${baseline.requests}`);
    
    // Run a series of operations
    const operations = 30;
    for (let i = 0; i < operations; i++) {
      try {
        await this.createTestRequest({
          prompt: `Leak detection test ${i}`,
          fileName: `leak-test-${i}.png`,
          timeout: 15000
        });
      } catch (error) {
        // Ignore individual failures for this test
      }
      
      if (i % 10 === 0) {
        const current = {
          memory: process.memoryUsage(),
          handles: process._getActiveHandles().length,
          requests: process._getActiveRequests().length
        };
        
        console.log(`After ${i} operations:`);
        console.log(`  Memory: ${this.formatBytes(current.memory.heapUsed)} (+${this.formatBytes(current.memory.heapUsed - baseline.memory.heapUsed)})`);
        console.log(`  Active handles: ${current.handles} (+${current.handles - baseline.handles})`);
        console.log(`  Active requests: ${current.requests} (+${current.requests - baseline.requests})`);
      }
    }
    
    // Force garbage collection and wait
    if (global.gc) {
      global.gc();
    }
    await this.delay(5000); // Wait 5 seconds
    
    const final = {
      memory: process.memoryUsage(),
      handles: process._getActiveHandles().length,
      requests: process._getActiveRequests().length
    };
    
    const leakMetrics = {
      memoryLeak: final.memory.heapUsed - baseline.memory.heapUsed,
      handleLeak: final.handles - baseline.handles,
      requestLeak: final.requests - baseline.requests
    };
    
    this.results.push({
      test: 'Resource Leak Detection',
      category: 'Full Test',
      metrics: {
        baseline,
        final,
        leaks: leakMetrics,
        operations
      }
    });
    
    console.log('Final leak analysis:');
    console.log(`  Memory leak: ${this.formatBytes(leakMetrics.memoryLeak)}`);
    console.log(`  Handle leak: ${leakMetrics.handleLeak}`);
    console.log(`  Request leak: ${leakMetrics.requestLeak}`);
    
    // Determine if leaks are significant
    const memoryLeakPercent = (leakMetrics.memoryLeak / baseline.memory.heapUsed) * 100;
    if (memoryLeakPercent > 10) {
      console.log(`⚠️  Potential memory leak detected: ${memoryLeakPercent.toFixed(2)}% increase`);
    } else {
      console.log(`✅ No significant memory leak detected`);
    }
    
    console.log('');
  }

  async createTestRequest(testCase) {
    return new Promise((resolve, reject) => {
      let client;
      const timeout = setTimeout(() => {
        if (client) client.close();
        reject(new Error('Request timeout'));
      }, testCase.timeout || 30000);

      try {
        client = new WebSocket(this.config.eventServerUrl);

        client.on('open', () => {
          // Authenticate
          client.send(JSON.stringify({
            type: 'authenticate',
            clientType: 'performance-benchmark',
            metadata: { benchmark: true }
          }));

          // Send image generation request
          const request = {
            type: 'ImageGenerationRequestedEvent',
            requestId: `benchmark-${Date.now()}-${Math.random()}`,
            prompt: testCase.prompt,
            fileName: testCase.fileName,
            downloadFolder: './tests/benchmark-images',
            model: 'dall-e-3'
          };

          client.send(JSON.stringify(request));
        });

        client.on('message', (data) => {
          const message = JSON.parse(data);

          if (message.type === 'ImageGenerated' || message.type === 'command_accepted') {
            clearTimeout(timeout);
            client.close();
            resolve(message);
          } else if (message.type === 'error' || message.error) {
            clearTimeout(timeout);
            client.close();
            reject(new Error(message.error || message.message || 'Unknown error'));
          }
        });

        client.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  calculateStatistics(values) {
    const sorted = values.sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      mean,
      median,
      min,
      max,
      p95,
      stdDev,
      count: values.length
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async generateBenchmarkReport() {
    console.log('📋 Generating Benchmark Report');
    console.log('===============================');
    
    // Stop resource monitoring
    if (this.memoryMonitor) clearInterval(this.memoryMonitor);
    if (this.cpuMonitor) clearInterval(this.cpuMonitor);
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem()
      },
      configuration: this.config,
      results: this.results,
      metrics: {
        memoryUsage: this.metrics.memoryUsage,
        cpuUsage: this.metrics.cpuUsage,
        errors: this.metrics.errors
      },
      summary: this.generateSummary()
    };
    
    // Save detailed report
    const reportPath = path.join(this.config.resultsDir, `benchmark-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Generate human-readable summary
    const summaryPath = path.join(this.config.resultsDir, `benchmark-summary-${Date.now()}.txt`);
    await fs.writeFile(summaryPath, this.generateTextSummary(report));
    
    console.log(`✅ Detailed report saved: ${reportPath}`);
    console.log(`✅ Summary report saved: ${summaryPath}`);
    
    // Print key findings
    this.printBenchmarkSummary(report);
    
    return report;
  }

  generateSummary() {
    const summary = {
      totalTests: this.results.length,
      performance: {},
      resourceUsage: {},
      recommendations: []
    };
    
    // Response time summary
    const responseTimeTests = this.results.filter(r => r.test === 'Response Time');
    if (responseTimeTests.length > 0) {
      const allTimes = responseTimeTests.flatMap(t => [t.stats.mean]);
      summary.performance.averageResponseTime = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
      summary.performance.maxResponseTime = Math.max(...allTimes);
      summary.performance.minResponseTime = Math.min(...allTimes);
    }
    
    // Throughput summary
    const throughputTests = this.results.filter(r => r.test === 'Throughput');
    if (throughputTests.length > 0) {
      const throughputs = throughputTests.map(t => t.metrics.throughput);
      summary.performance.maxThroughput = Math.max(...throughputs);
      summary.performance.averageThroughput = throughputs.reduce((a, b) => a + b, 0) / throughputs.length;
    }
    
    // Memory usage summary
    if (this.metrics.memoryUsage.length > 0) {
      const memValues = this.metrics.memoryUsage.map(m => m.process.heapUsed);
      summary.resourceUsage.peakMemory = Math.max(...memValues);
      summary.resourceUsage.averageMemory = memValues.reduce((a, b) => a + b, 0) / memValues.length;
    }
    
    // Generate recommendations
    if (summary.performance.averageResponseTime > 30000) {
      summary.recommendations.push('Response times are high - consider performance optimization');
    }
    
    if (this.metrics.errors.length > this.results.length * 0.05) {
      summary.recommendations.push('Error rate is concerning - improve error handling');
    }
    
    const memoryLeakTest = this.results.find(r => r.test === 'Resource Leak Detection');
    if (memoryLeakTest && memoryLeakTest.metrics.leaks.memoryLeak > 50 * 1024 * 1024) {
      summary.recommendations.push('Potential memory leak detected - investigate resource cleanup');
    }
    
    if (summary.recommendations.length === 0) {
      summary.recommendations.push('Performance is within acceptable limits');
    }
    
    return summary;
  }

  generateTextSummary(report) {
    let summary = `PERFORMANCE BENCHMARK REPORT\n`;
    summary += `Generated: ${report.timestamp}\n`;
    summary += `Environment: Node.js ${report.environment.nodeVersion} on ${report.environment.platform}\n\n`;
    
    summary += `PERFORMANCE SUMMARY\n`;
    summary += `===================\n`;
    if (report.summary.performance.averageResponseTime) {
      summary += `Average Response Time: ${report.summary.performance.averageResponseTime.toFixed(2)}ms\n`;
    }
    if (report.summary.performance.maxThroughput) {
      summary += `Max Throughput: ${report.summary.performance.maxThroughput.toFixed(2)} req/s\n`;
    }
    if (report.summary.resourceUsage.peakMemory) {
      summary += `Peak Memory Usage: ${this.formatBytes(report.summary.resourceUsage.peakMemory)}\n`;
    }
    summary += `Total Errors: ${report.metrics.errors.length}\n\n`;
    
    summary += `DETAILED RESULTS\n`;
    summary += `================\n`;
    for (const result of report.results) {
      summary += `${result.test} - ${result.category}:\n`;
      
      if (result.stats) {
        summary += `  Mean: ${result.stats.mean.toFixed(2)}ms\n`;
        summary += `  95th Percentile: ${result.stats.p95.toFixed(2)}ms\n`;
      }
      
      if (result.metrics) {
        for (const [key, value] of Object.entries(result.metrics)) {
          if (typeof value === 'number') {
            summary += `  ${key}: ${typeof value === 'number' && key.includes('Time') ? value.toFixed(2) + 'ms' : value}\n`;
          }
        }
      }
      
      summary += '\n';
    }
    
    summary += `RECOMMENDATIONS\n`;
    summary += `===============\n`;
    for (const rec of report.summary.recommendations) {
      summary += `• ${rec}\n`;
    }
    
    return summary;
  }

  printBenchmarkSummary(report) {
    console.log('\n🏆 BENCHMARK RESULTS SUMMARY');
    console.log('============================');
    
    if (report.summary.performance.averageResponseTime) {
      console.log(`Average Response Time: ${report.summary.performance.averageResponseTime.toFixed(2)}ms`);
    }
    
    if (report.summary.performance.maxThroughput) {
      console.log(`Max Throughput: ${report.summary.performance.maxThroughput.toFixed(2)} req/s`);
    }
    
    if (report.summary.resourceUsage.peakMemory) {
      console.log(`Peak Memory: ${this.formatBytes(report.summary.resourceUsage.peakMemory)}`);
    }
    
    console.log(`Total Errors: ${report.metrics.errors.length}`);
    
    console.log('\n📝 Recommendations:');
    for (const rec of report.summary.recommendations) {
      console.log(`  • ${rec}`);
    }
    
    // Performance assessment
    const avgResponseTime = report.summary.performance.averageResponseTime || 0;
    const errorRate = (report.metrics.errors.length / report.results.length) * 100;
    
    console.log('\n🎯 Performance Assessment:');
    if (avgResponseTime < 10000 && errorRate < 5) {
      console.log('  ✅ EXCELLENT - System performs well under load');
    } else if (avgResponseTime < 30000 && errorRate < 10) {
      console.log('  ⚠️  ACCEPTABLE - Some optimization may be beneficial');
    } else {
      console.log('  ❌ NEEDS IMPROVEMENT - Performance issues detected');
    }
    
    console.log('\n✅ Benchmark complete!');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  cleanup() {
    if (this.memoryMonitor) clearInterval(this.memoryMonitor);
    if (this.cpuMonitor) clearInterval(this.cpuMonitor);
  }
}

// Run benchmark if executed directly
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  
  // Handle cleanup on exit
  process.on('SIGINT', () => {
    console.log('\n🛑 Benchmark interrupted');
    benchmark.cleanup();
    process.exit(0);
  });
  
  benchmark.run().then(() => {
    benchmark.cleanup();
    process.exit(0);
  }).catch(error => {
    console.error('Benchmark failed:', error);
    benchmark.cleanup();
    process.exit(1);
  });
}

module.exports = PerformanceBenchmark;