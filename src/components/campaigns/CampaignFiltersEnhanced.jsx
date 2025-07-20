import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Filter, 
  X, 
  MapPin, 
  Calendar,
  TrendingUp,
  Shield,
  Star,
  DollarSign,
  Percent,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const CampaignFiltersEnhanced = ({ 
  filters = {}, 
  onFiltersChange, 
  categories = [],
  locations = [],
  className,
  showAdvanced = true
}) => {
  const [localFilters, setLocalFilters] = useState({
    search: '',
    category: '',
    location: '',
    status: 'active',
    verificationStatus: '',
    featured: null,
    goalMin: 0,
    goalMax: 1000000,
    progressMin: 0,
    progressMax: 100,
    endDateRange: '',
    sortBy: 'relevance',
    radius: null,
    ...filters
  });

  const [expandedSections, setExpandedSections] = useState(['basic']);

  // Update local filters when prop filters change
  useEffect(() => {
    setLocalFilters(prev => ({ ...prev, ...filters }));
  }, [filters]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleRangeChange = (key, values) => {
    const newFilters = { 
      ...localFilters, 
      [`${key}Min`]: values[0],
      [`${key}Max`]: values[1]
    };
    setLocalFilters(newFilters);
  };

  const handleRangeCommit = (key, values) => {
    onFiltersChange?.({
      ...localFilters,
      [`${key}Min`]: values[0],
      [`${key}Max`]: values[1]
    });
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      category: '',
      location: '',
      status: 'active',
      verificationStatus: '',
      featured: null,
      goalMin: 0,
      goalMax: 1000000,
      progressMin: 0,
      progressMax: 100,
      endDateRange: '',
      sortBy: 'relevance',
      radius: null
    };
    setLocalFilters(clearedFilters);
    onFiltersChange?.(clearedFilters);
  };

  const clearFilter = (key) => {
    const defaultValues = {
      search: '',
      category: '',
      location: '',
      status: 'active',
      verificationStatus: '',
      featured: null,
      goalMin: 0,
      goalMax: 1000000,
      progressMin: 0,
      progressMax: 100,
      endDateRange: '',
      sortBy: 'relevance',
      radius: null
    };
    handleFilterChange(key, defaultValues[key]);
  };

  const hasActiveFilters = () => {
    return localFilters.search || 
           localFilters.category || 
           localFilters.location ||
           localFilters.status !== 'active' ||
           localFilters.verificationStatus ||
           localFilters.featured !== null ||
           localFilters.goalMin > 0 || 
           localFilters.goalMax < 1000000 ||
           localFilters.progressMin > 0 ||
           localFilters.progressMax < 100 ||
           localFilters.endDateRange ||
           localFilters.radius;
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.search) count++;
    if (localFilters.category) count++;
    if (localFilters.location) count++;
    if (localFilters.status !== 'active') count++;
    if (localFilters.verificationStatus) count++;
    if (localFilters.featured !== null) count++;
    if (localFilters.goalMin > 0 || localFilters.goalMax < 1000000) count++;
    if (localFilters.progressMin > 0 || localFilters.progressMax < 100) count++;
    if (localFilters.endDateRange) count++;
    if (localFilters.radius) count++;
    return count;
  };

  const statusOptions = [
    { value: 'active', label: 'Active', icon: <Circle className="w-3 h-3" /> },
    { value: 'funded', label: 'Funded', icon: <CheckCircle className="w-3 h-3" /> },
    { value: 'completed', label: 'Completed', icon: <CheckCircle2 className="w-3 h-3" /> },
    { value: 'all', label: 'All Status', icon: null }
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Most Relevant', icon: <TrendingUp className="w-4 h-4" /> },
    { value: 'trending', label: 'Trending Now', icon: <TrendingUp className="w-4 h-4" /> },
    { value: 'created_at', label: 'Recently Added', icon: <Clock className="w-4 h-4" /> },
    { value: 'end_date', label: 'Ending Soon', icon: <Calendar className="w-4 h-4" /> },
    { value: 'current_amount', label: 'Most Funded', icon: <DollarSign className="w-4 h-4" /> },
    { value: 'progress', label: 'Highest Progress', icon: <Percent className="w-4 h-4" /> },
    { value: 'distance', label: 'Nearest First', icon: <MapPin className="w-4 h-4" /> }
  ];

  const verificationOptions = [
    { value: '', label: 'Any Verification' },
    { value: 'verified', label: 'Verified Only', icon: <Shield className="w-3 h-3 text-green-600" /> },
    { value: 'pending', label: 'Pending Verification', icon: <Clock className="w-3 h-3 text-yellow-600" /> },
    { value: 'unverified', label: 'Unverified', icon: <X className="w-3 h-3 text-gray-400" /> }
  ];

  const endDateOptions = [
    { value: '', label: 'Any Time' },
    { value: '24h', label: 'Ending in 24 hours' },
    { value: '3d', label: 'Ending in 3 days' },
    { value: '7d', label: 'Ending this week' },
    { value: '30d', label: 'Ending this month' }
  ];

  const radiusOptions = [
    { value: null, label: 'Any Distance' },
    { value: 10, label: 'Within 10 km' },
    { value: 25, label: 'Within 25 km' },
    { value: 50, label: 'Within 50 km' },
    { value: 100, label: 'Within 100 km' }
  ];

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
            {hasActiveFilters() && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFilterCount()}
              </Badge>
            )}
          </CardTitle>
          {hasActiveFilters() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2 text-xs"
            >
              Clear all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Accordion 
          type="multiple" 
          value={expandedSections}
          onValueChange={setExpandedSections}
          className="w-full"
        >
          {/* Basic Filters */}
          <AccordionItem value="basic">
            <AccordionTrigger className="text-sm font-medium">
              Basic Filters
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm">Category</Label>
                <Select
                  value={localFilters.category}
                  onValueChange={(value) => handleFilterChange('category', value)}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="location"
                    placeholder="City, State, or Country"
                    value={localFilters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="pl-9"
                  />
                </div>
                {localFilters.location && (
                  <Select
                    value={localFilters.radius?.toString() || ''}
                    onValueChange={(value) => handleFilterChange('radius', value ? parseInt(value) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Search radius" />
                    </SelectTrigger>
                    <SelectContent>
                      {radiusOptions.map((option) => (
                        <SelectItem key={option.value || 'any'} value={option.value?.toString() || ''}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm">Campaign Status</Label>
                <RadioGroup
                  value={localFilters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  {statusOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label
                        htmlFor={option.value}
                        className="text-sm font-normal cursor-pointer flex items-center gap-2"
                      >
                        {option.icon}
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Advanced Filters */}
          {showAdvanced && (
            <AccordionItem value="advanced">
              <AccordionTrigger className="text-sm font-medium">
                Advanced Filters
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {/* Goal Amount Range */}
                <div className="space-y-2">
                  <Label className="text-sm">Goal Amount Range</Label>
                  <div className="px-2">
                    <Slider
                      value={[localFilters.goalMin, localFilters.goalMax]}
                      onValueChange={(values) => handleRangeChange('goal', values)}
                      onValueCommit={(values) => handleRangeCommit('goal', values)}
                      max={1000000}
                      step={10000}
                      className="mb-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>${localFilters.goalMin.toLocaleString()}</span>
                      <span>${localFilters.goalMax.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Range */}
                <div className="space-y-2">
                  <Label className="text-sm">Funding Progress</Label>
                  <div className="px-2">
                    <Slider
                      value={[localFilters.progressMin, localFilters.progressMax]}
                      onValueChange={(values) => handleRangeChange('progress', values)}
                      onValueCommit={(values) => handleRangeCommit('progress', values)}
                      max={100}
                      step={5}
                      className="mb-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{localFilters.progressMin}%</span>
                      <span>{localFilters.progressMax}%</span>
                    </div>
                  </div>
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-sm">Campaign Ending</Label>
                  <Select
                    value={localFilters.endDateRange}
                    onValueChange={(value) => handleFilterChange('endDateRange', value)}
                  >
                    <SelectTrigger id="endDate">
                      <SelectValue placeholder="Any time" />
                    </SelectTrigger>
                    <SelectContent>
                      {endDateOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Verification Status */}
                <div className="space-y-2">
                  <Label className="text-sm">Verification Status</Label>
                  <RadioGroup
                    value={localFilters.verificationStatus}
                    onValueChange={(value) => handleFilterChange('verificationStatus', value)}
                  >
                    {verificationOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`verification-${option.value}`} />
                        <Label
                          htmlFor={`verification-${option.value}`}
                          className="text-sm font-normal cursor-pointer flex items-center gap-2"
                        >
                          {option.icon}
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Featured Campaigns */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="featured"
                    checked={localFilters.featured === true}
                    onCheckedChange={(checked) => 
                      handleFilterChange('featured', checked ? true : null)
                    }
                  />
                  <Label
                    htmlFor="featured"
                    className="text-sm font-normal cursor-pointer flex items-center gap-2"
                  >
                    <Star className="w-4 h-4 text-yellow-500" />
                    Featured Campaigns Only
                  </Label>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Sort Options */}
          <AccordionItem value="sort">
            <AccordionTrigger className="text-sm font-medium">
              Sort By
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <RadioGroup
                value={localFilters.sortBy}
                onValueChange={(value) => handleFilterChange('sortBy', value)}
              >
                {sortOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2 py-1">
                    <RadioGroupItem value={option.value} id={`sort-${option.value}`} />
                    <Label
                      htmlFor={`sort-${option.value}`}
                      className="text-sm font-normal cursor-pointer flex items-center gap-2 flex-1"
                    >
                      {option.icon}
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Active Filters Display */}
        {hasActiveFilters() && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <Label className="text-xs text-muted-foreground">Active Filters</Label>
            <div className="flex flex-wrap gap-1">
              {localFilters.category && (
                <Badge variant="secondary" className="text-xs">
                  {categories.find(c => c.id === localFilters.category)?.name}
                  <X 
                    className="w-3 h-3 ml-1 cursor-pointer" 
                    onClick={() => clearFilter('category')}
                  />
                </Badge>
              )}
              {localFilters.location && (
                <Badge variant="secondary" className="text-xs">
                  <MapPin className="w-3 h-3 mr-1" />
                  {localFilters.location}
                  {localFilters.radius && ` (${localFilters.radius}km)`}
                  <X 
                    className="w-3 h-3 ml-1 cursor-pointer" 
                    onClick={() => {
                      clearFilter('location');
                      clearFilter('radius');
                    }}
                  />
                </Badge>
              )}
              {localFilters.verificationStatus && (
                <Badge variant="secondary" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  {verificationOptions.find(v => v.value === localFilters.verificationStatus)?.label}
                  <X 
                    className="w-3 h-3 ml-1 cursor-pointer" 
                    onClick={() => clearFilter('verificationStatus')}
                  />
                </Badge>
              )}
              {localFilters.featured && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Featured Only
                  <X 
                    className="w-3 h-3 ml-1 cursor-pointer" 
                    onClick={() => clearFilter('featured')}
                  />
                </Badge>
              )}
              {(localFilters.goalMin > 0 || localFilters.goalMax < 1000000) && (
                <Badge variant="secondary" className="text-xs">
                  Goal: ${localFilters.goalMin.toLocaleString()}-${localFilters.goalMax.toLocaleString()}
                  <X 
                    className="w-3 h-3 ml-1 cursor-pointer" 
                    onClick={() => {
                      handleFilterChange('goalMin', 0);
                      handleFilterChange('goalMax', 1000000);
                    }}
                  />
                </Badge>
              )}
              {(localFilters.progressMin > 0 || localFilters.progressMax < 100) && (
                <Badge variant="secondary" className="text-xs">
                  Progress: {localFilters.progressMin}%-{localFilters.progressMax}%
                  <X 
                    className="w-3 h-3 ml-1 cursor-pointer" 
                    onClick={() => {
                      handleFilterChange('progressMin', 0);
                      handleFilterChange('progressMax', 100);
                    }}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Add missing icons
const Circle = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="8" />
  </svg>
);

const CheckCircle = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="M22 4 12 14.01l-3-3" />
  </svg>
);

const CheckCircle2 = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

export default CampaignFiltersEnhanced;
