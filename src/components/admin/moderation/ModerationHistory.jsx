import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  User,
  Shield,
  FileText,
  RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const ModerationHistory = ({ onSelectCampaign }) => {
  const [moderations, setModerations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    decision: 'all',
    search: '',
    sortBy: 'moderated_at',
    order: 'desc'
  });
  const { toast } = useToast();

  // Fetch moderation history
  const fetchModerations = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('campaign_moderation')
        .select(`
          *,
          campaigns (
            id,
            title,
            need_type,
            goal_amount,
            status,
            created_by,
            user_profiles!created_by (
              id,
              name,
              email,
              avatar_url,
              trust_score
            )
          ),
          reviewed_by_user:auth.users!reviewed_by (
            id,
            email
          )
        `);

      // Apply filters
      if (filters.decision !== 'all') {
        query = query.eq('decision', filters.decision);
      }

      if (filters.search) {
        // This is a bit complex since we need to search campaign titles
        // through the relation. For now, we'll filter client-side
      }

      // Apply sorting
      query = query.order(filters.sortBy, { ascending: filters.order === 'asc' });

      const { data, error } = await query;
      if (error) throw error;

      // Client-side filtering for search
      let filteredData = data || [];
      if (filters.search) {
        filteredData = filteredData.filter(mod =>
          mod.campaigns?.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
          mod.campaigns?.user_profiles?.name?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      setModerations(filteredData);
    } catch (error) {
      console.error('Error fetching moderation history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load moderation history',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    fetchModerations();
  }, [fetchModerations]);

  const getDecisionBadge = (decision) => {
    switch (decision) {
      case 'approved':
        return { variant: 'default', className: 'bg-green-500/20 text-green-300 border-green-500/50' };
      case 'rejected':
        return { variant: 'default', className: 'bg-red-500/20 text-red-300 border-red-500/50' };
      case 'review':
        return { variant: 'default', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' };
      default:
        return { variant: 'default', className: 'bg-gray-500/20 text-gray-300 border-gray-500/50' };
    }
  };

  const ModerationRow = ({ moderation }) => {
    const campaign = moderation.campaigns;
    if (!campaign) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-white/10 hover:bg-white/5 transition-colors p-4"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Campaign Info */}
            <div className="mb-2">
              <h3 className="font-semibold text-lg text-white">
                {campaign.title}
              </h3>
              <div className="flex items-center gap-4 text-sm text-blue-200 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Moderated {formatDistanceToNow(new Date(moderation.moderated_at), { addSuffix: true })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {moderation.processing_time}ms
                </span>
              </div>
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

            {/* Moderation Details */}
            <div className="flex items-center gap-2 mb-2">
              <Badge {...getDecisionBadge(moderation.decision)}>
                {moderation.decision.charAt(0).toUpperCase() + moderation.decision.slice(1)}
              </Badge>
              <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/50">
                Score: {moderation.moderation_score}/100
              </Badge>
              {moderation.reviewed_by && (
                <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/50">
                  <User className="h-3 w-3 mr-1" />
                  Manual Review
                </Badge>
              )}
            </div>

            {/* Flags */}
            {moderation.flags && moderation.flags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {moderation.flags.map((flag, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-red-500/10 text-red-300 border-red-500/30 text-xs"
                  >
                    {flag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Review Notes */}
            {moderation.review_notes && (
              <p className="text-sm text-gray-300 italic">
                Review notes: {moderation.review_notes}
              </p>
            )}
          </div>

          {/* Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectCampaign(campaign)}
            className="bg-white/10 border-white/20 hover:bg-white/20 ml-4"
          >
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search campaigns or creators..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10 bg-black/20 border-white/20 text-white"
            />
          </div>
          <Select
            value={filters.decision}
            onValueChange={(value) => setFilters({ ...filters, decision: value })}
          >
            <SelectTrigger className="w-48 bg-black/20 border-white/20 text-white">
              <SelectValue placeholder="Filter by decision" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-white/20">
              <SelectItem value="all">All Decisions</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="review">Under Review</SelectItem>
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
              <SelectItem value="moderated_at">Date Moderated</SelectItem>
              <SelectItem value="moderation_score">Score</SelectItem>
              <SelectItem value="processing_time">Processing Time</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchModerations()}
            className="bg-black/20 border-white/20 hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* History List */}
      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-white">Loading moderation history...</p>
        </div>
      ) : moderations.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-white text-lg">No moderation history</p>
            <p className="text-gray-400 mt-2">No campaigns have been moderated yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-0">
            {moderations.map((moderation) => (
              <ModerationRow key={moderation.id} moderation={moderation} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ModerationHistory;