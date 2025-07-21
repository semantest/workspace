import React, { useState, useCallback } from 'react';
import { useRequest } from '../hooks/use-semantest';
import { SemantestClient } from '../semantest-client';

interface TestConfig {
  testSuite: string;
  browser?: string;
  parallel?: boolean;
  timeout?: number;
}

interface TestRunnerProps {
  client: SemantestClient | null;
  onTestStart?: (runId: string) => void;
  className?: string;
}

export const TestRunner: React.FC<TestRunnerProps> = ({ 
  client, 
  onTestStart,
  className = '' 
}) => {
  const [config, setConfig] = useState<TestConfig>({
    testSuite: '',
    browser: 'chrome',
    parallel: true,
    timeout: 30000
  });
  
  const { execute: startTests, loading, error } = useRequest(client);
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!config.testSuite) {
      return;
    }
    
    const response = await startTests('test.run', config);
    if (response && onTestStart) {
      onTestStart((response as any).runId);
    }
  }, [config, startTests, onTestStart]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };
  
  if (!client) {
    return (
      <div className={`p-6 bg-gray-50 rounded-lg ${className}`}>
        <p className="text-gray-500">Waiting for client connection...</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Run Tests</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Test Suite */}
          <div>
            <label htmlFor="testSuite" className="block text-sm font-medium text-gray-700 mb-1">
              Test Suite
            </label>
            <input
              type="text"
              id="testSuite"
              name="testSuite"
              value={config.testSuite}
              onChange={handleInputChange}
              placeholder="e.g., smoke-tests, regression-suite"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          {/* Browser Selection */}
          <div>
            <label htmlFor="browser" className="block text-sm font-medium text-gray-700 mb-1">
              Browser
            </label>
            <select
              id="browser"
              name="browser"
              value={config.browser}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="chrome">Chrome</option>
              <option value="firefox">Firefox</option>
              <option value="safari">Safari</option>
              <option value="edge">Edge</option>
            </select>
          </div>
          
          {/* Timeout */}
          <div>
            <label htmlFor="timeout" className="block text-sm font-medium text-gray-700 mb-1">
              Timeout (ms)
            </label>
            <input
              type="number"
              id="timeout"
              name="timeout"
              value={config.timeout}
              onChange={handleInputChange}
              min="1000"
              max="300000"
              step="1000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Parallel Execution */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="parallel"
              name="parallel"
              checked={config.parallel}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="parallel" className="ml-2 block text-sm text-gray-700">
              Run tests in parallel
            </label>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error.message}</p>
            </div>
          )}
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !config.testSuite}
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              loading || !config.testSuite
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Starting Tests...' : 'Start Test Run'}
          </button>
        </form>
      </div>
    </div>
  );
};