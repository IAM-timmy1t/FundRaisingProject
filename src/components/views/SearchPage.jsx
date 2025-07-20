import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Container } from '@/components/ui/container';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import SearchBar from '@/components/search/SearchBar';
import SearchFilters from '@/components/search/SearchFilters';
import SearchResults from '@/components/search/SearchResults';
import SavedSearches from '@/components/search/SavedSearches';
import RelatedCampaigns from '@/components/search/RelatedCampaigns';
import { searchService } from '@/services/searchService';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { v4 as uuidv4 } from 'uuid';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState('grid');
  const [sessionId] = useState(uuidv4());
  
  // Trending campaigns
  const [trendingCampaigns, setTrendingCampaigns] = useState([]);
  
  // Filter state
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || null,
    location: searchParams.get('location') || null,
    minProgress: searchParams.get('minProgress') ? parseFloat(searchParams.get('minProgress')) : null,
    maxProgress: searchParams.get('maxProgress') ? parseFloat(searchParams.get('maxProgress')) : null,
    minAmount: searchParams.get('minAmount') ? parseInt(searchParams.get('minAmount')) : null,
    maxAmount: searchParams.get('maxAmount') ? parseInt(searchParams.get('maxAmount')) : null,
    status: searchParams.get('status') || 'active',
    isFeatured: searchParams.get('isFeatured') === 'true' ? true : null,
    isVerified: searchParams.get('isVerified') === 'true' ? true : null,
    sortBy: searchParams.get('sortBy') || 'relevance'
  });

  // Load trending campaigns on mount
  useEffect(() => {
    loadTrendingCampaigns();
  }, []);

  // Perform search when query or filters change
  useEffect(() => {
    const delayTimer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(delayTimer);
  }, [searchQuery, filters, currentPage]);

  // Update URL params when search/filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('q', searchQuery);
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.set(key, value.toString());
      }
    });
    if (currentPage > 1) params.set('page', currentPage.toString());
    
    setSearchParams(params);
  }, [searchQuery, filters, currentPage]);

  const performSearch = async () => {
    try {
      setLoading(true);
      
      const results = await searchService.searchCampaigns({
        query: searchQuery,
        ...filters,
        page: currentPage,
        limit: 12,
        userId: user?.id,
        sessionId
      });

      setCampaigns(results.campaigns);
      setTotalCount(results.totalCount);
      setTotalPages(results.totalPages);
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingCampaigns = async () => {
    try {
      const trending = await searchService.getTrendingCampaigns(6);
      setTrendingCampaigns(trending);
    } catch (error) {
      console.error('Error loading trending campaigns:', error);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilters({
      category: null,
      location: null,
      minProgress: null,
      maxProgress: null,
      minAmount: null,
      maxAmount: null,
      status: 'active',
      isFeatured: null,
      isVerified: null,
      sortBy: 'relevance'
    });
    setCurrentPage(1);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);
    
    let start = Math.max(1, currentPage - halfVisible);
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 rounded-md text-sm ${
            i === currentPage
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent'
          }`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex items-center justify-center gap-1 mt-8">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-md text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {start > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="px-3 py-1 rounded-md text-sm hover:bg-accent"
            >
              1
            </button>
            {start > 2 && <span className="px-2">...</span>}
          </>
        )}
        {pages}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-2">...</span>}
            <button
              onClick={() => handlePageChange(totalPages)}
              className="px-3 py-1 rounded-md text-sm hover:bg-accent"
            >
              {totalPages}
            </button>
          </>
        )}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded-md text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <Container className="py-8">
      {/* Search Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Search Campaigns</h1>
          {(searchQuery || Object.values(filters).some(v => v !== null && v !== 'active' && v !== 'relevance')) && (
            <button
              onClick={clearSearch}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          )}
        </div>
        
        <SearchBar 
          value={searchQuery}
          onSearch={handleSearch}
          className="max-w-2xl"
        />

        {/* Active filters display */}
        {Object.entries(filters).some(([key, value]) => value !== null && key !== 'status' && key !== 'sortBy') && (
          <div className="flex flex-wrap gap-2">
            {filters.category && (
              <Badge variant="secondary" className="gap-1">
                Category: {filters.category}
                <button onClick={() => handleFiltersChange({ ...filters, category: null })}>×</button>
              </Badge>
            )}
            {filters.location && (
              <Badge variant="secondary" className="gap-1">
                Location: {filters.location}
                <button onClick={() => handleFiltersChange({ ...filters, location: null })}>×</button>
              </Badge>
            )}
            {filters.isFeatured && (
              <Badge variant="secondary" className="gap-1">
                Featured only
                <button onClick={() => handleFiltersChange({ ...filters, isFeatured: null })}>×</button>
              </Badge>
            )}
            {filters.isVerified && (
              <Badge variant="secondary" className="gap-1">
                Verified only
                <button onClick={() => handleFiltersChange({ ...filters, isVerified: null })}>×</button>
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <SearchFilters 
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
          
          {user && (
            <SavedSearches 
              currentSearch={searchQuery}
              currentFilters={filters}
            />
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="results" className="space-y-4">
            <TabsList>
              <TabsTrigger value="results">
                Search Results
                {totalCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {totalCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="trending">
                Trending
                <Badge variant="secondary" className="ml-2">
                  {trendingCampaigns.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="results" className="space-y-4">
              <SearchResults
                campaigns={campaigns}
                loading={loading}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                searchQuery={searchQuery}
              />
              
              {renderPagination()}
            </TabsContent>

            <TabsContent value="trending" className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-4">Trending Campaigns</h2>
                <SearchResults
                  campaigns={trendingCampaigns}
                  loading={false}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  searchQuery=""
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Related Campaigns Section */}
      {campaigns.length > 0 && (
        <div className="mt-12">
          <Separator className="mb-8" />
          <RelatedCampaigns 
            currentCampaignIds={campaigns.map(c => c.id)}
          />
        </div>
      )}
    </Container>
  );
}
