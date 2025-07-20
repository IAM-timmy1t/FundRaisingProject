import { useState, useEffect } from 'react';
import { Filter, ChevronDown, ChevronUp, X, MapPin, Shield, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'medical', label: 'Medical', icon: '🏥' },
  { value: 'education', label: 'Education', icon: '🎓' },
  { value: 'disaster-relief', label: 'Disaster Relief', icon: '🆘' },
  { value: 'community', label: 'Community', icon: '👥' },
  { value: 'religious', label: 'Religious', icon: '⛪' },
  { value: 'housing', label: 'Housing', icon: '🏠' },
  { value: 'food-security', label: 'Food Security', icon: '🍽️' },
  { value: 'other', label: 'Other', icon: '🤝' }
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'ending_soon', label: 'Ending Soon' },
  { value: 'most_funded', label: 'Most Funded' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'progress', label: 'Highest Progress' }
];

export default function AdvancedSearchFilters({ 
  filters, 
  onFiltersChange, 
  onApply,
  onClear,
  className,
  showCompact = false 
}) {
  const [localFilters, setLocalFilters] = useState({
    category: '',
    locationCountry: '',
    locationCity: '',
    minProgress: 0,
    maxProgress: 100,
    isVerified: false,
    isFeatured: false,
    sortBy: 'relevance',
    ...filters
  });

  const [countries, setCountries] = useState([]);
  const [isExpanded, setIsExpanded] = useState(!showCompact);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  useEffect(() => {
    loadCountries();
  }, []);

  useEffect(() => {
    // Count active filters
    let count = 0;
    if (localFilters.category) count++;
    if (localFilters.locationCountry) count++;
    if (localFilters.locationCity) count++;
    if (localFilters.minProgress > 0 || localFilters.maxProgress < 100) count++;
    if (localFilters.isVerified) count++;
    if (localFilters.isFeatured) count++;
    setActiveFiltersCount(count);
  }, [localFilters]);

  const loadCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('location_country')
        .not('location_country', 'is', null)
        .order('location_country');

      if (error) throw error;

      // Get unique countries
      const uniqueCountries = [...new Set(data.map(c => c.location_country))];
      setCountries(uniqueCountries);
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    
    // Immediately update parent if not in compact mode
    if (!showCompact && onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  const handleApply = () => {
    if (onFiltersChange) {
      onFiltersChange(localFilters);
    }
    if (onApply) {
      onApply(localFilters);
    }
    if (showCompact) {
      setIsExpanded(false);
    }
  };

  const handleClear = () => {
    const clearedFilters = {
      category: '',
      locationCountry: '',
      locationCity: '',
      minProgress: 0,
      maxProgress: 100,
      isVerified: false,
      isFeatured: false,
      sortBy: 'relevance'
    };
    setLocalFilters(clearedFilters);
    
    if (onFiltersChange) {
      onFiltersChange(clearedFilters);
    }
    if (onClear) {
      onClear();
    }
  };

  const progressValue = localFilters.minProgress || localFilters.maxProgress !== 100
    ? `${localFilters.minProgress}% - ${localFilters.maxProgress}%`
    : 'Any';

  if (showCompact) {
    return (
      <div className={className}>
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount}</Badge>
            )}
          </span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="mt-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                {renderFilters()}
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleApply} className="flex-1">
                    Apply Filters
                  </Button>
                  <Button variant="outline" onClick={handleClear}>
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  const renderFilters = () => (
    <>
      {/* Sort By */}
      <div className="space-y-2">
        <Label htmlFor="sort">Sort By</Label>
        <Select 
          value={localFilters.sortBy} 
          onValueChange={(value) => handleFilterChange('sortBy', value)}
        >
          <SelectTrigger id="sort">
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
        <Label htmlFor="category">Category</Label>
        <Select 
          value={localFilters.category} 
          onValueChange={(value) => handleFilterChange('category', value)}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                <span className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  {cat.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location
        </Label>
        <Select 
          value={localFilters.locationCountry} 
          onValueChange={(value) => handleFilterChange('locationCountry', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any country</SelectItem>
            {countries.map(country => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {localFilters.locationCountry && (
          <Input
            placeholder="City (optional)"
            value={localFilters.locationCity}
            onChange={(e) => handleFilterChange('locationCity', e.target.value)}
            className="mt-2"
          />
        )}
      </div>

      {/* Funding Progress */}
      <div className="space-y-2">
        <Label>Funding Progress</Label>
        <div className="px-3 py-2 bg-muted rounded-md">
          <span className="text-sm font-medium">{progressValue}</span>
        </div>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Min: {localFilters.minProgress}%</span>
              <span>Max: {localFilters.maxProgress}%</span>
            </div>
            <Slider
              value={[localFilters.minProgress, localFilters.maxProgress]}
              onValueChange={([min, max]) => {
                handleFilterChange('minProgress', min);
                handleFilterChange('maxProgress', max);
              }}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Special Filters */}
      <div className="space-y-3">
        <Label>Special Filters</Label>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="verified"
            checked={localFilters.isVerified}
            onCheckedChange={(checked) => handleFilterChange('isVerified', checked)}
          />
          <label
            htmlFor="verified"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
          >
            <Shield className="h-4 w-4 text-blue-600" />
            Verified Campaigns Only
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="featured"
            checked={localFilters.isFeatured}
            onCheckedChange={(checked) => handleFilterChange('isFeatured', checked)}
          />
          <label
            htmlFor="featured"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
          >
            <Star className="h-4 w-4 text-yellow-600" />
            Featured Campaigns Only
          </label>
        </div>
      </div>
    </>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary">{activeFiltersCount} active</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderFilters()}
        
        <Separator className="my-4" />
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleClear}
            disabled={activeFiltersCount === 0}
            className="flex-1"
          >
            Clear All
          </Button>
          {!showCompact && (
            <Button onClick={handleApply} className="flex-1">
              Apply Filters
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
