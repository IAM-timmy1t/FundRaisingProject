import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircleIcon, AlertTriangleIcon, InfoIcon, ImageIcon, VideoIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const ReviewSubmitStep = ({ 
  data, 
  onUpdate, 
  onBack, 
  onSubmit, 
  isSubmitting = false,
  categories = [] 
}) => {
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);
  const [errors, setErrors] = React.useState({});

  // Find category name
  const category = categories.find(c => c.id === data.category_id);
  
  // Calculate totals
  const totalBudget = data.budget_breakdown?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const totalBeneficiaryPercentage = data.beneficiaries?.reduce((sum, b) => sum + b.percentage, 0) || 0;
  const progress = data.goal_amount > 0 ? (totalBudget / data.goal_amount) * 100 : 0;

  // Validation checks
  const validationChecks = [
    {
      label: 'Campaign Title',
      passed: data.title && data.title.length >= 5,
      value: data.title || 'Not set'
    },
    {
      label: 'Goal Amount',
      passed: data.goal_amount >= 100 && data.goal_amount <= 1000000,
      value: `$${(data.goal_amount || 0).toLocaleString()}`
    },
    {
      label: 'Category',
      passed: !!data.category_id,
      value: category?.name || 'Not selected'
    },
    {
      label: 'Deadline',
      passed: !!data.deadline,
      value: data.deadline ? format(new Date(data.deadline), 'PPP') : 'Not set'
    },
    {
      label: 'Story',
      passed: data.story && data.story.trim().length >= 200,
      value: data.story ? `${data.story.trim().length} characters` : 'Not written'
    },
    {
      label: 'Media',
      passed: data.media && data.media.length > 0,
      value: data.media ? `${data.media.length} file(s)` : 'No media uploaded'
    },
    {
      label: 'Budget Breakdown',
      passed: Math.abs(totalBudget - data.goal_amount) < 0.01,
      value: `$${totalBudget.toLocaleString()} (${data.budget_breakdown?.length || 0} items)`
    },
    {
      label: 'Beneficiaries',
      passed: Math.abs(totalBeneficiaryPercentage - 100) < 0.01,
      value: `${totalBeneficiaryPercentage}% allocated to ${data.beneficiaries?.length || 0} beneficiaries`
    }
  ];

  const allChecksPassed = validationChecks.every(check => check.passed);

  const handleSubmit = () => {
    if (!agreedToTerms) {
      setErrors({ terms: 'You must agree to the terms and conditions' });
      return;
    }
    
    if (!allChecksPassed) {
      setErrors({ validation: 'Please complete all required fields before submitting' });
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Your Campaign</CardTitle>
          <CardDescription>
            Please review all the information before submitting your campaign for approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Validation Checklist */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Campaign Checklist</h3>
            {validationChecks.map((check, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  {check.passed ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangleIcon className="h-5 w-5 text-amber-600" />
                  )}
                  <span className="text-sm font-medium">{check.label}</span>
                </div>
                <span className="text-sm text-muted-foreground">{check.value}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Campaign Summary */}
          <div className="space-y-4">
            <h3 className="font-semibold">Campaign Summary</h3>
            
            {/* Basic Info */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Basic Information</h4>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div>
                  <p className="font-medium">{data.title || 'Untitled Campaign'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{category?.name || 'Uncategorized'}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Ends {data.deadline ? format(new Date(data.deadline), 'PP') : 'No deadline'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-muted-foreground">Goal Amount</span>
                  <span className="font-semibold text-lg">${(data.goal_amount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Story Preview */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Story Preview</h4>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm line-clamp-3">
                  {data.story || 'No story provided'}
                </p>
                {data.scripture_reference && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm italic">
                      "{data.scripture_text}" - {data.scripture_reference}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Media Summary */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Media Files</h4>
              <div className="bg-muted/50 rounded-lg p-4">
                {data.media && data.media.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                      {data.media.slice(0, 3).map((media, index) => (
                        <div
                          key={index}
                          className="w-12 h-12 rounded-lg overflow-hidden border-2 border-background"
                        >
                          {media.type === 'image' ? (
                            <img
                              src={media.url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <VideoIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                      {data.media.length > 3 && (
                        <div className="w-12 h-12 rounded-lg bg-muted border-2 border-background flex items-center justify-center">
                          <span className="text-sm font-medium">+{data.media.length - 3}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm">
                      <p>{data.media.length} file{data.media.length !== 1 ? 's' : ''} uploaded</p>
                      <p className="text-muted-foreground">
                        {data.media.filter(m => m.type === 'image').length} images,{' '}
                        {data.media.filter(m => m.type === 'video').length} videos
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No media uploaded</p>
                )}
              </div>
            </div>

            {/* Budget Summary */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Budget Breakdown</h4>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                {data.budget_breakdown?.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {item.category}: {item.description.substring(0, 50)}
                      {item.description.length > 50 ? '...' : ''}
                    </span>
                    <span className="font-medium">${item.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="pt-2 border-t flex justify-between font-medium">
                  <span>Total</span>
                  <span>${totalBudget.toLocaleString()}</span>
                </div>
                <Progress 
                  value={progress} 
                  className={cn(
                    "h-2",
                    progress > 100 && "[&>div]:bg-amber-500"
                  )} 
                />
              </div>
            </div>

            {/* Beneficiaries */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Beneficiaries</h4>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                {data.beneficiaries?.map((beneficiary, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {beneficiary.name} ({beneficiary.relationship})
                    </span>
                    <span className="font-medium">{beneficiary.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Terms and Conditions */}
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
              <div className="flex gap-2">
                <InfoIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 space-y-2">
                  <p className="font-medium">Before you submit:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>Your campaign will be reviewed by our moderation team</li>
                    <li>Review typically takes 24-48 hours</li>
                    <li>You'll receive an email when your campaign is approved</li>
                    <li>Funds will be held in escrow until milestones are met</li>
                    <li>You can update your campaign after approval</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm">
                  I agree to the{' '}
                  <a href="/terms" className="text-primary underline" target="_blank">
                    Terms of Service
                  </a>
                  {' '}and{' '}
                  <a href="/privacy" className="text-primary underline" target="_blank">
                    Privacy Policy
                  </a>
                  . I confirm that all information provided is accurate and that I have the right to
                  raise funds for this cause.
                </span>
              </label>
              {errors.terms && (
                <p className="text-sm text-destructive">{errors.terms}</p>
              )}
            </div>
          </div>

          {errors.validation && (
            <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
              <p className="text-sm text-destructive">{errors.validation}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
            Previous
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!allChecksPassed || !agreedToTerms || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Campaign'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ReviewSubmitStep;