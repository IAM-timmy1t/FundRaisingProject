import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '@/components/ui/container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import UpdateCreator from '@/components/campaigns/UpdateCreator';
import CampaignUpdates from '@/components/campaigns/CampaignUpdates';
import { campaignService } from '@/lib/campaignService';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { toast } from 'sonner';
import { 
  Plus, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Eye,
  Calendar,
  TrendingUp,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { format, formatDistanceToNow, addDays } from 'date-fns';

const CampaignUpdateManager = () => {
  const { id: campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [campaign, setCampaign] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('updates');
  const [showCreator, setShowCreator] = useState(false);

  useEffect(() => {
    if (campaignId) {
      loadCampaignData();
    }
  }, [campaignId]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      
      // Load campaign details
      const campaignData = await campaignService.getCampaign({ id: campaignId });
      setCampaign(campaignData);

      // Check if user is the campaign owner
      if (user?.id !== campaignData.recipient_id) {
        toast.error('You are not authorized to manage this campaign');
        navigate(`/campaigns/${campaignId}`);
        return;
      }

      // Load updates
      const updatesData = await campaignService.getCampaignUpdates(campaignId);
      setUpdates(updatesData.updates || []);
    } catch (error) {
      console.error('Error loading campaign data:', error);
      toast.error('Failed to load campaign data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCreated = (newUpdate) => {
    setUpdates([newUpdate, ...updates]);
    setShowCreator(false);
    toast.success('Update posted successfully!');
    
    // Reload to get fresh data
    loadCampaignData();
  };

  const getUpdateStatus = () => {
    if (!campaign) return null;

    const daysSinceLastUpdate = campaign.next_update_due
      ? Math.floor((new Date(campaign.next_update_due) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    if (campaign.overdue_updates_count > 0) {
      return {
        type: 'overdue',
        message: `${campaign.overdue_updates_count} update(s) overdue`,
        variant: 'destructive',
        icon: AlertTriangle
      };
    }

    if (daysSinceLastUpdate !== null && daysSinceLastUpdate <= 3) {
      return {
        type: 'due_soon',
        message: `Update due in ${daysSinceLastUpdate} days`,
        variant: 'warning',
        icon: Clock
      };
    }

    return {
      type: 'on_track',
      message: 'Updates on track',
      variant: 'success',
      icon: CheckCircle
    };
  };

  const updateStatus = getUpdateStatus();

  if (loading) {
    return (
      <Container className="py-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Container>
    );
  }

  if (!campaign) {
    return (
      <Container className="py-8">
        <Alert>
          <AlertDescription>Campaign not found</AlertDescription>
        </Alert>
      </Container>
    );
  }

  const stats = {
    totalUpdates: updates.length,
    milestonesReached: updates.filter(u => u.is_milestone).length,
    lastUpdateDays: updates.length > 0 
      ? Math.floor((new Date() - new Date(updates[0].created_at)) / (1000 * 60 * 60 * 24))
      : null,
    avgUpdateFrequency: campaign.created_at
      ? Math.floor((new Date() - new Date(campaign.created_at)) / (1000 * 60 * 60 * 24) / Math.max(1, updates.length))
      : null
  };

  return (
    <Container className="py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/campaigns/${campaignId}`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaign
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{campaign.title}</h1>
            <p className="text-muted-foreground mt-1">Manage your campaign updates</p>
          </div>
          
          {updateStatus && (
            <Badge 
              variant={updateStatus.variant}
              className="flex items-center gap-2"
            >
              <updateStatus.icon className="w-4 h-4" />
              {updateStatus.message}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Updates</p>
                <p className="text-2xl font-bold">{stats.totalUpdates}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Milestones</p>
                <p className="text-2xl font-bold">{stats.milestonesReached}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Update</p>
                <p className="text-2xl font-bold">
                  {stats.lastUpdateDays !== null ? `${stats.lastUpdateDays}d ago` : 'None'}
                </p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Frequency</p>
                <p className="text-2xl font-bold">
                  {stats.avgUpdateFrequency !== null ? `${stats.avgUpdateFrequency}d` : 'N/A'}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Update Reminder Alert */}
      {updateStatus?.type === 'overdue' && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Action Required:</strong> Your campaign has {campaign.overdue_updates_count} overdue update(s). 
            Post an update soon to maintain donor trust and improve your trust score.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="updates">Posted Updates</TabsTrigger>
          <TabsTrigger value="create">Create Update</TabsTrigger>
          <TabsTrigger value="schedule">Update Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="updates" className="mt-6">
          {updates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No updates yet</h3>
                <p className="text-muted-foreground mb-4">
                  Keep your donors informed by posting regular updates
                </p>
                <Button onClick={() => setActiveTab('create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Update
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">All Updates ({updates.length})</h3>
                <Button onClick={() => setActiveTab('create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Update
                </Button>
              </div>
              <CampaignUpdates updates={updates} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="mt-6">
          <UpdateCreator
            campaign={campaign}
            onSuccess={handleUpdateCreated}
            onCancel={() => setActiveTab('updates')}
          />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Update Schedule</CardTitle>
              <CardDescription>
                Regular updates build trust and keep donors engaged
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Next Update Due</p>
                    <p className="text-sm text-muted-foreground">
                      {campaign.next_update_due
                        ? format(new Date(campaign.next_update_due), 'PPP')
                        : 'Not scheduled'}
                    </p>
                  </div>
                  <Badge variant={updateStatus?.variant || 'secondary'}>
                    {updateStatus?.message || 'On track'}
                  </Badge>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Recommended Update Frequency</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• <strong>Emergency Needs:</strong> Every 7 days</li>
                    <li>• <strong>Medical/Health:</strong> Every 10 days</li>
                    <li>• <strong>Education:</strong> Every 14 days</li>
                    <li>• <strong>Other Needs:</strong> Every 14 days</li>
                  </ul>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Trust Score Tip:</strong> Posting updates on or before the due date 
                    significantly improves your trust score and donor confidence.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Container>
  );
};

export default CampaignUpdateManager;
