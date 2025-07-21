import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  Heart,
  CreditCard,
  Shield,
  ChevronRight,
  ChevronLeft,
  Info,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';

/**
 * Mobile-optimized donation flow with improved UX
 * Features:
 * - Touch-friendly inputs and buttons
 * - Step-by-step process
 * - Quick amount selection
 * - Smooth animations
 * - Input validation with haptic feedback
 */
const MobileDonationFlow = ({
  campaign,
  onComplete,
  onCancel,
  initialAmount = null
}) => {
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    amount: initialAmount || '',
    customAmount: '',
    donorName: '',
    email: '',
    message: '',
    isAnonymous: false,
    coverFees: true
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Quick amount options
  const quickAmounts = [10, 25, 50, 100, 250, 500];
  
  // Fee calculation (2.9% + $0.30)
  const calculateFees = (amount) => {
    const baseAmount = parseFloat(amount) || 0;
    return baseAmount > 0 ? (baseAmount * 0.029 + 0.30).toFixed(2) : '0.00';
  };
  
  const totalAmount = () => {
    const base = parseFloat(formData.amount || formData.customAmount) || 0;
    const fees = formData.coverFees ? parseFloat(calculateFees(base)) : 0;
    return (base + fees).toFixed(2);
  };

  // Steps configuration
  const steps = [
    { id: 0, title: 'Amount', icon: Heart },
    { id: 1, title: 'Details', icon: Info },
    { id: 2, title: 'Payment', icon: CreditCard },
    { id: 3, title: 'Review', icon: Shield }
  ];

  // Validation
  const validateStep = (stepId) => {
    const newErrors = {};
    
    switch (stepId) {
      case 0:
        const amount = parseFloat(formData.amount || formData.customAmount);
        if (!amount || amount < 1) {
          newErrors.amount = 'Please enter an amount of at least $1';
        }
        if (amount > 10000) {
          newErrors.amount = 'Maximum donation amount is $10,000';
        }
        break;
      
      case 1:
        if (!formData.isAnonymous) {
          if (!formData.donorName?.trim()) {
            newErrors.donorName = 'Name is required';
          }
          if (!formData.email?.trim()) {
            newErrors.email = 'Email is required';
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
          }
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === steps.length - 1) {
        handleSubmit();
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      onCancel();
    }
  };

  // Submit donation
  const handleSubmit = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const donationData = {
        campaignId: campaign.id,
        amount: parseFloat(formData.amount || formData.customAmount),
        totalAmount: parseFloat(totalAmount()),
        coversFees: formData.coverFees,
        donorName: formData.isAnonymous ? 'Anonymous' : formData.donorName,
        email: formData.email,
        message: formData.message,
        isAnonymous: formData.isAnonymous
      };
      
      await onComplete(donationData);
      
      toast({
        title: "Thank you for your donation!",
        description: `Your donation of $${totalAmount()} has been processed successfully.`,
        duration: 5000
      });
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Donation failed",
        description: error.message || "Please try again later"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Field update handler
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    // Clear amount errors when switching between quick and custom
    if (field === 'amount' || field === 'customAmount') {
      setErrors(prev => ({ ...prev, amount: '' }));
    }
  };

  // Step content renderers
  const renderAmountStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Amount</h3>
        <p className="text-sm text-muted-foreground">
          Choose a preset amount or enter your own
        </p>
      </div>
      
      {/* Quick amount buttons */}
      <div className="grid grid-cols-3 gap-3">
        {quickAmounts.map(amount => (
          <Button
            key={amount}
            variant={formData.amount === amount ? "default" : "outline"}
            className={cn(
              "h-16 text-lg font-semibold transition-all",
              formData.amount === amount && "ring-2 ring-primary ring-offset-2"
            )}
            onClick={() => {
              updateField('amount', amount);
              updateField('customAmount', '');
            }}
          >
            ${amount}
          </Button>
        ))}
      </div>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>
      
      {/* Custom amount input */}
      <div className="space-y-2">
        <Label htmlFor="customAmount">Custom Amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">
            $
          </span>
          <Input
            id="customAmount"
            type="number"
            inputMode="decimal"
            pattern="[0-9]*"
            placeholder="0.00"
            value={formData.customAmount}
            onChange={(e) => {
              updateField('customAmount', e.target.value);
              updateField('amount', '');
            }}
            className={cn(
              "pl-8 text-lg py-6",
              errors.amount && touched.customAmount && "border-destructive"
            )}
          />
        </div>
        {errors.amount && (touched.amount || touched.customAmount) && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.amount}
          </p>
        )}
      </div>
      
      {/* Fee coverage option */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="coverFees"
              checked={formData.coverFees}
              onChange={(e) => updateField('coverFees', e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="coverFees" className="font-medium cursor-pointer">
                Cover processing fees
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Add ${calculateFees(formData.amount || formData.customAmount)} to help cover payment processing fees
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Total display */}
      {(formData.amount || formData.customAmount) && parseFloat(formData.amount || formData.customAmount) > 0 && (
        <div className="rounded-lg bg-primary/10 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Donation amount:</span>
            <span>${(parseFloat(formData.amount || formData.customAmount) || 0).toFixed(2)}</span>
          </div>
          {formData.coverFees && (
            <div className="flex justify-between text-sm">
              <span>Processing fee:</span>
              <span>+${calculateFees(formData.amount || formData.customAmount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total:</span>
            <span className="text-lg">${totalAmount()}</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Donor Information</h3>
        <p className="text-sm text-muted-foreground">
          Tell us about yourself (or donate anonymously)
        </p>
      </div>
      
      {/* Anonymous donation option */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="isAnonymous"
              checked={formData.isAnonymous}
              onChange={(e) => updateField('isAnonymous', e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="isAnonymous" className="font-medium cursor-pointer">
                Make this donation anonymous
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Your name won't be displayed publicly
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {!formData.isAnonymous && (
        <>
          <div className="space-y-2">
            <Label htmlFor="donorName">Your Name*</Label>
            <Input
              id="donorName"
              type="text"
              placeholder="John Doe"
              value={formData.donorName}
              onChange={(e) => updateField('donorName', e.target.value)}
              className={cn(
                "py-6 text-base",
                errors.donorName && touched.donorName && "border-destructive"
              )}
            />
            {errors.donorName && touched.donorName && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.donorName}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address*</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={cn(
                "py-6 text-base",
                errors.email && touched.email && "border-destructive"
              )}
            />
            {errors.email && touched.email && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.email}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              We'll send your receipt to this email
            </p>
          </div>
        </>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="message">Message to Recipient (Optional)</Label>
        <textarea
          id="message"
          placeholder="Words of encouragement..."
          value={formData.message}
          onChange={(e) => updateField('message', e.target.value)}
          className={cn(
            "w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2",
            "text-base placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          maxLength={500}
        />
        <p className="text-sm text-muted-foreground">
          {formData.message.length}/500 characters
        </p>
      </div>
    </div>
  );

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Payment Method</h3>
        <p className="text-sm text-muted-foreground">
          Choose how you'd like to donate
        </p>
      </div>
      
      <RadioGroup defaultValue="card" className="space-y-3">
        <Card className="border-2 transition-all hover:border-primary">
          <CardContent className="p-4">
            <label htmlFor="card" className="flex items-center gap-3 cursor-pointer">
              <RadioGroupItem value="card" id="card" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  <span className="font-medium">Credit/Debit Card</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Visa, Mastercard, American Express
                </p>
              </div>
            </label>
          </CardContent>
        </Card>
        
        <Card className="border-2 transition-all hover:border-primary opacity-50">
          <CardContent className="p-4">
            <label htmlFor="paypal" className="flex items-center gap-3 cursor-not-allowed">
              <RadioGroupItem value="paypal" id="paypal" disabled />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">PayPal</span>
                  <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Pay with your PayPal account
                </p>
              </div>
            </label>
          </CardContent>
        </Card>
      </RadioGroup>
      
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">
                Secure Payment Processing
              </p>
              <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                Your payment information is encrypted and processed securely through Stripe. 
                We never store your card details.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review Your Donation</h3>
        <p className="text-sm text-muted-foreground">
          Please review your donation details
        </p>
      </div>
      
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Campaign</p>
            <p className="font-medium">{campaign.title}</p>
          </div>
          
          <Separator />
          
          <div>
            <p className="text-sm text-muted-foreground">Donation Amount</p>
            <p className="text-2xl font-bold text-primary">${totalAmount()}</p>
            {formData.coverFees && (
              <p className="text-sm text-muted-foreground mt-1">
                Includes ${calculateFees(formData.amount || formData.customAmount)} to cover fees
              </p>
            )}
          </div>
          
          <Separator />
          
          <div>
            <p className="text-sm text-muted-foreground">Donor</p>
            <p className="font-medium">
              {formData.isAnonymous ? 'Anonymous' : formData.donorName}
            </p>
            {!formData.isAnonymous && (
              <p className="text-sm text-muted-foreground">{formData.email}</p>
            )}
          </div>
          
          {formData.message && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Message</p>
                <p className="text-sm mt-1">{formData.message}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            By completing this donation, you agree to our terms of service and 
            acknowledge that donations are generally non-refundable.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderAmountStep();
      case 1: return renderDetailsStep();
      case 2: return renderPaymentStep();
      case 3: return renderReviewStep();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Make a Donation</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    currentStep >= index
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {currentStep > index ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {!isMobile && (
                    <span className={cn(
                      "text-sm",
                      currentStep >= index ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.title}
                    </span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 transition-all",
                    currentStep > index ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Footer navigation */}
      <div className="sticky bottom-0 bg-background border-t px-4 py-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={handleBack}
            disabled={isProcessing}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </Button>
          
          <Button
            size="lg"
            onClick={handleNext}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : currentStep === steps.length - 1 ? (
              <>
                Complete
                <Check className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileDonationFlow;