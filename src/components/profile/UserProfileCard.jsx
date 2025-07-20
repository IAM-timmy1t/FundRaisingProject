import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  CheckCircle,
  Settings,
  Edit
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import TrustScoreBadge from './TrustScoreBadge';

const UserProfileCard = ({ 
  profile, 
  isOwnProfile = false,
  onEditProfile = null,
  campaigns = [],
  donations = [] 
}) => {
  const getVerificationBadge = () => {
    const verificationLevels = {
      'unverified': { label: 'Unverified', color: 'bg-gray-500' },
      'email_verified': { label: 'Email Verified', color: 'bg-blue-500' },
      'phone_verified': { label: 'Phone Verified', color: 'bg-green-500' },
      'id_verified': { label: 'ID Verified', color: 'bg-purple-500' },
      'kyc_full': { label: 'Fully Verified', color: 'bg-green-600' }
    };

    const level = verificationLevels[profile.verification_status] || verificationLevels.unverified;
    return (
      <Badge className={`${level.color} text-white`}>
        <CheckCircle className="w-3 h-3 mr-1" />
        {level.label}
      </Badge>
    );
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate trust score metrics for the badge
  const trustMetrics = {
    updateTimeliness: profile.trust_score_details?.updateTimeliness || 50,
    spendProofAccuracy: profile.trust_score_details?.spendProofAccuracy || 50,
    donorSentiment: profile.trust_score_details?.donorSentiment || 50,
    kycDepth: profile.trust_score_details?.kycDepth || 50,
    anomalyScore: profile.trust_score_details?.anomalyScore || 50,
    confidence: profile.trust_score_details?.confidence || 50
  };

  return (
    <Card className="w-full">
      <CardHeader className="relative">
        {isOwnProfile && (
          <div className="absolute top-4 right-4 space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEditProfile}
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit Profile
            </Button>
            <Button
              variant="ghost"
              size="sm"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        <div className="flex items-start space-x-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
            <AvatarFallback className="text-lg">
              {getInitials(profile.full_name || 'Anonymous')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-2xl">{profile.full_name || 'Anonymous User'}</CardTitle>
              <TrustScoreBadge 
                score={profile.trust_score || 50}
                tier={profile.trust_tier || 'NEW'}
                size="default"
                showTrend={true}
                previousScore={profile.previous_trust_score}
                metrics={trustMetrics}
                userId={profile.id}
                showDetails={true}
              />
            </div>
            
            {profile.bio && (
              <p className="text-muted-foreground mb-3">{profile.bio}</p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {profile.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  <span>{profile.email}</span>
                </div>
              )}
              
              {profile.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  <span>{profile.phone}</span>
                </div>
              )}
              
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{profile.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-4">
            {getVerificationBadge()}
            
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Joined {formatDistanceToNow(new Date(profile.created_at))} ago</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold">{campaigns.length}</div>
              <div className="text-muted-foreground">Campaigns</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">{donations.length}</div>
              <div className="text-muted-foreground">Donations</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">
                ${profile.total_raised || 0}
              </div>
              <div className="text-muted-foreground">Raised</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfileCard;