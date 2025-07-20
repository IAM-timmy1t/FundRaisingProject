import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { donationService } from '@/services/donationService';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Calendar, 
  DollarSign, 
  FileText, 
  Download,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTranslation } from 'react-i18next';
import { useMediaQuery, useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

const DonationHistory = ({ userId, limit = 10, compact = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedCards, setExpandedCards] = useState(new Set());

  useEffect(() => {
    fetchDonations();
  }, [userId, page, sortBy, sortOrder, limit]);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const result = await donationService.getUserDonations(userId, {
        page,
        limit,
        sortBy,
        sortOrder
      });
      
      setDonations(result.donations);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const getReceiptUrl = async (donationId) => {
    try {
      // TODO: Implement receipt generation
      console.log('Generate receipt for donation:', donationId);
    } catch (error) {
      console.error('Error generating receipt:', error);
    }
  };

  const toggleCardExpansion = (donationId) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(donationId)) {
      newExpanded.delete(donationId);
    } else {
      newExpanded.add(donationId);
    }
    setExpandedCards(newExpanded);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (donations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">
          {t('donor.noDonations', 'No donations found')}
        </p>
        <Button onClick={() => navigate('/campaigns')}>
          {t('donor.exploreCampaigns', 'Explore Campaigns')}
        </Button>
      </div>
    );
  }

  // Mobile Card View
  const MobileCardView = () => (
    <div className="space-y-3">
      {donations.map((donation) => {
        const isExpanded = expandedCards.has(donation.id);
        
        return (
          <div
            key={donation.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Card Header - Always Visible */}
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-base line-clamp-2 pr-2">
                  {donation.campaign.title}
                </h4>
                <Badge variant="success" className="capitalize text-xs shrink-0">
                  {donation.payment_status}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  {formatDate(donation.created_at)}
                </div>
                <div className="font-semibold text-lg">
                  {formatCurrency(donation.amount, donation.currency)}
                </div>
              </div>
            </div>

            {/* Expandable Section */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <button
                  onClick={() => toggleCardExpansion(donation.id)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span>View Details</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                  {donation.campaign.creator && (
                    <div className="text-sm">
                      <span className="text-gray-500">Campaign by:</span>
                      <span className="ml-2 font-medium">{donation.campaign.creator.name}</span>
                    </div>
                  )}
                  
                  {donation.is_anonymous && (
                    <div className="text-sm text-gray-500">
                      Donated anonymously
                    </div>
                  )}
                  
                  <div className="flex space-x-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/campaigns/${donation.campaign.id}`)}
                      className="flex-1"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Campaign
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => getReceiptUrl(donation.id)}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Receipt
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      })}
    </div>
  );

  // Desktop Table View
  const DesktopTableView = () => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">{t('donor.campaign', 'Campaign')}</TableHead>
            <TableHead>{t('donor.date', 'Date')}</TableHead>
            <TableHead className="text-right">{t('donor.amount', 'Amount')}</TableHead>
            <TableHead>{t('donor.status', 'Status')}</TableHead>
            <TableHead className="text-right">{t('donor.actions', 'Actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {donations.map((donation) => (
            <TableRow key={donation.id}>
              <TableCell>
                <div>
                  <p className="font-medium line-clamp-1">
                    {donation.campaign.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    by {donation.campaign.creator?.name || 'Unknown'}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  {formatDate(donation.created_at)}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="font-semibold">
                    {formatCurrency(donation.amount, donation.currency)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="success" className="capitalize">
                  {donation.payment_status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/campaigns/${donation.campaign.id}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => getReceiptUrl(donation.id)}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
            const [field, order] = value.split('-');
            setSortBy(field);
            setSortOrder(order);
            setPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">Newest First</SelectItem>
              <SelectItem value="created_at-asc">Oldest First</SelectItem>
              <SelectItem value="amount-desc">Highest Amount</SelectItem>
              <SelectItem value="amount-asc">Lowest Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Donation List - Responsive */}
      {compact || isMobile ? <MobileCardView /> : <DesktopTableView />}

      {/* Pagination */}
      {!compact && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationHistory;