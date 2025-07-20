import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { campaignService } from '@/lib/campaignService';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircleIcon, GridIcon, ListIcon, FilterIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

import CampaignCard from './CampaignCard';
import CampaignFilters from './CampaignFilters';

const CampaignListingPage = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [showFilters, setShowFilters] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    status: 'active',
    location: '',
    min_goal: 0,
    max_goal: 1000000,
    funding_range: [0, 100],
    verified_only: false,
    featured_only: false
  });

  // Load initial data
  useEffect(() => {
    loadCategories();
    loadCampaigns();
  }, []);

  // Reload campaigns when filters, sort, or pagination changes
  useEffect(() => {
    loadCampaigns();
  }, [filters, sortBy, pagination.page]);

  const loadCategories = async () => {
    try {
      const cats = await campaignService.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort_by: sortBy,
        ...filters
      };

      // Handle status filter
      if (filters.status !== 'all') {
        params.status = filters.status;
      }

      // Handle funding range
      if (filters.funding_range[0] > 0 || filters.funding_range[1] < 100) {
        params.min_funded_percentage = filters.funding_range[0];
        params.max_funded_percentage = filters.funding_range[1];
      }

      const result = await campaignService.listCampaigns(params);
      
      setCampaigns(result.data || []);
      setPagination({
        ...pagination,
        total: result.total || 0,
        totalPages: result.total_pages || 1
      });

      // Extract unique locations from campaigns
      const uniqueLocations = [...new Set(
        (result.data || [])
          .map(c => c.location)
          .filter(Boolean)
      )];
      setLocations(uniqueLocations);
      
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      toast({
        variant: "destructive",
        title: "Failed to load campaigns",
        description: "Please try again later"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination({ ...pagination, page: 1 }); // Reset to first page
  };

  const handleFilterReset = () => {
    setFilters({
      search: '',
      category_id: '',
      status: 'active',
      location: '',
      min_goal: 0,
      max_goal: 1000000,
      funding_range: [0, 100],
      verified_only: false,
      featured_only: false
    });
    setPagination({ ...pagination, page: 1 });
  };

  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderCampaignSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Browse Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Support meaningful causes in our community
          </p>
        </div>
        <Link to="/campaigns/create">
          <Button>
            <PlusCircleIcon className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </Link>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <ToggleGroup type="single" value={view} onValueChange={setView}>
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <GridIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <ListIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Filter Toggle (Mobile) */}
          <Button
            variant="outline"
            size="sm"
            className="sm:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FilterIcon className="h-4 w-4 mr-2" />
            Filters
          </Button>

          {/* Results Count */}
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${pagination.total} campaigns found`}
          </p>
        </div>

        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="ending_soon">Ending soon</SelectItem>
            <SelectItem value="most_funded">Most funded</SelectItem>
            <SelectItem value="least_funded">Least funded</SelectItem>
            <SelectItem value="most_donors">Most donors</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <aside className={cn(
          "w-72 flex-shrink-0",
          !showFilters && "hidden sm:block"
        )}>
          <CampaignFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleFilterReset}
            categories={categories}
            locations={locations}
            className="sticky top-6"
          />
        </aside>

        {/* Campaign Grid/List */}
        <div className="flex-1">
          {loading ? (
            <div className={cn(
              "grid gap-6",
              view === 'grid' 
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
                : "grid-cols-1"
            )}>
              {[...Array(6)].map((_, i) => (
                <div key={i}>{renderCampaignSkeleton()}</div>
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground mb-4">
                No campaigns found matching your criteria
              </p>
              <Button variant="outline" onClick={handleFilterReset}>
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              <div className={cn(
                "grid gap-6",
                view === 'grid' 
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
                  : "grid-cols-1"
              )}>
                {campaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    view={view}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex gap-1">
                    {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={pagination.page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {pagination.totalPages > 5 && (
                      <span className="px-2 py-1">...</span>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignListingPage;