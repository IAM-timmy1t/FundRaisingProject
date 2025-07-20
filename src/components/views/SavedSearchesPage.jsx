import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '@/components/ui/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Save, Bell, BellOff, Search, MoreVertical, Trash2, Edit, Info } from 'lucide-react';
import { searchService } from '@/services/searchService';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SavedSearchesPage() {
  const [savedSearches, setSavedSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/auth/signin');
      return;
    }
    loadSavedSearches();
  }, [user, navigate]);

  const loadSavedSearches = async () => {
    setIsLoading(true);
    try {
      const searches = await searchService.getSavedSearches();
      setSavedSearches(searches);
    } catch (error) {
      console.error('Error loading saved searches:', error);
      toast.error('Failed to load saved searches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunSearch = (search) => {
    const params = new URLSearchParams();
    if (search.search_query) params.set('q', search.search_query);
    
    if (search.filters) {
      Object.entries(search.filters).forEach(([key, value]) => {
        if (value && value !== '' && value !== 0 && value !== 100) {
          params.set(key, value.toString());
        }
      });
    }
    
    navigate(`/search?${params.toString()}`);
  };

  const handleToggleAlerts = async (searchId, currentValue) => {
    try {
      await searchService.updateSavedSearch(searchId, {
        email_alerts: !currentValue
      });
      
      setSavedSearches(prev =>
        prev.map(s =>
          s.id === searchId ? { ...s, email_alerts: !currentValue } : s
        )
      );
      
      toast.success(
        !currentValue
          ? 'Email alerts enabled'
          : 'Email alerts disabled'
      );
    } catch (error) {
      console.error('Error updating search:', error);
      toast.error('Failed to update email alerts');
    }
  };

  const handleDelete = async (searchId) => {
    if (!confirm('Are you sure you want to delete this saved search?')) return;
    
    try {
      await searchService.deleteSavedSearch(searchId);
      setSavedSearches(prev => prev.filter(s => s.id !== searchId));
      toast.success('Search deleted');
    } catch (error) {
      console.error('Error deleting search:', error);
      toast.error('Failed to delete search');
    }
  };

  const getSearchSummary = (search) => {
    const parts = [];
    if (search.search_query) parts.push(`"${search.search_query}"`);
    
    if (search.filters) {
      if (search.filters.category) parts.push(`in ${search.filters.category}`);
      if (search.filters.locationCountry) parts.push(`from ${search.filters.locationCountry}`);
      if (search.filters.isVerified) parts.push('verified');
      if (search.filters.isFeatured) parts.push('featured');
    }
    
    return parts.length > 0 ? parts.join(', ') : 'All campaigns';
  };

  if (isLoading) {
    return (
      <Container className="py-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Saved Searches</h1>
        <p className="text-muted-foreground">
          Manage your saved searches and email alerts
        </p>
      </div>

      {savedSearches.length === 0 ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">No saved searches yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Save searches to quickly access them later or get email alerts when new campaigns match.
            </p>
            <Button size="sm" onClick={() => navigate('/search')}>
              <Search className="h-4 w-4 mr-2" />
              Start Searching
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {savedSearches.map((search) => (
            <Card key={search.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {search.name}
                    </CardTitle>
                    <CardDescription>
                      {getSearchSummary(search)}
                    </CardDescription>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRunSearch(search)}>
                        <Search className="h-4 w-4 mr-2" />
                        Run Search
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(search.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      Created {format(new Date(search.created_at), 'MMM d, yyyy')}
                    </span>
                    {search.last_alerted_at && (
                      <span>
                        Last alert: {format(new Date(search.last_alerted_at), 'MMM d')}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {search.email_alerts ? (
                        <Bell className="h-4 w-4 text-primary" />
                      ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">
                        Email Alerts
                      </span>
                      <Switch
                        checked={search.email_alerts}
                        onCheckedChange={() => handleToggleAlerts(search.id, search.email_alerts)}
                      />
                    </div>
                    
                    {search.email_alerts && (
                      <Badge variant="outline">
                        {search.alert_frequency}
                      </Badge>
                    )}
                    
                    <Button
                      onClick={() => handleRunSearch(search)}
                      size="sm"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
