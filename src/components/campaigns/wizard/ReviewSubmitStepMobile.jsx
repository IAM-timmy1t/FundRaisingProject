import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircleIcon, AlertTriangleIcon, InfoIcon, ImageIcon, VideoIcon, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { motion } from 'framer-motion';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const ReviewSubmitStepMobile = ({ 
  data, 
  onUpdate, 
  onBack, 
  onSubmit, 
  isSubmitting = false,
  categories = [] 
}) => {
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const isMobile = useMediaQuery('(max-width: 768px)');

  const category = categories.find(c => c.id === data.category_id);
  
  const totalBudget = data.budget_breakdown?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const totalBeneficiaryPercentage = data.beneficiaries?.reduce((sum, b) => sum + b.percentage, 0) || 0;
  const progress = data.goal_amount > 0 ? (totalBudget / data.goal_amount) * 100 : 0;

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
      value: data.story ? `${data.story.trim().length} chars` : 'Not written'
    },
    {
      label: 'Media',
      passed: data.media && data.media.length > 0,
      value: data.media ? `${data.media.length} file(s)` : 'No media'
    },
    {
      label: 'Budget',
      passed: Math.abs(totalBudget - data.goal_amount) < 0.01,
      value: `$${totalBudget.toLocaleString()}`
    },
    {
      label: 'Beneficiaries',
      passed: Math.abs(totalBeneficiaryPercentage - 100) < 0.01,
      value: `${totalBeneficiaryPercentage}%`
    }
  ];

  const allChecksPassed = validationChecks.every(check => check.passed);

  const handleSubmit = () => {
    if (!agreedToTerms) {
      setErrors({ terms: 'You must agree to the terms' });
      return;
    }
    
    if (!allChecksPassed) {
      setErrors({ validation: 'Please complete all required fields' });
      return;
    }
    
    onSubmit();
  };

  const inputAnimation = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  };

  return (
    <div className="space-y-6">
      <Card className={cn(
        "shadow-lg border-0",
        isMobile && "rounded-none"
      )}>
        <CardHeader className={cn(
          "bg-gradient-to-r from-primary/10 to-primary/5",
          isMobile ? "p-4" : "p-6"
        )}>
          <CardTitle className={cn(
            "flex items-center gap-2",
            isMobile ? "text-lg" : "text-2xl"
          )}>
            Review Your Campaign
          </CardTitle>
          {!isMobile && (
            <CardDescription>
              Please review all the information before submitting
            </CardDescription>
          )}
        </CardHeader>
        
        <CardContent className={cn(
          "space-y-6",
          isMobile ? "p-4" : "p-6"
        )}>
          {/* Validation Checklist */}
          <motion.div {...inputAnimation} className="space-y-3">
            <h3 className="font-medium text-sm">Campaign Checklist</h3>
            <div className="space-y-2">
              {validationChecks.map((check, index) => (
                <div 
                  key={index} 
                  className={cn(
                    "flex items-center justify-between",
                    isMobile ? "py-3 border-b last:border-0" : "py-2"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {check.passed ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    )}
                    <span className={cn(
                      "font-medium",
                      isMobile ? "text-base" : "text-sm"
                    )}>
                      {check.label}
                    </span>
                  </div>
                  <span className={cn(
                    "text-muted-foreground",
                    isMobile ? "text-sm" : "text-sm"
                  )}>
                    {check.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          <Separator />

          {/* Campaign Summary - Mobile Optimized with Accordion */}
          {isMobile ? (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="basic">
                <AccordionTrigger className="text-base font-semibold">
                  Basic Information
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <div>
                      <p className="font-medium text-base">{data.title || 'Untitled'}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">{category?.name || 'None'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Ends {data.deadline ? format(new Date(data.deadline), 'PP') : 'No deadline'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Goal</span>
                      <span className="font-semibold text-lg">
                        ${(data.goal_amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="story">
                <AccordionTrigger className="text-base font-semibold">
                  Story & Media
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <p className="text-sm line-clamp-3">
                      {data.story || 'No story provided'}
                    </p>
                    {data.scripture_reference && (
                      <div className="pt-3 border-t">
                        <p className="text-sm italic">
                          "{data.scripture_text}" - {data.scripture_reference}
                        </p>
                      </div>
                    )}
                    {data.media && data.media.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium mb-2">
                          {data.media.length} media file{data.media.length !== 1 ? 's' : ''}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {data.media.slice(0, 6).map((media, index) => (
                            <div
                              key={index}
                              className="aspect-square rounded-lg overflow-hidden bg-muted"
                            >
                              {media.type === 'image' ? (
                                <img
                                  src={media.url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <VideoIcon className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="budget">
                <AccordionTrigger className="text-base font-semibold">
                  Budget Breakdown
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {data.budget_breakdown?.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm py-1">
                        <span className="text-muted-foreground">
                          {item.category}
                        </span>
                        <span className="font-medium">
                          ${item.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t flex justify-between font-medium">
                      <span>Total</span>
                      <span>${totalBudget.toLocaleString()}</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="beneficiaries">
                <AccordionTrigger className="text-base font-semibold">
                  Beneficiaries
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {data.beneficiaries?.map((beneficiary, index) => (
                      <div key={index} className="flex justify-between text-sm py-1">
                        <span className="text-muted-foreground">
                          {beneficiary.name}
                        </span>
                        <span className="font-medium">{beneficiary.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : (
            // Desktop view - keep existing layout
            <div className="space-y-4">
              {/* ... existing desktop layout ... */}
            </div>
          )}

          <Separator />

          {/* Terms and Conditions */}
          <motion.div {...inputAnimation} className="space-y-4">
            <div className={cn(
              "rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800",
              isMobile ? "p-3" : "p-4"
            )}>
              <div className="flex gap-2">
                <InfoCircledIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className={cn(
                  "text-blue-900 dark:text-blue-100 space-y-2",
                  isMobile ? "text-sm" : "text-sm"
                )}>
                  <p className="font-medium">Before you submit:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                    <li>24-48 hour review period</li>
                    <li>Email notification when approved</li>
                    <li>Funds held in escrow</li>
                    <li>Updates allowed after approval</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={setAgreedToTerms}
                  className={cn(
                    "mt-1",
                    isMobile && "h-5 w-5"
                  )}
                />
                <label 
                  htmlFor="terms" 
                  className={cn(
                    "cursor-pointer",
                    isMobile ? "text-sm" : "text-sm"
                  )}
                >
                  I agree to the{' '}
                  <a href="/terms" className="text-primary underline" target="_blank">
                    Terms of Service
                  </a>
                  {' '}and{' '}
                  <a href="/privacy" className="text-primary underline" target="_blank">
                    Privacy Policy
                  </a>
                  . I confirm all information is accurate.
                </label>
              </div>
              {errors.terms && (
                <p className="text-sm text-destructive pl-8">{errors.terms}</p>
              )}
            </div>
          </motion.div>

          {errors.validation && (
            <motion.div 
              {...inputAnimation}
              className="rounded-lg bg-destructive/10 p-4 border border-destructive/20"
            >
              <p className="text-sm text-destructive">{errors.validation}</p>
            </motion.div>
          )}

          {/* Mobile Submit Section */}
          {isMobile && (
            <div className="space-y-4 pt-4">
              <Button 
                onClick={handleSubmit} 
                disabled={!allChecksPassed || !agreedToTerms || isSubmitting}
                className="w-full h-12 text-base"
                size="lg"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Campaign'}
              </Button>
              <Button 
                variant="outline" 
                onClick={onBack} 
                disabled={isSubmitting}
                className="w-full h-12 text-base"
                size="lg"
              >
                Previous Step
              </Button>
            </div>
          )}
        </CardContent>
        
        {!isMobile && (
          <CardFooter className="flex justify-between bg-muted/50 p-6">
            <Button variant="outline" onClick={onBack} disabled={isSubmitting} size="lg">
              Previous
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!allChecksPassed || !agreedToTerms || isSubmitting}
              size="lg"
              className="min-w-[140px]"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Campaign'}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default ReviewSubmitStepMobile;