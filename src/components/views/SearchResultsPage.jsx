import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Grid, List, Save, Bell, Search, Info, X } from 'lucide-react';
import SearchBar from '@/components/search/SearchBar';
import AdvancedSearchFilters from '@/components/search/AdvancedSearchFilters';
import CampaignCard from '@/components/campaigns/CampaignCard';
import SaveSearchDialog from '@/components/search/SaveSearchDialog';
import RelatedCampaigns from '@/components/search/RelatedCampaigns';
import { searchService } from '@/services/searchService';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Search state
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  // Filter state
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    locationCountry: searchParams.get('locationCountry') || '',
    locationCity: searchParams.get('locationCity') || '',
    minProgress: parseInt(searchParams.get('minProgress') || '0'),
    maxProgress: parseInt(searchParams.get('maxProgress') || '100'),
    isVerified: searchParams.get('isVerified') === 'true',
    isFeatured: searchParams.get('isFeatured') === 'true',
    sortBy: searchParams.get('sortBy') || 'relevance'
  });

  const query = searchParams.get('q') || '';
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Load campaigns on mount and when search params change
  useEffect(() => {
    performSearch();
  }, [searchParams]);

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const result = await searchService.searchCampaigns({
        query,
        ...filters,
        page,
        limit: 20
      });

      setCampaigns(result.campaigns);
      setHasMore(result.hasMore);
      setTotalResults(result.campaigns.length);
    } catch (error) {
      console.error('Error searching campaigns:', error);
      toast.error('Failed to search campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (newQuery) => {
    const params = new URLSearchParams(searchParams);
    params.set('q', newQuery);
    setSearchParams(params);
    setPage(1);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    const params = new URLSearchParams(searchParams);
    
    // Update URL params
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== '' && value !== 0 && value !== 100) {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });
    
    setSearchParams(params);
    setPage(1);
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    setSearchParams(params);
    setFilters({
      category: '',
      locationCountry: '',
      locationCity: '',
      minProgress: 0,
      maxProgress: 100,
      isVerified: false,
      isFeatured: false,
      sortBy: 'relevance'
    });
    setPage(1);
  };

  const handleSaveSearch = async (name, emailAlerts, alertFrequency) => {
    try {
      await searchService.saveSearch({
        name,
        query,
        filters,
        emailAlerts,
        alertFrequency
      });
      toast.success('Search saved successfully!');
      setShowSaveDialog(false);
    } catch (error) {
      console.error('Error saving search:', error);
      toast.error('Failed to save search');
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.locationCountry) count++;
    if (filters.locationCity) count++;
    if (filters.minProgress > 0 || filters.maxProgress < 100) count++;
    if (filters.isVerified) count++;
    if (filters.isFeatured) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Container className="py-8">
      {/* Search Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
          <div className="flex-1 w-full lg:max-w-2xl">
            <SearchBar 
              placeholder="Search campaigns..." 
              onSearch={handleSearch}
              defaultValue={query}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden"
            >
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </Button>
            
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(true)}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Search
              </Button>
            )}
          </div>
        </div>

        {/* Search Summary */}
        {(query || activeFilterCount > 0) && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {query && (
              <>
                <span>Searching for</span>
                <Badge variant="secondary" className="gap-1">
                  "{query}"
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.delete('q');
                      setSearchParams(params);
                    }}
                    className="ml-1 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </>
            )}
            
            {activeFilterCount > 0 && (
              <>
                <span>with</span>
                <Badge variant="secondary">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
                </Badge>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-sm"
                  onClick={handleClearFilters}
                >
                  Clear all
                </Button>
              </>
            )}
            
            {totalResults > 0 && (
              <span className="ml-auto">
                {totalResults} result{totalResults !== 1 ? 's' : ''} found
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className={cn(
          "lg:col-span-1",
          showFilters ? "block" : "hidden lg:block"
        )}>
          <div className="sticky top-24">
            <AdvancedSearchFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClear={handleClearFilters}
            />
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {/* View Controls */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {query ? 'Search Results' : 'All Campaigns'}
            </h2>
            
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={setViewMode}
              className="hidden sm:flex"
            >
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <Grid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className={cn(
              "grid gap-6",
              viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
            )}>
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-48 mb-4" />
                    <Skeleton className="h-4 mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Results Grid/List */}
          {!isLoading && campaigns.length > 0 && (
            <>
              <div className={cn(
                "grid gap-6",
                viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
              )}>
                {campaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    view={viewMode}
                    onView={() => {
                      // Track view from search
                      searchService.trackCampaignView(campaign.id, 'search');
                      navigate(`/campaigns/${campaign.id}`);
                    }}
                  />
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="mt-8 text-center">
                  <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={isLoading}
                  >
                    Load More Results
                  </Button>
                </div>
              )}
            </>
          )}

          {/* No Results */}
          {!isLoading && campaigns.length === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">No campaigns found</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search terms or filters to find what you're looking for.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Related Campaigns */}
          {!isLoading && campaigns.length > 0 && campaigns.length < 5 && (
            <div className="mt-12">
              <RelatedCampaigns 
                category={filters.category} 
                excludeIds={campaigns.map(c => c.id)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <SaveSearchDialog
          open={showSaveDialog}
          onOpenChange={setShowSaveDialog}
          onSave={handleSaveSearch}
          query={query}
          filters={filters}
        />
      )}
    </Container>
  );
}
