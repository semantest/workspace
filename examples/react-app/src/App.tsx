import React, { useState } from 'react';
import { 
  useSemantestClient, 
  ConnectionStatus, 
  TestMonitor, 
  TestRunner 
} from '@semantest/client';

function App() {
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  
  // Initialize Semantest client
  const { client, connected, connecting, error } = useSemantestClient({
    url: 'ws://localhost:8080',
    reconnect: true,
    defaultMetadata: {
      source: 'react-example-app',
      browser: {
        name: 'Chrome',
        version: '120',
        platform: navigator.platform,
        userAgent: navigator.userAgent
      }
    }
  });

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Semantest React Example
          </h1>
          <p className="text-gray-600">
            Real-time test monitoring and execution dashboard
          </p>
        </div>

        {/* Connection Status */}
        <ConnectionStatus
          connected={connected}
          connecting={connecting}
          error={error}
          url="ws://localhost:8080"
          className="mb-6"
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Runner */}
          <div className="lg:col-span-1">
            <TestRunner
              client={client}
              onTestStart={setActiveRunId}
            />
          </div>

          {/* Test Monitor */}
          <div className="lg:col-span-2">
            <TestMonitor
              client={client}
            />
          </div>
        </div>

        {/* Active Run Info */}
        {activeRunId && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Active test run: <span className="font-mono font-medium">{activeRunId}</span>
            </p>
          </div>
        )}

        {/* Demo Instructions */}
        <div className="mt-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Getting Started
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Make sure the Semantest WebSocket server is running on port 8080</li>
            <li>Enter a test suite name (e.g., "smoke-tests") in the Test Runner</li>
            <li>Click "Start Test Run" to begin test execution</li>
            <li>Watch real-time test results appear in the Test Monitor</li>
            <li>Use the filter buttons to view specific test statuses</li>
          </ol>
          
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Example Test Events
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              The client listens for events matching the pattern "test.*" including:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><code className="font-mono">test.started</code> - When a test begins</li>
              <li><code className="font-mono">test.completed</code> - When a test finishes</li>
              <li><code className="font-mono">test.skipped</code> - When a test is skipped</li>
              <li><code className="font-mono">test.progress</code> - Overall test progress updates</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;