import React, { useState, useMemo } from 'react';
import { useEventCollector, useEventValue } from '../hooks/use-semantest';
import { SemantestClient } from '../semantest-client';

interface TestResult {
  testId: string;
  name: string;
  status: 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
}

interface TestProgress {
  total: number;
  completed: number;
  passed: number;
  failed: number;
  skipped: number;
}

interface TestMonitorProps {
  client: SemantestClient | null;
  className?: string;
}

export const TestMonitor: React.FC<TestMonitorProps> = ({ client, className = '' }) => {
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed' | 'running'>('all');
  
  // Subscribe to test events
  const { events: testEvents, clear: clearEvents } = useEventCollector(client, 'test.*', 100);
  const { value: testProgress } = useEventValue<TestProgress>(client, 'test.progress');
  
  // Process test results from events
  const testResults = useMemo(() => {
    const results = new Map<string, TestResult>();
    
    testEvents.forEach(event => {
      if (event.type === 'test.started') {
        const { testId, name } = event.payload as any;
        results.set(testId, {
          testId,
          name,
          status: 'running'
        });
      } else if (event.type === 'test.completed') {
        const { testId, name, passed, duration, error } = event.payload as any;
        results.set(testId, {
          testId,
          name,
          status: passed ? 'passed' : 'failed',
          duration,
          error
        });
      } else if (event.type === 'test.skipped') {
        const { testId, name } = event.payload as any;
        results.set(testId, {
          testId,
          name,
          status: 'skipped'
        });
      }
    });
    
    return Array.from(results.values());
  }, [testEvents]);
  
  // Filter results
  const filteredResults = useMemo(() => {
    if (filter === 'all') return testResults;
    return testResults.filter(result => result.status === filter);
  }, [testResults, filter]);
  
  // Calculate progress percentage
  const progressPercentage = testProgress 
    ? (testProgress.completed / testProgress.total) * 100 
    : 0;
  
  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'skipped': return 'text-gray-500';
      case 'running': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };
  
  const getStatusBgColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return 'bg-green-100';
      case 'failed': return 'bg-red-100';
      case 'skipped': return 'bg-gray-100';
      case 'running': return 'bg-blue-100';
      default: return 'bg-gray-100';
    }
  };

  if (!client) {
    return (
      <div className={`p-6 bg-gray-50 rounded-lg ${className}`}>
        <p className="text-gray-500">Waiting for client connection...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Test Monitor</h2>
        <button
          onClick={clearEvents}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Clear History
        </button>
      </div>

      {/* Progress Overview */}
      {testProgress && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Progress</h3>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{testProgress.completed} / {testProgress.total} tests</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
          
          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{testProgress.passed}</div>
              <div className="text-sm text-gray-500">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{testProgress.failed}</div>
              <div className="text-sm text-gray-500">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{testProgress.skipped}</div>
              <div className="text-sm text-gray-500">Skipped</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {testProgress.total - testProgress.completed}
              </div>
              <div className="text-sm text-gray-500">Running</div>
            </div>
          </div>
        </div>
      )}

      {/* Test Results */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Test Results</h3>
            
            {/* Filter Tabs */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {(['all', 'passed', 'failed', 'running'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    filter === status
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Test List */}
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {filteredResults.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No tests to display
            </div>
          ) : (
            filteredResults.map(result => (
              <div key={result.testId} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBgColor(result.status)} ${getStatusColor(result.status)}`}>
                      {result.status.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{result.name}</div>
                      {result.error && (
                        <div className="text-sm text-red-600 mt-1">{result.error}</div>
                      )}
                    </div>
                  </div>
                  {result.duration && (
                    <div className="text-sm text-gray-500">
                      {result.duration}ms
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Event Log */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Event Log</h3>
        </div>
        <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
          {testEvents.slice(0, 20).map((event, index) => (
            <div key={`${event.id}-${index}`} className="p-3 hover:bg-gray-50 font-mono text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-blue-600 font-medium">{event.type}</span>
                  <span className="text-gray-500 ml-2">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <div className="text-gray-600 mt-1">
                {JSON.stringify(event.payload, null, 2).substring(0, 100)}...
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};