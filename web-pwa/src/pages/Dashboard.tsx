import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { PullToRefresh, TouchButton, Swipeable } from '../components/TouchOptimized';
import { getOfflineDB } from '../services/offline-db';
import { getSyncService } from '../services/sync-service';
import 'react-lazy-load-image-component/src/effects/blur.css';

interface DashboardStats {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  pendingTests: number;
  recentActivity: Array<{
    id: string;
    type: 'test_run' | 'test_created' | 'project_updated';
    title: string;
    timestamp: Date;
  }>;
}

export const Dashboard: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<string>('');

  const { data: stats, refetch } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Try online first
      try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
          return response.json();
        }
      } catch (error) {
        console.log('Fetching from offline DB');
      }

      // Fallback to offline
      const db = await getOfflineDB();
      const tests = await db.getAllTests();
      
      return {
        totalTests: tests.length,
        passedTests: tests.filter(t => t.status === 'completed').length,
        failedTests: tests.filter(t => t.status === 'failed').length,
        pendingTests: tests.filter(t => t.status === 'pending').length,
        recentActivity: [],
      };
    },
  });

  const handleRefresh = async () => {
    setSyncStatus('Syncing...');
    const syncService = getSyncService();
    const result = await syncService.syncAll();
    setSyncStatus(`Synced ${result.synced} items`);
    await refetch();
    
    setTimeout(() => setSyncStatus(''), 3000);
  };

  const statCards = [
    {
      label: 'Total Tests',
      value: stats?.totalTests || 0,
      color: 'bg-blue-500',
      icon: '📊',
    },
    {
      label: 'Passed',
      value: stats?.passedTests || 0,
      color: 'bg-green-500',
      icon: '✅',
    },
    {
      label: 'Failed',
      value: stats?.failedTests || 0,
      color: 'bg-red-500',
      icon: '❌',
    },
    {
      label: 'Pending',
      value: stats?.pendingTests || 0,
      color: 'bg-yellow-500',
      icon: '⏳',
    },
  ];

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
      <div className="px-4 py-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back to Semantest</p>
          {syncStatus && (
            <p className="text-sm text-indigo-600 mt-2 animate-pulse">{syncStatus}</p>
          )}
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <Swipeable
              key={stat.label}
              className="transform transition-transform active:scale-95"
            >
              <div className={`${stat.color} rounded-2xl p-6 text-white shadow-lg`}>
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm opacity-90">{stat.label}</div>
              </div>
            </Swipeable>
          ))}
        </div>

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <TouchButton className="w-full justify-start" size="lg">
              <span className="mr-3">🚀</span> Create New Test
            </TouchButton>
            <TouchButton variant="secondary" className="w-full justify-start" size="lg">
              <span className="mr-3">📁</span> Browse Projects
            </TouchButton>
            <TouchButton variant="secondary" className="w-full justify-start" size="lg">
              <span className="mr-3">📈</span> View Reports
            </TouchButton>
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          {stats?.recentActivity.length === 0 ? (
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <LazyLoadImage
                src="/icons/empty-state.svg"
                alt="No activity"
                effect="blur"
                className="w-32 h-32 mx-auto mb-4 opacity-50"
              />
              <p className="text-gray-600">No recent activity</p>
              <p className="text-sm text-gray-500 mt-2">
                Start by creating your first test
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats?.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
                >
                  <h3 className="font-medium">{activity.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(activity.timestamp).toRelativeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PullToRefresh>
  );
};

// Add relative time formatting
declare global {
  interface Date {
    toRelativeString(): string;
  }
}

Date.prototype.toRelativeString = function() {
  const seconds = Math.floor((new Date().getTime() - this.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  
  return this.toLocaleDateString();
};