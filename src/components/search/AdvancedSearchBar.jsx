import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, MapPin, Filter, Save, Bell, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { searchService } from '@/services/searchService';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

export default function AdvancedSearchBar({ 
  onSearch, 
  initialQuery = '', 
  placeholder = 'Search campaigns by title, category, or location...',
  className,
  showSaveSearch = true,
  showHistory = true,
  showSuggestions = true,
  autoFocus = false
}) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState('');
  const [enableAlerts, setEnableAlerts] = useState(false);
  const [alertFrequency, setAlertFrequency] = useState('daily');
  const [userLocation, setUserLocation] = useState(null);
  
  const { user } = useAuth();
  const searchInputRef = useRef(null);
  const debouncedQuery = useDebounce(query, 300);

  // Load search history on mount
  useEffect(() => {
    if (user && showHistory) {
      loadSearchHistory();
    }
  }, [user, showHistory]);

  // Get search suggestions
  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2 && showSuggestions) {
      getSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery, showSuggestions]);

  const loadSearchHistory = async () => {
    try {
      const history = await searchService.getUserSearchHistory(user.id, 5);
      setSearchHistory(history);
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const getSuggestions = async (searchQuery) => {
    try {
      setIsLoading(true);
      const results = await searchService.getSearchSuggestions(searchQuery);
      setSuggestions(results);
      setShowSuggestionsList(true);
    } catch (error) {
      console.error('Error getting suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (searchQuery = query, filters = {}) => {
    if (!searchQuery.trim() && Object.keys(filters).length === 0) return;
    
    setShowSuggestionsList(false);
    onSearch({ query: searchQuery, ...filters });
    
    // Track search history
    if (user && searchQuery) {
      searchService.trackSearchHistory(user.id, searchQuery, filters, 0);
      loadSearchHistory();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.suggestion);
    setShowSuggestionsList(false);
    
    // Apply appropriate filter based on suggestion type
    const filters = {};
    if (suggestion.type === 'category') {
      filters.category = suggestion.suggestion;
    } else if (suggestion.type === 'location') {
      filters.location = suggestion.suggestion;
    }
    
    handleSearch(suggestion.suggestion, filters);
  };

  const handleHistoryClick = (historyItem) => {
    setQuery(historyItem.search_query);
    handleSearch(historyItem.search_query, historyItem.filters || {});
  };

  const handleSaveSearch = async () => {
    if (!user || !savedSearchName.trim()) {
      toast.error('Please enter a name for your saved search');
      return;
    }

    try {
      await searchService.saveSearch(
        user.id,
        savedSearchName,
        query,
        {}, // Current filters would go here
        enableAlerts,
        alertFrequency
      );
      
      toast.success('Search saved successfully!');
      setShowSaveDialog(false);
      setSavedSearchName('');
      setEnableAlerts(false);
      setAlertFrequency('daily');
    } catch (error) {
      console.error('Error saving search:', error);
      toast.error('Failed to save search');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestionsList(false);
    }
  };

  const requestUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          toast.success('Location detected! You can now search nearby campaigns.');
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Unable to get your location');
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestionsList(false);
    onSearch({ query: '' });
  };

  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'category':
        return <Filter className="w-4 h-4" />;
      case 'location':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestionsList(true)}
              className="pl-10 pr-10"
              autoFocus={autoFocus}
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <Button onClick={() => handleSearch()}>
            Search
          </Button>
          
          {!userLocation && (
            <Button
              variant="outline"
              size="icon"
              onClick={requestUserLocation}
              title="Search nearby campaigns"
            >
              <MapPin className="w-5 h-5" />
            </Button>
          )}
          
          {user && showSaveSearch && query && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSaveDialog(true)}
              title="Save this search"
            >
              <Save className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestionsList && (suggestions.length > 0 || (searchHistory.length > 0 && !query)) && (
          <Card className="absolute top-full mt-2 w-full z-50 shadow-lg">
            <CardContent className="p-0">
              {/* Search History */}
              {!query && searchHistory.length > 0 && (
                <div className="p-3 border-b">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Recent Searches</p>
                  <div className="space-y-1">
                    {searchHistory.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleHistoryClick(item)}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm flex items-center gap-2"
                      >
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <span>{item.search_query}</span>
                        {item.results_count > 0 && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {item.results_count} results
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="p-3">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Suggestions</p>
                  <div className="space-y-1">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm flex items-center gap-2"
                      >
                        {getSuggestionIcon(suggestion.type)}
                        <span className="flex-1">{suggestion.suggestion}</span>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.type}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Searches */}
              {!query && (
                <div className="p-3 border-t">
                  <button
                    onClick={() => handleSearch('', { sortBy: 'trending' })}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm flex items-center gap-2"
                  >
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span>View Trending Campaigns</span>
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Save this search to quickly access it later and optionally receive alerts for new matches.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Search Name</Label>
              <Input
                id="search-name"
                placeholder="e.g., Education campaigns in New York"
                value={savedSearchName}
                onChange={(e) => setSavedSearchName(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="email-alerts">Email Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when new campaigns match this search
                </p>
              </div>
              <Switch
                id="email-alerts"
                checked={enableAlerts}
                onCheckedChange={setEnableAlerts}
              />
            </div>

            {enableAlerts && (
              <div className="space-y-2">
                <Label htmlFor="alert-frequency">Alert Frequency</Label>
                <Select value={alertFrequency} onValueChange={setAlertFrequency}>
                  <SelectTrigger id="alert-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                    <SelectItem value="weekly">Weekly Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSearch}>
              <Bell className="w-4 h-4 mr-2" />
              Save Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
