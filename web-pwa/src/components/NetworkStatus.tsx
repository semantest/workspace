import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';

interface NetworkStatusProps {
  isOffline: boolean;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({ isOffline }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline]);

  if (!show) return null;

  return (
    <div
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium',
        'transition-all duration-300',
        isOffline
          ? 'bg-red-500 text-white'
          : 'bg-green-500 text-white'
      )}
    >
      {isOffline ? (
        <span>You are offline. Changes will sync when connection is restored.</span>
      ) : (
        <span>Back online! Syncing your changes...</span>
      )}
    </div>
  );
};