import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import {
  Search,
  Filter,
  Clock,
  AlertTriangle,
  Eye,
  CheckCircle,
  XCircle,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Calendar,
  DollarSign,
  Target,
  User
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const ModerationQueue = ({ onSelectCampaign }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'under_review',
    search: '',
    sortBy: 'created_at',
    order: 'asc'
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const { toast } = useToast();

  // Fetch campaigns pending moderation
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('campaigns')
        .select(`
          *,
          user_profiles!created_by (id, name, email, avatar_url, trust_score),
          campaign_moderation (
            id,
            moderation_score,
            decision,
            flags,
            details,
            recommendations,
            moderated_at
          )
        `);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,story.ilike.%${filters.search}%`);
      }

      // Apply sorting
      query = query.order(filters.sortBy, { ascending: filters.order === 'asc' });

      const { data, error } = await query;
      if (error) throw error;

      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaigns',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Handle bulk actions
  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) {
      toast({
        title: 'No campaigns selected',
        description: 'Please select campaigns to perform bulk actions',
        variant: 'destructive'
      });
      return;
    }

    try {
      const updates = selectedIds.map(id => {
        return supabase
          .from('campaigns')
          .update({ status: action === 'approve' ? 'approved' : 'rejected' })
          .eq('id', id);
      });

      await Promise.all(updates);

      toast({
        title: 'Success',
        description: `${selectedIds.length} campaigns ${action}ed successfully`
      });

      setSelectedIds([]);
      fetchCampaigns();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast({
        title: 'Error',
        description: 'Failed to perform bulk action',
        variant: 'destructive'
      });
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBadge = (score) => {
    if (score >= 70) return { variant: 'default', className: 'bg-green-500/20 text-green-300 border-green-500/50' };
    if (score >= 40) return { variant: 'default', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' };
    return { variant: 'default', className: 'bg-red-500/20 text-red-300 border-red-500/50' };
  };

  const CampaignRow = ({ campaign }) => {
    const moderation = campaign.campaign_moderation?.[0];
    const score = moderation?.moderation_score || 0;
    const flags = moderation?.flags || [];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-white/10 hover:bg-white/5 transition-colors"
      >
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Checkbox */}
            <Checkbox
              checked={selectedIds.includes(campaign.id)}
              onCheckedChange={(checked) => {
                setSelectedIds(prev =>
                  checked
                    ? [...prev, campaign.id]
                    : prev.filter(id => id !== campaign.id)
                );
              }}
              className="mt-1"
            />

            {/* Campaign Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-lg text-white mb-1">
                    {campaign.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-blue-200">
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      {campaign.need_type}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      ${campaign.goal_amount.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Score Badge */}
                <Badge {...getScoreBadge(score)}>
                  Score: {score}/100
                </Badge>
              </div>

              {/* Creator Info */}
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={campaign.user_profiles?.avatar_url} />
                  <AvatarFallback>{campaign.user_profiles?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="text-white">{campaign.user_profiles?.name}</p>
                  <p className="text-blue-200">Trust Score: {campaign.user_profiles?.trust_score || 0}</p>
                </div>
              </div>

              {/* Flags */}
              {flags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {flags.map((flag, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-red-500/10 text-red-300 border-red-500/30"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {flag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Story Preview */}
              <p className="text-sm text-gray-300 line-clamp-2 mb-3">
                {campaign.story}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectCampaign(campaign)}
                  className="bg-white/10 border-white/20 hover:bg-white/20"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Review Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-green-500/20 border-green-500/50 hover:bg-green-500/30 text-green-300"
                  onClick={async () => {
                    try {
                      await supabase
                        .from('campaigns')
                        .update({ status: 'approved' })
                        .eq('id', campaign.id);
                      
                      toast({
                        title: 'Campaign Approved',
                        description: 'The campaign has been approved successfully'
                      });
                      fetchCampaigns();
                    } catch (error) {
                      toast({
                        title: 'Error',
                        description: 'Failed to approve campaign',
                        variant: 'destructive'
                      });
                    }
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Quick Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-red-300"
                  onClick={async () => {
                    try {
                      await supabase
                        .from('campaigns')
                        .update({ status: 'rejected' })
                        .eq('id', campaign.id);
                      
                      toast({
                        title: 'Campaign Rejected',
                        description: 'The campaign has been rejected'
                      });
                      fetchCampaigns();
                    } catch (error) {
                      toast({
                        title: 'Error',
                        description: 'Failed to reject campaign',
                        variant: 'destructive'
                      });
                    }
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Quick Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search campaigns..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10 bg-black/20 border-white/20 text-white"
            />
          </div>
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ ...filters, status: value })}
          >
            <SelectTrigger className="w-48 bg-black/20 border-white/20 text-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-white/20">
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.sortBy}
            onValueChange={(value) => setFilters({ ...filters, sortBy: value })}
          >
            <SelectTrigger className="w-48 bg-black/20 border-white/20 text-white">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-white/20">
              <SelectItem value="created_at">Date Created</SelectItem>
              <SelectItem value="goal_amount">Goal Amount</SelectItem>
              <SelectItem value="moderation_score">Moderation Score</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchCampaigns()}
            className="bg-black/20 border-white/20 hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('approve')}
              className="bg-green-500/20 border-green-500/50 hover:bg-green-500/30 text-green-300"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve ({selectedIds.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('reject')}
              className="bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-red-300"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject ({selectedIds.length})
            </Button>
          </div>
        )}
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-white">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-white text-lg">No campaigns to review</p>
            <p className="text-gray-400 mt-2">All campaigns have been processed</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-0">
            {campaigns.map((campaign) => (
              <CampaignRow key={campaign.id} campaign={campaign} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ModerationQueue;