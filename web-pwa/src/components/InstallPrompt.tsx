import React from 'react';
import { TouchButton } from './TouchOptimized';

interface InstallPromptProps {
  onInstall: () => void;
  onDismiss: () => void;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({ onInstall, onDismiss }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-t-2xl md:rounded-lg w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center mb-4">
          <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mr-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold">Install Semantest</h3>
            <p className="text-gray-600">Add to your home screen</p>
          </div>
        </div>
        
        <p className="text-gray-700 mb-6">
          Install Semantest for a better experience with offline access, push notifications, and more.
        </p>

        <div className="space-y-3">
          <TouchButton onClick={onInstall} className="w-full" size="lg">
            Install App
          </TouchButton>
          <TouchButton onClick={onDismiss} variant="ghost" className="w-full" size="lg">
            Not Now
          </TouchButton>
        </div>
      </div>
    </div>
  );
};