import React from 'react';
import { TouchButton } from './TouchOptimized';

interface UpdatePromptProps {
  onUpdate: () => void;
}

export const UpdatePrompt: React.FC<UpdatePromptProps> = ({ onUpdate }) => {
  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40">
      <div className="bg-white rounded-lg shadow-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Update Available</h3>
        <p className="text-gray-600 mb-4">
          A new version of Semantest is available. Update now to get the latest features and improvements.
        </p>
        <div className="flex gap-2">
          <TouchButton onClick={onUpdate} size="sm" className="flex-1">
            Update Now
          </TouchButton>
          <TouchButton variant="ghost" size="sm" className="flex-1">
            Later
          </TouchButton>
        </div>
      </div>
    </div>
  );
};