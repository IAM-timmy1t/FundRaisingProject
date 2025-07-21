'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Send, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

export default function ReceiptManager({ userId }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchReceipts();
  }, [userId, filter]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/receipts?userId=${userId}&filter=${filter}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setReceipts(data.receipts);
    } catch (error) {
      toast({
        title: 'Error fetching receipts',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = async (receiptId, receiptNumber) => {
    try {
      const response = await fetch(`/api/receipts/${receiptId}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to download receipt');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receiptNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Receipt downloaded',
        description: `Receipt ${receiptNumber} has been downloaded successfully.`
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const resendReceipt = async (receiptId, receiptNumber) => {
    try {
      const response = await fetch(`/api/receipts/${receiptId}/resend`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Receipt sent',
        description: `Receipt ${receiptNumber} has been resent to your email.`
      });
    } catch (error) {
      toast({
        title: 'Failed to send receipt',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const regenerateReceipt = async (donationId) => {
    try {
      const response = await fetch(`/api/receipts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ donationId })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Receipt regenerated',
        description: 'A new receipt has been generated and sent to your email.'
      });

      // Refresh the list
      fetchReceipts();
    } catch (error) {
      toast({
        title: 'Failed to regenerate receipt',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const filteredReceipts = receipts.filter(receipt => 
    receipt.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    receipt.campaign_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tax Receipts</CardTitle>
          <CardDescription>
            Manage and download your donation tax receipts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search receipts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full p-2 border rounded-md"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchReceipts}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All Receipts</TabsTrigger>
                <TabsTrigger value="current-year">Current Year</TabsTrigger>
                <TabsTrigger value="previous-year">Previous Year</TabsTrigger>
              </TabsList>

              <TabsContent value={filter} className="mt-4">
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">Loading receipts...</p>
                  </div>
                ) : filteredReceipts.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">No receipts found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredReceipts.map((receipt) => (
                      <ReceiptCard
                        key={receipt.id}
                        receipt={receipt}
                        onDownload={downloadReceipt}
                        onResend={resendReceipt}
                        onRegenerate={regenerateReceipt}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReceiptCard({ receipt, onDownload, onResend, onRegenerate }) {
  const getReceiptTypeLabel = (type) => {
    const labels = {
      'us-tax-receipt': 'US Tax Receipt',
      'uk-gift-aid-receipt': 'UK Gift Aid',
      'ca-tax-receipt': 'Canadian Tax Receipt',
      'standard-receipt': 'Standard Receipt'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status) => {
    if (status === 'generated') {
      return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" /> Generated</Badge>;
    } else if (status === 'pending') {
      return <Badge variant="warning"><AlertCircle className="h-3 w-3 mr-1" /> Pending</Badge>;
    } else {
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{receipt.receipt_number}</h3>
              {getStatusBadge(receipt.status)}
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              {receipt.campaign_title}
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                <strong>Amount:</strong> ${receipt.amount.toFixed(2)} {receipt.currency}
              </span>
              <span>
                <strong>Date:</strong> {format(new Date(receipt.donation_date), 'MMM d, yyyy')}
              </span>
              <span>
                <strong>Type:</strong> {getReceiptTypeLabel(receipt.receipt_type)}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2">
            {receipt.status === 'generated' ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDownload(receipt.id, receipt.receipt_number)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onResend(receipt.id, receipt.receipt_number)}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Resend
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="default"
                onClick={() => onRegenerate(receipt.donation_id)}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Generate
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
