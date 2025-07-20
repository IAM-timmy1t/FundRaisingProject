import { useState } from 'react';
import { Save, Bell } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SaveSearchDialog({ 
  open, 
  onOpenChange, 
  onSave, 
  query, 
  filters 
}) {
  const [name, setName] = useState(query || 'My Search');
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [alertFrequency, setAlertFrequency] = useState('daily');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name, emailAlerts, alertFrequency);
  };

  const getSearchSummary = () => {
    const parts = [];
    if (query) parts.push(`"${query}"`);
    if (filters.category) parts.push(`in ${filters.category}`);
    if (filters.locationCountry) parts.push(`from ${filters.locationCountry}`);
    if (filters.isVerified) parts.push('verified campaigns');
    if (filters.isFeatured) parts.push('featured campaigns');
    
    return parts.length > 0 ? parts.join(', ') : 'All campaigns';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save Search
          </DialogTitle>
          <DialogDescription>
            Save this search to quickly access it later or get email alerts when new campaigns match.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Summary */}
          <Alert>
            <AlertDescription className="text-sm">
              <strong>Search criteria:</strong> {getSearchSummary()}
            </AlertDescription>
          </Alert>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="search-name">Search Name</Label>
            <Input
              id="search-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Medical campaigns in my area"
              autoFocus
            />
          </div>

          {/* Email Alerts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-alerts" className="text-base">
                  Email Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when new campaigns match this search
                </p>
              </div>
              <Switch
                id="email-alerts"
                checked={emailAlerts}
                onCheckedChange={setEmailAlerts}
              />
            </div>

            {emailAlerts && (
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                <Label>Alert Frequency</Label>
                <RadioGroup value={alertFrequency} onValueChange={setAlertFrequency}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="instant" id="instant" />
                    <label htmlFor="instant" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Instant (as soon as new campaigns match)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="daily" />
                    <label htmlFor="daily" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Daily digest
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="weekly" id="weekly" />
                    <label htmlFor="weekly" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Weekly digest
                    </label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            <Save className="h-4 w-4 mr-2" />
            Save Search
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
