import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import userProfileService from '@/lib/userProfileService';

// Profile Components
import UserProfileCard from '@/components/profile/UserProfileCard';
import ProfileCompletionBar from '@/components/profile/ProfileCompletionBar';
import CrowdfundingStats from '@/components/profile/CrowdfundingStats';
import TrustScoreHistory from '@/components/profile/TrustScoreHistory';
import VerificationFlow from '@/components/profile/VerificationFlow';
import ProfileEditModal from '@/components/profile/ProfileEditModal';

// Icons
import {
  User,
  Activity,
  Shield,
  BarChart3,
  Settings,
  Heart,
  Loader2,
} from 'lucide-react';

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userProfile: authProfile, fetchUserProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Check if viewing own profile
  const isOwnProfile = !userId || userId === user?.id;
  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (targetUserId) {
      fetchProfile();
    }
  }, [targetUserId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await userProfileService.getEnhancedProfile(targetUserId);
      
      if (error) throw error;
      
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load profile. Please try again.",
      });
      
      // Redirect to home if profile not found
      if (error.code === 'PGRST116') {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updatedProfile) => {
    setProfile(updatedProfile);
    
    // If updating own profile, refresh auth context
    if (isOwnProfile) {
      await fetchUserProfile(user.id);
    }
  };

  const handleVerificationComplete = async (newStatus) => {
    // Refresh profile to get updated verification status
    await fetchProfile();
    
    toast({
      title: "Verification Complete",
      description: "Your verification status has been updated.",
    });
  };

  const handleEditSettings = () => {
    navigate('/settings');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground mb-4">The profile you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>
          {profile.display_name || 'User'} - Blessed-Horizon
        </title>
        <meta 
          name="description" 
          content={`View ${profile.display_name}'s profile on Blessed-Horizon - Faith-based transparent crowdfunding platform.`} 
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Profile Header */}
        <div className="mb-8">
          <UserProfileCard
            profile={profile}
            isOwnProfile={isOwnProfile}
            onEditProfile={() => setShowEditModal(true)}
            onEditSettings={handleEditSettings}
          />
        </div>

        {/* Profile Completion (Own Profile Only) */}
        {isOwnProfile && profile.profileCompletion < 100 && (
          <div className="mb-8">
            <ProfileCompletionBar
              profile={profile}
              onCompleteProfile={() => setShowEditModal(true)}
            />
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="trust" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Trust Score</span>
            </TabsTrigger>
            {isOwnProfile && (
              <TabsTrigger value="verification" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Verification</span>
              </TabsTrigger>
            )}
          </TabsList>

          <div className="mt-6">
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <CrowdfundingStats profile={profile} detailed={true} />
              
              {/* Recent Campaigns */}
              {profile.role === 'recipient' && profile.campaigns_created > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Recent Campaigns</h3>
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    Campaign list coming soon...
                  </div>
                </div>
              )}
              
              {/* Recent Donations */}
              {profile.role === 'donor' && profile.campaigns_supported > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Recent Donations</h3>
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    Donation history coming soon...
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              <div className="text-center py-12 text-muted-foreground border rounded-lg">
                <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Activity Feed</h3>
                <p>Recent activities will appear here once campaigns are launched.</p>
              </div>
            </TabsContent>

            {/* Trust Score Tab */}
            <TabsContent value="trust" className="space-y-6">
              <TrustScoreHistory 
                userId={profile.id}
                currentScore={profile.trust_score}
                currentTier={profile.trust_tier}
              />
            </TabsContent>

            {/* Verification Tab (Own Profile Only) */}
            {isOwnProfile && (
              <TabsContent value="verification" className="space-y-6">
                <VerificationFlow
                  userId={profile.id}
                  currentStatus={profile.verification_status}
                  onComplete={handleVerificationComplete}
                />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <ProfileEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          profile={profile}
          onUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
};

export default ProfilePage;