import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Workbox } from 'workbox-window';
import { Dashboard } from './pages/Dashboard';
import { Tests } from './pages/Tests';
import { Projects } from './pages/Projects';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { useAuthStore } from './stores/auth-store';
import { getSyncService } from './services/sync-service';
import { NetworkStatus } from './components/NetworkStatus';
import { UpdatePrompt } from './components/UpdatePrompt';
import { MobileNav } from './components/MobileNav';
import { InstallPrompt } from './components/InstallPrompt';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

function App() {
  const { isAuthenticated, initialize } = useAuthStore();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Initialize auth
    initialize();

    // Initialize sync service
    const syncService = getSyncService();
    syncService.startPeriodicSync();

    // Register service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      const wb = new Workbox('/service-worker.js');

      wb.addEventListener('waiting', () => {
        setUpdateAvailable(true);
      });

      wb.addEventListener('activated', (event) => {
        if (!event.isUpdate) {
          console.log('Service worker activated for the first time!');
        }
      });

      wb.register();
    }

    // Network status monitoring
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      syncService.stopPeriodicSync();
    };
  }, [initialize]);

  // Handle app update
  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      });
    }
    window.location.reload();
  };

  // Handle install
  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
  };

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <NetworkStatus isOffline={isOffline} />
          
          <main className="pb-16 md:pb-0">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tests/*" element={<Tests />} />
              <Route path="/projects/*" element={<Projects />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>

          <MobileNav />

          {updateAvailable && (
            <UpdatePrompt onUpdate={handleUpdate} />
          )}

          {deferredPrompt && (
            <InstallPrompt onInstall={handleInstall} onDismiss={() => setDeferredPrompt(null)} />
          )}
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;