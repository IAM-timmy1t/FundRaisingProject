import { useState, useEffect } from 'react';
import { Save, Bell, BellOff, Trash2, Search, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { searchService } from '@/services/searchService';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function SavedSearches({ currentSearch, currentFilters, className }) {
  const [savedSearches, setSavedSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state for saving new search
  const [saveForm, setSaveForm] = useState({
    name: '',
    alertEnabled: false,
    alertFrequency: 'daily'
  });

  useEffect(() => {
    if (user) {
      loadSavedSearches();
    }
  }, [user]);

  const loadSavedSearches = async () => {
    try {
      setIsLoading(true);
      const searches = await searchService.getSavedSearches();
      setSavedSearches(searches);
    } catch (error) {
      console.error('Error loading saved searches:', error);
      toast.error('Failed to load saved searches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSearch = async () => {
    if (!saveForm.name.trim()) {
      toast.error('Please enter a name for your saved search');
      return;
    }

    try {
      const savedSearch = await searchService.saveSearch({
        name: saveForm.name,
        query: currentSearch,
        filters: currentFilters,
        sortBy: currentFilters.sortBy || 'relevance',
        alertEnabled: saveForm.alertEnabled,
        alertFrequency: saveForm.alertFrequency
      });

      setSavedSearches([savedSearch, ...savedSearches]);
      setShowSaveDialog(false);
      setSaveForm({ name: '', alertEnabled: false, alertFrequency: 'daily' });
      toast.success('Search saved successfully!');
    } catch (error) {
      console.error('Error saving search:', error);
      toast.error('Failed to save search');
    }
  };

  const handleDeleteSearch = async (searchId) => {
    try {
      await searchService.deleteSavedSearch(searchId);
      setSavedSearches(savedSearches.filter(s => s.id !== searchId));
      toast.success('Saved search deleted');
    } catch (error) {
      console.error('Error deleting search:', error);
      toast.error('Failed to delete search');
    }
  };

  const handleToggleAlert = async (search) => {
    try {
      const updated = await searchService.updateSavedSearch(search.id, {
        alert_enabled: !search.alert_enabled
      });
      setSavedSearches(savedSearches.map(s => 
        s.id === search.id ? updated : s
      ));
      toast.success(`Alerts ${updated.alert_enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating search:', error);
      toast.error('Failed to update search');
    }
  };

  const handleUpdateName = async (searchId) => {
    if (!editName.trim()) return;

    try {
      const updated = await searchService.updateSavedSearch(searchId, {
        name: editName
      });
      setSavedSearches(savedSearches.map(s => 
        s.id === searchId ? updated : s
      ));
      setEditingId(null);
      setEditName('');
      toast.success('Search name updated');
    } catch (error) {
      console.error('Error updating search name:', error);
      toast.error('Failed to update search name');
    }
  };

  const handleRunSearch = (search) => {
    const params = new URLSearchParams();
    if (search.search_query) params.set('q', search.search_query);
    if (search.filters) {
      Object.entries(search.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.set(key, value);
        }
      });
    }
    if (search.sort_by) params.set('sortBy', search.sort_by);
    
    navigate(`/search?${params.toString()}`);
  };

  const formatFilters = (filters) => {
    if (!filters) return null;
    
    const filterBadges = [];
    if (filters.category) filterBadges.push(filters.category);
    if (filters.location) filterBadges.push(filters.location);
    if (filters.isFeatured) filterBadges.push('Featured');
    if (filters.isVerified) filterBadges.push('Verified');
    
    return filterBadges;
  };

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Sign in to save your searches and get alerts
          </p>
          <Button onClick={() => navigate('/auth/signin')}>
            Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Saved Searches</CardTitle>
            <CardDescription>
              Get notified when new campaigns match your criteria
            </CardDescription>
          </div>
          {currentSearch && (
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Save className="w-4 h-4 mr-2" />
                  Save Search
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Current Search</DialogTitle>
                  <DialogDescription>
                    Save your search criteria to quickly access it later
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Search Name</Label>
                    <Input
                      id="name"
                      value={saveForm.name}
                      onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                      placeholder="e.g., Education campaigns in California"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="alerts">Email Alerts</Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified about new matching campaigns
                      </p>
                    </div>
                    <Switch
                      id="alerts"
                      checked={saveForm.alertEnabled}
                      onCheckedChange={(checked) => 
                        setSaveForm({ ...saveForm, alertEnabled: checked })
                      }
                    />
                  </div>

                  {saveForm.alertEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="frequency">Alert Frequency</Label>
                      <Select
                        value={saveForm.alertFrequency}
                        onValueChange={(value) => 
                          setSaveForm({ ...saveForm, alertFrequency: value })
                        }
                      >
                        <SelectTrigger id="frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
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
                    Save Search
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading saved searches...
          </div>
        ) : savedSearches.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No saved searches yet
          </div>
        ) : (
          <div className="space-y-3">
            {savedSearches.map((search) => (
              <div
                key={search.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <Search className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  {editingId === search.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleUpdateName(search.id)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setEditingId(null);
                          setEditName('');
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="font-medium text-sm cursor-pointer hover:text-primary"
                      onClick={() => handleRunSearch(search)}
                    >
                      {search.name}
                    </div>
                  )}
                  
                  {search.search_query && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      "{search.search_query}"
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-1">
                    {formatFilters(search.filters)?.map((filter, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {filter}
                      </Badge>
                    ))}
                    {search.alert_enabled && (
                      <Badge variant="outline" className="text-xs">
                        <Bell className="w-3 h-3 mr-1" />
                        {search.alert_frequency}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    Saved {formatDistanceToNow(new Date(search.created_at), { addSuffix: true })}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      setEditingId(search.id);
                      setEditName(search.name);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => handleToggleAlert(search)}
                  >
                    {search.alert_enabled ? (
                      <BellOff className="h-3 w-3" />
                    ) : (
                      <Bell className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDeleteSearch(search.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
