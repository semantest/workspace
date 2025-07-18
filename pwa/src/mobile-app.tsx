import React, { useState, useEffect } from 'react';
import {
  TouchButton,
  SwipeableCard,
  PullToRefresh,
  BottomSheet,
  FAB,
  MobileSkeleton,
  OfflineIndicator,
  InstallPrompt
} from './mobile-components';
import { useOfflineStorage } from './offline-storage';
import { useSyncService } from './sync-service';

// Main mobile app component
export const MobileApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'tests' | 'results' | 'settings'>('dashboard');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { storage, isInitialized } = useOfflineStorage();
  const { syncStatus, lastSync, triggerSync } = useSyncService();

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OfflineIndicator />
      <InstallPrompt />
      
      <Header syncStatus={syncStatus} />
      
      <main className="pb-16">
        {currentTab === 'dashboard' && <DashboardView />}
        {currentTab === 'tests' && <TestsView onCreateClick={() => setIsCreateModalOpen(true)} />}
        {currentTab === 'results' && <ResultsView />}
        {currentTab === 'settings' && <SettingsView lastSync={lastSync} onSync={triggerSync} />}
      </main>

      <BottomNavigation currentTab={currentTab} onTabChange={setCurrentTab} />
      
      <BottomSheet
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Test"
      >
        <CreateTestForm onClose={() => setIsCreateModalOpen(false)} />
      </BottomSheet>
    </div>
  );
};

// Header component
const Header: React.FC<{ syncStatus: 'idle' | 'syncing' | 'error' }> = ({ syncStatus }) => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-20">
      <div className="px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Semantest</h1>
        {syncStatus === 'syncing' && (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
        )}
        {syncStatus === 'error' && (
          <div className="text-red-500">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </header>
  );
};

// Dashboard view
const DashboardView: React.FC = () => {
  const [stats, setStats] = useState({ total: 0, passed: 0, failed: 0, pending: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStats = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setStats({
      total: 156,
      passed: 124,
      failed: 18,
      pending: 14
    });
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <PullToRefresh onRefresh={loadStats}>
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Test Overview</h2>
        
        {isRefreshing ? (
          <MobileSkeleton type="card" count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Total Tests"
              value={stats.total}
              color="bg-blue-500"
              icon="📊"
            />
            <StatCard
              title="Passed"
              value={stats.passed}
              color="bg-green-500"
              icon="✅"
            />
            <StatCard
              title="Failed"
              value={stats.failed}
              color="bg-red-500"
              icon="❌"
            />
            <StatCard
              title="Pending"
              value={stats.pending}
              color="bg-yellow-500"
              icon="⏳"
            />
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Activity</h3>
          <div className="space-y-3">
            <ActivityItem
              title="Login Flow Test"
              status="passed"
              time="2 minutes ago"
            />
            <ActivityItem
              title="Payment Integration"
              status="failed"
              time="15 minutes ago"
            />
            <ActivityItem
              title="User Dashboard"
              status="running"
              time="Started 5 minutes ago"
            />
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
};

// Tests view
const TestsView: React.FC<{ onCreateClick: () => void }> = ({ onCreateClick }) => {
  const [tests, setTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load tests
    setTimeout(() => {
      setTests([
        { id: '1', name: 'Login Flow', status: 'passed', lastRun: '2 hours ago' },
        { id: '2', name: 'Checkout Process', status: 'failed', lastRun: '1 hour ago' },
        { id: '3', name: 'User Registration', status: 'passed', lastRun: '3 hours ago' }
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleDelete = (id: string) => {
    setTests(tests.filter(test => test.id !== id));
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">All Tests</h2>
      
      {isLoading ? (
        <MobileSkeleton type="list" count={3} />
      ) : (
        <div className="space-y-3">
          {tests.map(test => (
            <SwipeableCard
              key={test.id}
              onSwipeLeft={() => handleDelete(test.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{test.name}</h3>
                  <p className="text-sm text-gray-500">{test.lastRun}</p>
                </div>
                <StatusBadge status={test.status} />
              </div>
            </SwipeableCard>
          ))}
        </div>
      )}

      <FAB
        onClick={onCreateClick}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }
      />
    </div>
  );
};

// Results view
const ResultsView: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h2>
      <div className="space-y-3">
        <ResultItem
          testName="API Integration Suite"
          duration="2m 34s"
          passed={45}
          failed={2}
          timestamp="10:30 AM"
        />
        <ResultItem
          testName="E2E User Journey"
          duration="5m 12s"
          passed={23}
          failed={0}
          timestamp="9:45 AM"
        />
        <ResultItem
          testName="Performance Tests"
          duration="8m 45s"
          passed={12}
          failed={3}
          timestamp="Yesterday"
        />
      </div>
    </div>
  );
};

// Settings view
const SettingsView: React.FC<{
  lastSync: Date | null;
  onSync: () => void;
}> = ({ lastSync, onSync }) => {
  const [notifications, setNotifications] = useState(true);
  const [biometric, setBiometric] = useState(false);

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
      
      <div className="space-y-4">
        <SettingItem
          title="Push Notifications"
          description="Receive alerts for test results"
          toggle={
            <Toggle
              enabled={notifications}
              onChange={setNotifications}
            />
          }
        />
        
        <SettingItem
          title="Biometric Login"
          description="Use Face ID or fingerprint"
          toggle={
            <Toggle
              enabled={biometric}
              onChange={setBiometric}
            />
          }
        />
        
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">Sync Data</h3>
            <TouchButton onClick={onSync} size="small">
              Sync Now
            </TouchButton>
          </div>
          {lastSync && (
            <p className="text-sm text-gray-500">
              Last synced: {lastSync.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <TouchButton variant="danger" fullWidth onClick={() => {}}>
          Sign Out
        </TouchButton>
      </div>
    </div>
  );
};

// Bottom navigation
const BottomNavigation: React.FC<{
  currentTab: string;
  onTabChange: (tab: any) => void;
}> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', icon: '🏠', label: 'Home' },
    { id: 'tests', icon: '🧪', label: 'Tests' },
    { id: 'results', icon: '📊', label: 'Results' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-3 px-2 flex flex-col items-center space-y-1 ${
              currentTab === tab.id ? 'text-indigo-600' : 'text-gray-500'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

// Helper components
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
      <p className="text-gray-600">Loading Semantest...</p>
    </div>
  </div>
);

const StatCard: React.FC<{
  title: string;
  value: number;
  color: string;
  icon: string;
}> = ({ title, value, color, icon }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <span className="text-2xl">{icon}</span>
      <div className={`w-2 h-2 rounded-full ${color}`} />
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-sm text-gray-500">{title}</p>
  </div>
);

const ActivityItem: React.FC<{
  title: string;
  status: 'passed' | 'failed' | 'running';
  time: string;
}> = ({ title, status, time }) => (
  <div className="bg-white rounded-lg p-4 flex items-center justify-between">
    <div className="flex-1">
      <h4 className="font-medium text-gray-900">{title}</h4>
      <p className="text-sm text-gray-500">{time}</p>
    </div>
    <StatusBadge status={status} />
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors = {
    passed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    running: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}>
      {status}
    </span>
  );
};

const ResultItem: React.FC<{
  testName: string;
  duration: string;
  passed: number;
  failed: number;
  timestamp: string;
}> = ({ testName, duration, passed, failed, timestamp }) => (
  <div className="bg-white rounded-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <h3 className="font-medium text-gray-900">{testName}</h3>
      <span className="text-xs text-gray-500">{timestamp}</span>
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4 text-sm">
        <span className="text-green-600">✅ {passed}</span>
        <span className="text-red-600">❌ {failed}</span>
      </div>
      <span className="text-sm text-gray-500">{duration}</span>
    </div>
  </div>
);

const SettingItem: React.FC<{
  title: string;
  description: string;
  toggle: React.ReactNode;
}> = ({ title, description, toggle }) => (
  <div className="bg-white rounded-xl p-4 flex items-center justify-between">
    <div className="flex-1">
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    {toggle}
  </div>
);

const Toggle: React.FC<{
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}> = ({ enabled, onChange }) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      enabled ? 'bg-indigo-600' : 'bg-gray-200'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const CreateTestForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('unit');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Save test
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Test Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter test name"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Test Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="unit">Unit Test</option>
          <option value="integration">Integration Test</option>
          <option value="e2e">End-to-End Test</option>
          <option value="performance">Performance Test</option>
        </select>
      </div>
      
      <div className="flex space-x-3">
        <TouchButton onClick={onClose} variant="secondary" fullWidth>
          Cancel
        </TouchButton>
        <TouchButton type="submit" fullWidth>
          Create Test
        </TouchButton>
      </div>
    </form>
  );
};