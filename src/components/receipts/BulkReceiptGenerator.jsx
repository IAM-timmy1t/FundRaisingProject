'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CalendarIcon, 
  Download, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

export default function BulkReceiptGenerator() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [options, setOptions] = useState({
    sendEmail: false,
    regenerateExisting: false,
    includeFailedDonations: false
  });
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      toast({
        title: 'Invalid date range',
        description: 'Please select both start and end dates.',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setResults(null);

    try {
      const response = await fetch('/api/admin/receipts/bulk-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          options
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate receipts');
      }

      // Handle streaming response for progress updates
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.type === 'progress') {
              setProgress(data.progress);
            } else if (data.type === 'complete') {
              setResults(data.results);
            }
          } catch (e) {
            console.error('Failed to parse progress data:', e);
          }
        }
      }

      toast({
        title: 'Bulk generation complete',
        description: `Successfully generated ${results?.successful || 0} receipts.`
      });
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = async () => {
    try {
      const response = await fetch('/api/admin/receipts/bulk-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ results })
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulk-receipt-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Receipt Generation</CardTitle>
          <CardDescription>
            Generate tax receipts for multiple donations at once
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Select start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'Select end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Generation Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendEmail"
                  checked={options.sendEmail}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, sendEmail: checked }))
                  }
                />
                <label
                  htmlFor="sendEmail"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Send receipts via email after generation
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="regenerateExisting"
                  checked={options.regenerateExisting}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, regenerateExisting: checked }))
                  }
                />
                <label
                  htmlFor="regenerateExisting"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Regenerate existing receipts
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeFailedDonations"
                  checked={options.includeFailedDonations}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, includeFailedDonations: checked }))
                  }
                />
                <label
                  htmlFor="includeFailedDonations"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include previously failed donations
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating receipts...
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Results */}
          {results && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Generation Complete</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  <p>Total processed: {results.total}</p>
                  <p>Successful: {results.successful}</p>
                  <p>Failed: {results.failed}</p>
                  {results.skipped > 0 && <p>Skipped: {results.skipped}</p>}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !startDate || !endDate}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Receipts
                </>
              )}
            </Button>

            {results && (
              <Button
                variant="outline"
                onClick={downloadReport}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Select a date range to generate receipts for all completed donations within that period.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Enable "Send receipts via email" to automatically email receipts to donors after generation.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Use "Regenerate existing receipts" to create new receipts even if they already exist.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              The process may take several minutes for large date ranges.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
