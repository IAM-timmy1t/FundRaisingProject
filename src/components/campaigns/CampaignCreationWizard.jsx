import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { campaignService } from '@/lib/campaignService';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { CheckCircleIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Import wizard steps
import BasicInfoStep from './wizard/BasicInfoStep';
import StoryScriptureStep from './wizard/StoryScriptureStep';
import BudgetBreakdownStep from './wizard/BudgetBreakdownStep';
import ReviewSubmitStep from './wizard/ReviewSubmitStep';

const CampaignCreationWizard = () => {
  const navigate = useNavigate();
  const { user, userProfile, checkPermission } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [campaignData, setCampaignData] = useState({
    title: '',
    goal_amount: 0,
    category_id: '',
    deadline: null,
    tags: [],
    story: '',
    scripture_reference: '',
    scripture_text: '',
    media: [],
    budget_breakdown: [],
    beneficiaries: []
  });

  const steps = [
    { id: 0, title: 'Basic Info', shortTitle: 'Basics', description: 'Campaign details' },
    { id: 1, title: 'Story & Media', shortTitle: 'Story', description: 'Tell your story' },
    { id: 2, title: 'Budget', shortTitle: 'Budget', description: 'Financial breakdown' },
    { id: 3, title: 'Review', shortTitle: 'Review', description: 'Submit for approval' }
  ];

  // Load categories on mount
  useEffect(() => {
    loadCategories();
    checkUserEligibility();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await campaignService.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast({
        variant: "destructive",
        title: "Failed to load categories",
        description: "Please refresh the page to try again"
      });
    }
  };

  const checkUserEligibility = async () => {
    // Check if user is verified
    if (!userProfile?.verification_status || userProfile.verification_status === 'unverified') {
      toast({
        variant: "destructive",
        title: "Verification Required",
        description: "You must complete identity verification before creating a campaign"
      });
      navigate('/profile?tab=verification');
      return;
    }

    // Check if user has reached campaign limit
    try {
      const userCampaigns = await campaignService.getUserCampaigns(user.id, 'active');
      if (userCampaigns.length >= 3) {
        toast({
          variant: "destructive",
          title: "Campaign Limit Reached",
          description: "You can only have 3 active campaigns at a time"
        });
        navigate('/dashboard/campaigns');
        return;
      }
    } catch (error) {
      console.error('Failed to check campaign limit:', error);
    }
  };

  const updateCampaignData = (data) => {
    setCampaignData(data);
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Upload media files first
      const uploadedMedia = [];
      
      for (const media of campaignData.media) {
        if (media.file) {
          try {
            const uploaded = await campaignService.uploadMedia(
              'temp', // Temporary ID, will be updated after campaign creation
              media.file,
              {
                media_type: media.type,
                caption: media.caption,
                is_primary: media.is_primary
              }
            );
            uploadedMedia.push(uploaded);
          } catch (error) {
            console.error('Failed to upload media:', error);
          }
        }
      }

      // Prepare campaign data for submission
      const submitData = {
        title: campaignData.title,
        slug: campaignData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        story: campaignData.story,
        goal_amount: campaignData.goal_amount,
        category_id: campaignData.category_id,
        deadline: campaignData.deadline,
        scripture_reference: campaignData.scripture_reference,
        scripture_text: campaignData.scripture_text,
        tags: campaignData.tags,
        budget_breakdown: campaignData.budget_breakdown,
        beneficiaries: campaignData.beneficiaries,
        media_ids: uploadedMedia.map(m => m.id)
      };

      // Create the campaign
      const campaign = await campaignService.createCampaign(submitData);

      // Submit for review
      await campaignService.submitForReview(campaign.id);

      toast({
        title: "Campaign Created!",
        description: "Your campaign has been submitted for review. You'll be notified once it's approved.",
      });

      // Redirect to campaign page or dashboard
      navigate(`/campaigns/${campaign.slug}`);
      
    } catch (error) {
      console.error('Failed to create campaign:', error);
      toast({
        variant: "destructive",
        title: "Failed to create campaign",
        description: error.message || "Please try again later"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepProgress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Create Your Campaign</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Share your story and start raising funds for your cause
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-4">
        <Progress value={stepProgress} className="h-2" />
        
        {/* Mobile Step Indicators */}
        <div className="flex sm:hidden items-center justify-between">
          <div className="text-sm font-medium">
            Step {currentStep + 1} of {steps.length}
          </div>
          <div className="text-sm text-muted-foreground">
            {steps[currentStep].shortTitle}
          </div>
        </div>
        
        {/* Desktop Step Indicators */}
        <div className="hidden sm:flex justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex flex-col items-center space-y-2",
                index <= currentStep ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                  index < currentStep
                    ? "bg-primary border-primary text-primary-foreground"
                    : index === currentStep
                    ? "border-primary"
                    : "border-muted-foreground/30"
                )}
              >
                {index < currentStep ? (
                  <CheckCircleIcon className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground hidden lg:block">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[300px] sm:min-h-[400px]">
        {currentStep === 0 && (
          <BasicInfoStep
            data={campaignData}
            onUpdate={updateCampaignData}
            onNext={handleNext}
            categories={categories}
          />
        )}
        
        {currentStep === 1 && (
          <StoryScriptureStep
            data={campaignData}
            onUpdate={updateCampaignData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        
        {currentStep === 2 && (
          <BudgetBreakdownStep
            data={campaignData}
            onUpdate={updateCampaignData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        
        {currentStep === 3 && (
          <ReviewSubmitStep
            data={campaignData}
            onUpdate={updateCampaignData}
            onBack={handleBack}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            categories={categories}
          />
        )}
      </div>

      {/* Mobile Navigation Buttons (fixed at bottom on mobile) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        
        {currentStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            className="flex items-center"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default CampaignCreationWizard;