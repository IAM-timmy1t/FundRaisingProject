import React, { useState, useEffect, useCallback } from 'react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import CampaignGrid from '@/components/campaigns/CampaignGrid';
import CampaignFilters from '@/components/campaigns/CampaignFilters';
import { campaignService } from '@/lib/campaignService';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { toast } from 'sonner';

const CampaignsPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    search: '',
    category_id: '',
    status: 'active',
    sort_by: 'created_at',
    order: 'desc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    total_pages: 0
  });

  // Load campaigns
  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const response = await campaignService.listCampaigns(filters);
      
      if (response) {
        setCampaigns(response.campaigns || []);
        setPagination(response.pagination || {
          page: filters.page,
          limit: filters.limit,
          total: 0,
          total_pages: 0
        });
        
        // Set categories if available
        if (response.categories) {
          setCategories(response.categories);
        }
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load categories on mount if not loaded with campaigns
  useEffect(() => {
    const loadCategories = async () => {
      if (categories.length === 0) {
        try {
          const cats = await campaignService.getCategories();
          setCategories(cats || []);
        } catch (error) {
          console.error('Error loading categories:', error);
        }
      }
    };
    
    loadCategories();
  }, [categories.length]);

  // Load campaigns when filters change
  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Handle filter changes
  const handleFiltersChange = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // Reset to first page when filters change
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      setFilters(prev => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Pagination component
  const PaginationControls = () => {
    if (pagination.total_pages <= 1) return null;

    const currentPage = pagination.page;
    const totalPages = pagination.total_pages;
    
    // Generate page numbers to display
    const getPageNumbers = () => {
      const pages = [];
      const maxPagesToShow = 5;
      
      if (totalPages <= maxPagesToShow) {
        // Show all pages if total is small
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show current page and surrounding pages
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
          pages.push(1);
          if (startPage > 2) pages.push('...');
        }
        
        for (let i = startPage; i <= endPage; i++) {
          pages.push(i);
        }
        
        if (endPage < totalPages) {
          if (endPage < totalPages - 1) pages.push('...');
          pages.push(totalPages);
        }
      }
      
      return pages;
    };

    return (
      <div className="flex items-center justify-center gap-1 mt-8">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className="h-8 w-8"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="px-2 text-muted-foreground">...</span>
            ) : (
              <Button
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePageChange(page)}
                className="h-8 w-8 p-0"
              >
                {page}
              </Button>
            )}
          </React.Fragment>
        ))}
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="h-8 w-8"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <Container className="py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Browse Campaigns</h1>
        <p className="text-muted-foreground">
          Discover and support campaigns that matter to you
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <CampaignFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            categories={categories}
            className="sticky top-4"
          />
        </div>

        {/* Campaign Grid */}
        <div className="lg:col-span-3">
          {/* Results Summary */}
          {!loading && (
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {campaigns.length} of {pagination.total} campaigns
            </div>
          )}

          {/* Campaign Grid */}
          <CampaignGrid
            campaigns={campaigns}
            loading={loading}
            itemsPerRow={3}
          />

          {/* Pagination */}
          <PaginationControls />
        </div>
      </div>
    </Container>
  );
};

export default CampaignsPage;