import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  CreditCard, Wallet, Lock, ChevronRight, Info, 
  Shield, CheckCircle2, AlertCircle, Loader2,
  Apple, Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { donationService } from '@/services/donationService';
import { format } from 'date-fns';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Mobile-optimized Card Element options
const CARD_ELEMENT_OPTIONS_MOBILE = {
  style: {
    base: {
      fontSize: '16px', // Prevent zoom on iOS
      color: '#424770',
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      '::placeholder': {
        color: '#aab7c4',
      },
      padding: '12px',
    },
    invalid: {
      color: '#9e2146',
      iconColor: '#9e2146',
    },
  },
  hidePostalCode: false, // Show postal code for better conversion
};

// Quick amount selector component
const QuickAmountSelector = ({ selectedAmount, onSelect, customAmount, onCustomAmountChange }) => {
  const quickAmounts = [10, 25, 50, 100, 250, 500];
  
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Select Amount</Label>
      <div className="grid grid-cols-3 gap-2">
        {quickAmounts.map((amount) => (
          <Button
            key={amount}
            variant={selectedAmount === amount ? 'default' : 'outline'}
            className="touch-manipulation h-12 text-base"
            onClick={() => onSelect(amount)}
          >
            ${amount}
          </Button>
        ))}
      </div>
      <div className="relative">
        <Input
          type="number"
          placeholder="Enter custom amount"
          value={customAmount}
          onChange={(e) => onCustomAmountChange(e.target.value)}
          onFocus={() => onSelect(null)}
          className="pl-8 h-12 text-base touch-manipulation"
          min="1"
          step="1"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          $
        </span>
      </div>
    </div>
  );
};

// Mobile Payment Method Selector
const MobilePaymentMethodSelector = ({ method, onMethodChange }) => {
  const paymentMethods = [
    { id: 'card', label: 'Card', icon: CreditCard, description: 'Credit or Debit Card' },
    { id: 'apple-pay', label: 'Apple Pay', icon: Apple, description: 'Quick and secure', disabled: !window.ApplePaySession },
    { id: 'google-pay', label: 'Google Pay', icon: Wallet, description: 'Use saved cards', disabled: !window.PaymentRequest },
  ];

  return (
    <RadioGroup value={method} onValueChange={onMethodChange} className="space-y-2">
      {paymentMethods.map((pm) => (
        <label
          key={pm.id}
          className={cn(
            "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer touch-manipulation transition-colors",
            method === pm.id ? "border-primary bg-primary/5" : "border-input",
            pm.disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <RadioGroupItem value={pm.id} disabled={pm.disabled} className="mt-1" />
          <pm.icon className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">{pm.label}</p>
            <p className="text-xs text-muted-foreground">{pm.description}</p>
          </div>
        </label>
      ))}
    </RadioGroup>
  );
};

// Mobile Checkout Form Component
const MobileCheckoutForm = ({ campaign, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [donationType, setDonationType] = useState('one-time');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [coverFees, setCoverFees] = useState(true);
  
  const donationAmount = customAmount || selectedAmount;
  const processingFee = donationAmount * 0.029 + 0.30; // Stripe fee
  const totalAmount = coverFees ? donationAmount + processingFee : donationAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create payment intent
      const { clientSecret } = await donationService.createPaymentIntent({
        campaignId: campaign.id,
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: 'usd',
        donationType,
        coverFees,
        anonymous,
        donorEmail: email,
        donorName: anonymous ? null : name,
      });

      // Confirm payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: name || 'Anonymous',
            email,
          },
        },
      });

      if (result.error) {
        setError(result.error.message);
      } else {
        toast({
          title: "Thank you for your donation!",
          description: `Your donation of $${totalAmount.toFixed(2)} has been processed successfully.`,
        });
        onSuccess(result.paymentIntent);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'An error occurred during payment');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-safe">
      {/* Campaign Info */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h3 className="font-semibold text-base">{campaign.title}</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Goal: ${campaign.goal_amount.toLocaleString()}</span>
          <span className="font-medium text-primary">
            {Math.round((campaign.raised_amount / campaign.goal_amount) * 100)}% funded
          </span>
        </div>
      </div>

      {/* Donation Type */}
      <Tabs value={donationType} onValueChange={setDonationType}>
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="one-time" className="text-sm">One-time</TabsTrigger>
          <TabsTrigger value="monthly" className="text-sm">Monthly</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Amount Selection */}
      <QuickAmountSelector
        selectedAmount={selectedAmount}
        onSelect={setSelectedAmount}
        customAmount={customAmount}
        onCustomAmountChange={setCustomAmount}
      />

      {/* Donor Information */}
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 text-base touch-manipulation"
          />
        </div>
        
        {!anonymous && (
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 text-base touch-manipulation"
            />
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox
            id="anonymous"
            checked={anonymous}
            onCheckedChange={setAnonymous}
            className="touch-manipulation"
          />
          <label
            htmlFor="anonymous"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Make donation anonymous
          </label>
        </div>
      </div>

      {/* Payment Method */}
      <div className="space-y-3">
        <Label>Payment Method</Label>
        <MobilePaymentMethodSelector
          method={paymentMethod}
          onMethodChange={setPaymentMethod}
        />
      </div>

      {/* Card Input */}
      {paymentMethod === 'card' && (
        <div className="space-y-2">
          <Label>Card Details</Label>
          <div className="border rounded-lg p-4 bg-background">
            <CardElement options={CARD_ELEMENT_OPTIONS_MOBILE} />
          </div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Your payment information is encrypted and secure</span>
          </div>
        </div>
      )}

      {/* Fee Coverage */}
      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="coverFees"
            checked={coverFees}
            onCheckedChange={setCoverFees}
            className="mt-0.5 touch-manipulation"
          />
          <div className="flex-1">
            <label
              htmlFor="coverFees"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Cover processing fees
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              Add ${processingFee.toFixed(2)} to help cover payment processing costs
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Donation amount</span>
          <span>${donationAmount.toFixed(2)}</span>
        </div>
        {coverFees && (
          <div className="flex justify-between text-sm">
            <span>Processing fee</span>
            <span>${processingFee.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span className="text-primary">${totalAmount.toFixed(2)}</span>
        </div>
        {donationType === 'monthly' && (
          <p className="text-xs text-muted-foreground">
            You'll be charged ${totalAmount.toFixed(2)} monthly starting today
          </p>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submit Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 h-12 touch-manipulation"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || processing || !donationAmount}
          className="flex-1 h-12 touch-manipulation"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Donate ${totalAmount.toFixed(2)}
            </>
          )}
        </Button>
      </div>

      {/* Security Badge */}
      <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>Secured by Stripe</span>
      </div>
    </form>
  );
};

// Mobile Payment Flow Container
export const MobilePaymentFlow = ({ campaign, open, onClose, onSuccess }) => {
  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b">
          <DrawerTitle>Complete Your Donation</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 py-4">
          <Elements stripe={stripePromise}>
            <MobileCheckoutForm
              campaign={campaign}
              onSuccess={onSuccess}
              onCancel={onClose}
            />
          </Elements>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

// Success Screen Component
export const MobilePaymentSuccess = ({ donation, campaign, onClose }) => {
  const { toast } = useToast();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: campaign.title,
          text: `I just donated to ${campaign.title}! Join me in supporting this cause.`,
          url: `${window.location.origin}/campaigns/${campaign.slug}`,
        });
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback: copy link
      navigator.clipboard.writeText(`${window.location.origin}/campaigns/${campaign.slug}`);
      toast({
        title: "Link copied!",
        description: "Campaign link copied to clipboard",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Thank You!</h1>
            <p className="text-muted-foreground">
              Your donation of ${donation.amount.toFixed(2)} has been processed successfully.
            </p>
          </div>

          <Card className="text-left">
            <CardContent className="pt-6 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Donation ID</p>
                <p className="font-mono text-sm">{donation.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Campaign</p>
                <p className="font-medium">{campaign.title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="text-sm">{format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
              </div>
              {donation.receipt_url && (
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full touch-manipulation"
                    onClick={() => window.open(donation.receipt_url, '_blank')}
                  >
                    Download Receipt
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button
              className="w-full touch-manipulation"
              onClick={handleShare}
            >
              Share This Campaign
            </Button>
            <Button
              variant="outline"
              className="w-full touch-manipulation"
              onClick={onClose}
            >
              Back to Campaign
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobilePaymentFlow;