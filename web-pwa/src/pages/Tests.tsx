import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { TouchButton } from '../components/TouchOptimized';

const TestList: React.FC = () => {
  return (
    <div className="px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tests</h1>
      </header>
      
      <TouchButton className="w-full mb-4">
        Create New Test
      </TouchButton>

      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-gray-600">Test list coming soon</p>
      </div>
    </div>
  );
};

const NewTest: React.FC = () => {
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Test</h1>
      <p className="text-gray-600">Test creation form coming soon</p>
    </div>
  );
};

export const Tests: React.FC = () => {
  return (
    <Routes>
      <Route index element={<TestList />} />
      <Route path="new" element={<NewTest />} />
    </Routes>
  );
};