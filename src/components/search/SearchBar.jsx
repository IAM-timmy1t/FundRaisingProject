import { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { searchService } from '@/services/searchService';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

export default function SearchBar({ className, onSearch, placeholder = "Search campaigns..." }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2) {
      loadSuggestions(debouncedQuery);
    } else if (!debouncedQuery) {
      loadInitialData();
    }
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadSuggestions = async (searchTerm) => {
    try {
      setIsLoading(true);
      const results = await searchService.getSearchSuggestions(searchTerm);
      setSuggestions(results);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInitialData = async () => {
    try {
      const [recent, popular] = await Promise.all([
        searchService.getSearchHistory(5),
        searchService.getPopularSearches(5)
      ]);
      setRecentSearches(recent);
      setPopularSearches(popular);
      setSuggestions([]);
    } catch (error) {
      console.error('Error loading search data:', error);
    }
  };

  const handleSearch = (searchQuery = query) => {
    if (!searchQuery.trim()) return;

    setIsOpen(false);
    
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    loadInitialData();
  };

  const renderDropdownContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 text-center text-sm text-muted-foreground">
          Loading suggestions...
        </div>
      );
    }

    if (suggestions.length > 0) {
      return (
        <div className="py-2">
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            Suggestions
          </div>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion.suggestion)}
              className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center justify-between group"
            >
              <span>{suggestion.suggestion}</span>
              {suggestion.category && (
                <Badge variant="secondary" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {suggestion.category}
                </Badge>
              )}
            </button>
          ))}
        </div>
      );
    }

    return (
      <>
        {recentSearches.length > 0 && (
          <div className="py-2">
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Recent Searches
            </div>
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(search.search_query)}
                className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground text-sm"
              >
                {search.search_query}
              </button>
            ))}
          </div>
        )}

        {popularSearches.length > 0 && (
          <div className="py-2 border-t">
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Popular Searches
            </div>
            {popularSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(search.term)}
                className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center justify-between group"
              >
                <span className="text-sm">{search.term}</span>
                {search.category && (
                  <Badge variant="outline" className="text-xs">
                    {search.category}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}

        {recentSearches.length === 0 && popularSearches.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Start typing to search campaigns
          </div>
        )}
      </>
    );
  };

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-20"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button
              onClick={clearSearch}
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={() => handleSearch()}
            size="sm"
            className="h-7"
          >
            Search
          </Button>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-96 overflow-auto">
          {renderDropdownContent()}
        </div>
      )}
    </div>
  );
}
