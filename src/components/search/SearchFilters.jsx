import { useState, useEffect } from 'react';
import { Filter, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { searchService } from '@/services/searchService';
import { cn } from '@/lib/utils';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'most_funded', label: 'Most Funded' },
  { value: 'recently_added', label: 'Recently Added' },
  { value: 'ending_soon', label: 'Ending Soon' },
  { value: 'most_popular', label: 'Most Popular' },
  { value: 'trending', label: 'Trending' }
];

export default function SearchFilters({ filters, onFiltersChange, className }) {
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Local state for sliders (to avoid too many updates)
  const [progressRange, setProgressRange] = useState([
    filters.minProgress || 0,
    filters.maxProgress || 100
  ]);
  const [amountRange, setAmountRange] = useState([
    filters.minAmount || 0,
    filters.maxAmount || 100000
  ]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    // Count active filters
    let count = 0;
    if (filters.category) count++;
    if (filters.location) count++;
    if (filters.minProgress > 0 || filters.maxProgress < 100) count++;
    if (filters.minAmount > 0 || filters.maxAmount < 100000) count++;
    if (filters.status !== 'active') count++;
    if (filters.isFeatured) count++;
    if (filters.isVerified) count++;
    setActiveFiltersCount(count);
  }, [filters]);

  const loadFilterOptions = async () => {
    try {
      const [categoriesData, locationsData] = await Promise.all([
        searchService.getCategoriesWithCounts(),
        searchService.getLocationsWithCounts()
      ]);
      setCategories(categoriesData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleProgressRangeChange = (value) => {
    setProgressRange(value);
  };

  const handleProgressRangeCommit = () => {
    onFiltersChange({
      ...filters,
      minProgress: progressRange[0] / 100,
      maxProgress: progressRange[1] / 100
    });
  };

  const handleAmountRangeChange = (value) => {
    setAmountRange(value);
  };

  const handleAmountRangeCommit = () => {
    onFiltersChange({
      ...filters,
      minAmount: amountRange[0],
      maxAmount: amountRange[1]
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
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
    setProgressRange([0, 100]);
    setAmountRange([0, 100000]);
  };

  const formatAmount = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount}`;
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-7 text-xs"
              >
                Clear all
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7 p-0"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Sort By */}
          <div className="space-y-2">
            <Label>Sort By</Label>
            <Select
              value={filters.sortBy || 'relevance'}
              onValueChange={(value) => handleFilterChange('sortBy', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={filters.category || 'all'}
              onValueChange={(value) => handleFilterChange('category', value === 'all' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">All categories</SelectItem>
                {categories.map(({ category, count }) => (
                  <SelectItem key={category} value={category}>
                    <span className="flex items-center justify-between w-full">
                      {category}
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {count}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location</Label>
            <Select
              value={filters.location || 'all'}
              onValueChange={(value) => handleFilterChange('location', value === 'all' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">All locations</SelectItem>
                {locations.map(({ location, count }) => (
                  <SelectItem key={location} value={location}>
                    <span className="flex items-center justify-between w-full">
                      {location}
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {count}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Funding Progress */}
          <div className="space-y-2">
            <Label>Funding Progress</Label>
            <div className="px-2">
              <Slider
                value={progressRange}
                onValueChange={handleProgressRangeChange}
                onValueCommit={handleProgressRangeCommit}
                min={0}
                max={100}
                step={5}
                className="mb-2"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progressRange[0]}%</span>
                <span>{progressRange[1]}%</span>
              </div>
            </div>
          </div>

          {/* Goal Amount */}
          <div className="space-y-2">
            <Label>Goal Amount</Label>
            <div className="px-2">
              <Slider
                value={amountRange}
                onValueChange={handleAmountRangeChange}
                onValueCommit={handleAmountRangeCommit}
                min={0}
                max={100000}
                step={1000}
                className="mb-2"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatAmount(amountRange[0])}</span>
                <span>{formatAmount(amountRange[1])}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Campaign Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <RadioGroup
              value={filters.status || 'active'}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="active" />
                <Label htmlFor="active" className="font-normal cursor-pointer">
                  Active campaigns
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">
                  All campaigns
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="completed" id="completed" />
                <Label htmlFor="completed" className="font-normal cursor-pointer">
                  Completed campaigns
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Additional Filters */}
          <div className="space-y-3">
            <Label>Additional Filters</Label>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="featured" className="font-normal cursor-pointer">
                Featured campaigns only
              </Label>
              <Switch
                id="featured"
                checked={filters.isFeatured || false}
                onCheckedChange={(checked) => handleFilterChange('isFeatured', checked ? true : null)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="verified" className="font-normal cursor-pointer">
                Verified campaigns only
              </Label>
              <Switch
                id="verified"
                checked={filters.isVerified || false}
                onCheckedChange={(checked) => handleFilterChange('isVerified', checked ? true : null)}
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
