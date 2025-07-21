import React from 'react';

interface ConnectionStatusProps {
  connected: boolean;
  connecting: boolean;
  error?: Error | null;
  url?: string;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connected,
  connecting,
  error,
  url,
  className = ''
}) => {
  const getStatusColor = () => {
    if (error) return 'bg-red-500';
    if (connected) return 'bg-green-500';
    if (connecting) return 'bg-yellow-500';
    return 'bg-gray-500';
  };
  
  const getStatusText = () => {
    if (error) return 'Error';
    if (connected) return 'Connected';
    if (connecting) return 'Connecting...';
    return 'Disconnected';
  };
  
  const getStatusIcon = () => {
    if (error) return '⚠️';
    if (connected) return '✓';
    if (connecting) return '⟳';
    return '○';
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className={`h-3 w-3 rounded-full ${getStatusColor()}`} />
            {connecting && (
              <div className={`absolute inset-0 h-3 w-3 rounded-full ${getStatusColor()} animate-ping`} />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">{getStatusText()}</span>
              <span className="text-lg">{getStatusIcon()}</span>
            </div>
            {url && (
              <div className="text-xs text-gray-500 mt-0.5">
                {url}
              </div>
            )}
          </div>
        </div>
        
        {error && (
          <div className="ml-4">
            <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              {error.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};