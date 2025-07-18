import React from 'react';
import { Package } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { StarIcon, DownloadIcon, UserIcon } from '@heroicons/react/solid';

interface PackageCardProps {
  package: Package;
  onClick?: () => void;
}

export const PackageCard: React.FC<PackageCardProps> = ({ package: pkg, onClick }) => {
  const getPriceDisplay = () => {
    if (pkg.pricing.type === 'free') return 'Free';
    if (pkg.pricing.type === 'paid') return `$${pkg.pricing.price}`;
    if (pkg.pricing.type === 'freemium') return 'Free with Premium';
    if (pkg.pricing.type === 'subscription') {
      return `$${pkg.pricing.price}/${pkg.pricing.billingPeriod}`;
    }
    return 'Contact for pricing';
  };

  const getCategoryColor = () => {
    const colors: Record<string, string> = {
      'test-patterns': 'bg-blue-100 text-blue-800',
      'plugins': 'bg-purple-100 text-purple-800',
      'themes': 'bg-pink-100 text-pink-800',
      'integrations': 'bg-green-100 text-green-800',
      'ai-models': 'bg-indigo-100 text-indigo-800',
      'domain-modules': 'bg-yellow-100 text-yellow-800'
    };
    return colors[pkg.category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {pkg.name}
            </h3>
            <p className="text-sm text-gray-500">v{pkg.version}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor()}`}>
            {pkg.category.replace('-', ' ')}
          </span>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {pkg.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {pkg.tags.slice(0, 3).map(tag => (
            <span 
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
            >
              {tag}
            </span>
          ))}
          {pkg.tags.length > 3 && (
            <span className="px-2 py-1 text-gray-500 text-xs">
              +{pkg.tags.length - 3} more
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-gray-500">
              <StarIcon className="w-4 h-4 text-yellow-400 mr-1" />
              <span>{pkg.rating.toFixed(1)}</span>
              {pkg.reviewCount && (
                <span className="text-xs ml-1">({pkg.reviewCount})</span>
              )}
            </div>
            <div className="flex items-center text-gray-500">
              <DownloadIcon className="w-4 h-4 mr-1" />
              <span>{formatDownloadCount(pkg.stats.downloads)}</span>
            </div>
          </div>
          <div className="font-medium text-gray-900">
            {getPriceDisplay()}
          </div>
        </div>

        {/* Publisher */}
        {pkg.publisher && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center text-sm">
              <UserIcon className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-gray-600">by</span>
              <span className="ml-1 font-medium text-gray-900">
                {pkg.publisher.name}
              </span>
              {pkg.publisher.verified && (
                <svg 
                  className="w-4 h-4 text-blue-500 ml-1" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                    clipRule="evenodd" 
                  />
                </svg>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Published {formatDistanceToNow(new Date(pkg.publishedAt))} ago
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-3 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <button 
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            onClick={(e) => {
              e.stopPropagation();
              // Handle install
            }}
          >
            Install
          </button>
          <button 
            className="text-sm text-gray-600 hover:text-gray-700"
            onClick={(e) => {
              e.stopPropagation();
              // Handle preview
            }}
          >
            Preview
          </button>
        </div>
      </div>
    </div>
  );
};

function formatDownloadCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}