import React from 'react';
import { useAuthStore } from '../stores/auth-store';
import { TouchButton } from '../components/TouchOptimized';

export const Settings: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <div className="px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </header>

      <div className="space-y-6">
        {/* Profile Section */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="ml-4">
              <p className="font-medium">{user?.name || 'User'}</p>
              <p className="text-sm text-gray-600">{user?.email || 'user@example.com'}</p>
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Preferences</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span>Push Notifications</span>
              <input type="checkbox" className="toggle" defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span>Offline Mode</span>
              <input type="checkbox" className="toggle" defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span>Auto Sync</span>
              <input type="checkbox" className="toggle" defaultChecked />
            </label>
          </div>
        </section>

        {/* About */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">About</h2>
          <div className="space-y-2 text-sm">
            <p>Version: 2.0.0</p>
            <p>Build: PWA</p>
            <p>© 2025 Semantest Team</p>
          </div>
        </section>

        {/* Actions */}
        <TouchButton
          variant="secondary"
          className="w-full"
          size="lg"
          onClick={logout}
        >
          Sign Out
        </TouchButton>
      </div>
    </div>
  );
};