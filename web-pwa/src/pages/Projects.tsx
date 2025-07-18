import React from 'react';
import { Routes, Route } from 'react-router-dom';

export const Projects: React.FC = () => {
  return (
    <div className="px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
      </header>
      
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-gray-600">Project management coming soon</p>
      </div>
    </div>
  );
};