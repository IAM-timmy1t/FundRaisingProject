import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CampaignGrid from '../components/campaigns/CampaignGrid';
import CampaignFilters from '../components/campaigns/CampaignFilters';
import SearchBar from '../components/ui/SearchBar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useCampaigns } from '../hooks/useCampaigns';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

const CampaignListingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    status: searchParams.get('status') || '',
    location: searchParams.get('location') || '',
    sortBy: searchParams.get('sortBy') || 'created_at',
    sortOrder: searchParams.get('sortOrder') || 'desc'
  });

  const { campaigns, loading, error, totalCount, fetchCampaigns } = useCampaigns();

  useEffect(() => {
    fetchCampaigns(filters);
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    
    // Update URL params
    const params = new URLSearchParams();
    Object.entries({ ...filters, ...newFilters }).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    setSearchParams(params);
  };

  const handleSearch = (searchTerm) => {
    handleFilterChange({ search: searchTerm });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Discover Campaigns</h1>
              <p className="text-gray-600 mt-1">
                Support meaningful causes and make a difference in people's lives
              </p>
            </div>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-lg">
              <SearchBar
                placeholder="Search campaigns..."
                value={filters.search}
                onSearch={handleSearch}
                icon={MagnifyingGlassIcon}
              />
            </div>
          </div>

          {/* Filter Toggle & Results Count */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
            
            <div className="text-sm text-gray-600">
              {totalCount > 0 && (
                <span>{totalCount} campaign{totalCount !== 1 ? 's' : ''} found</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className={`lg:w-80 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <CampaignFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClose={() => setShowFilters(false)}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12">
                <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
                <p className="text-gray-600">
                  Try adjusting your search criteria or browse all campaigns
                </p>
              </div>
            ) : (
              <CampaignGrid campaigns={campaigns} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignListingPage;