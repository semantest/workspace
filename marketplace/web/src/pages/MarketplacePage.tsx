import React, { useState, useEffect } from 'react';
import { 
  SearchIcon, 
  FilterIcon, 
  SortDescendingIcon,
  SparklesIcon,
  TrendingUpIcon,
  ClockIcon
} from '@heroicons/react/solid';
import { PackageCard } from '../components/PackageCard';
import { CategoryFilter } from '../components/CategoryFilter';
import { SearchBar } from '../components/SearchBar';
import { Package, SearchCriteria } from '../types';
import { useMarketplace } from '../hooks/useMarketplace';

export const MarketplacePage: React.FC = () => {
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({
    query: '',
    category: undefined,
    tags: [],
    sortBy: 'relevance',
    page: 1,
    limit: 20
  });

  const [showFilters, setShowFilters] = useState(false);
  const { packages, loading, error, total, searchPackages } = useMarketplace();

  useEffect(() => {
    searchPackages(searchCriteria);
  }, [searchCriteria]);

  const handleSearch = (query: string) => {
    setSearchCriteria(prev => ({ ...prev, query, page: 1 }));
  };

  const handleCategoryChange = (category?: string) => {
    setSearchCriteria(prev => ({ ...prev, category, page: 1 }));
  };

  const handleSortChange = (sortBy: string) => {
    setSearchCriteria(prev => ({ ...prev, sortBy, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setSearchCriteria(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Semantest Marketplace
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Discover and share test patterns, plugins, and tools
            </p>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">
              Extend Semantest with Community Packages
            </h2>
            <p className="text-xl mb-8 text-indigo-100">
              Browse {total.toLocaleString()} packages from developers worldwide
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <SearchBar 
                onSearch={handleSearch}
                placeholder="Search packages..."
                className="bg-white text-gray-900"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {total.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Packages</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">5M+</div>
              <div className="text-sm text-gray-600">Weekly Downloads</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">12K+</div>
              <div className="text-sm text-gray-600">Active Publishers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">4.7</div>
              <div className="text-sm text-gray-600">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-4">
              {/* Categories */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
                <CategoryFilter 
                  selected={searchCriteria.category}
                  onChange={handleCategoryChange}
                />
              </div>

              {/* Featured */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Featured</h3>
                <div className="space-y-3">
                  <a href="#" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                    <SparklesIcon className="w-4 h-4 mr-2 text-yellow-500" />
                    Editor's Choice
                  </a>
                  <a href="#" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                    <TrendingUpIcon className="w-4 h-4 mr-2 text-green-500" />
                    Trending
                  </a>
                  <a href="#" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                    <ClockIcon className="w-4 h-4 mr-2 text-blue-500" />
                    Recently Updated
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden flex items-center text-gray-600 hover:text-gray-900"
                  >
                    <FilterIcon className="w-5 h-5 mr-2" />
                    Filters
                  </button>
                  
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-medium">{packages.length}</span> of{' '}
                    <span className="font-medium">{total}</span> packages
                  </div>
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center">
                  <SortDescendingIcon className="w-5 h-5 text-gray-400 mr-2" />
                  <select
                    value={searchCriteria.sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="relevance">Most Relevant</option>
                    <option value="downloads">Most Downloads</option>
                    <option value="rating">Highest Rated</option>
                    <option value="newest">Newest First</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Mobile Filters */}
            {showFilters && (
              <div className="lg:hidden bg-white rounded-lg shadow-sm p-6 mb-6">
                <CategoryFilter 
                  selected={searchCriteria.category}
                  onChange={handleCategoryChange}
                />
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm h-64 animate-pulse">
                    <div className="p-6">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-600">Error loading packages: {error.message}</p>
                <button 
                  onClick={() => searchPackages(searchCriteria)}
                  className="mt-4 text-red-600 hover:text-red-700 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Package Grid */}
            {!loading && !error && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {packages.map(pkg => (
                    <PackageCard 
                      key={pkg.id}
                      package={pkg}
                      onClick={() => {
                        // Navigate to package details
                        window.location.href = `/marketplace/package/${pkg.id}`;
                      }}
                    />
                  ))}
                </div>

                {/* Empty State */}
                {packages.length === 0 && (
                  <div className="text-center py-12">
                    <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No packages found
                    </h3>
                    <p className="text-gray-600">
                      Try adjusting your search or filters
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {total > searchCriteria.limit && (
                  <div className="mt-8 flex justify-center">
                    <nav className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(searchCriteria.page - 1)}
                        disabled={searchCriteria.page === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      {getPageNumbers(searchCriteria.page, Math.ceil(total / searchCriteria.limit)).map(page => (
                        <button
                          key={page}
                          onClick={() => page !== '...' && handlePageChange(Number(page))}
                          disabled={page === '...'}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            page === searchCriteria.page
                              ? 'bg-indigo-600 text-white'
                              : page === '...'
                              ? 'text-gray-500 cursor-default'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => handlePageChange(searchCriteria.page + 1)}
                        disabled={searchCriteria.page >= Math.ceil(total / searchCriteria.limit)}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

function getPageNumbers(current: number, total: number): (number | string)[] {
  const delta = 2;
  const range = [];
  const rangeWithDots = [];
  let l;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  range.forEach(i => {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  });

  return rangeWithDots;
}