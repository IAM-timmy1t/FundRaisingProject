import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { ArrowLeft, CreditCard, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { campaignService } from '@/lib/campaignService';
import { supabase } from '@/lib/customSupabaseClient';
import { getStripe, stripeConfig, formatAmountForStripe, validateDonationAmount } from '@/lib/stripe';

// Stripe Elements wrapper component
const StripePaymentForm = ({ campaign, amount, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [donorInfo, setDonorInfo] = useState({
    name: user?.user_metadata?.display_name || '',
    email: user?.email || '',
    message: '',
    isAnonymous: false,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDonorInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    // Validate donor info for guest donations
    if (!user && (!donorInfo.email || !donorInfo.name)) {
      setError('Please provide your name and email');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create payment intent
      const { data: paymentData, error: intentError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: formatAmountForStripe(amount, campaign.currency),
          currency: campaign.currency || 'usd',
          campaign_id: campaign.id,
          campaign_title: campaign.title,
          donor_name: donorInfo.isAnonymous ? null : donorInfo.name,
          donor_email: donorInfo.email,
          message: donorInfo.message,
          is_anonymous: donorInfo.isAnonymous,
        }
      });

      if (intentError || !paymentData.success) {
        throw new Error(paymentData?.error || 'Failed to create payment intent');
      }

      const { clientSecret, donationId } = paymentData.data;

      // Confirm the payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: donorInfo.name,
            email: donorInfo.email,
          },
        },
      });

      if (stripeError) {
        throw stripeError;
      }

      if (paymentIntent.status === 'succeeded') {
        // Payment successful
        toast({
          title: "Payment Successful!",
          description: "Thank you for your generous donation.",
        });

        // Navigate to success page
        navigate(`/payment/success?donation_id=${donationId}&amount=${amount}`);
        
        if (onSuccess) {
          onSuccess(paymentIntent);
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'An error occurred during payment');
      toast({
        title: "Payment Failed",
        description: err.message || "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1e293b',
        '::placeholder': {
          color: '#94a3b8',
        },
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Donor Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Donor Information</h3>
        
        {!user && (
          <>
            <div>
              <Label htmlFor="name" className="text-white">Your Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={donorInfo.name}
                onChange={handleInputChange}
                required={!user}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-white">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={donorInfo.email}
                onChange={handleInputChange}
                required={!user}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="john@example.com"
              />
            </div>
          </>
        )}

        <div>
          <Label htmlFor="message" className="text-white">Message (Optional)</Label>
          <Input
            id="message"
            name="message"
            type="text"
            value={donorInfo.message}
            onChange={handleInputChange}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            placeholder="Words of encouragement..."
            maxLength={200}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="anonymous"
            checked={donorInfo.isAnonymous}
            onCheckedChange={(checked) => 
              setDonorInfo(prev => ({ ...prev, isAnonymous: checked }))
            }
            className="border-white/20"
          />
          <Label htmlFor="anonymous" className="text-white cursor-pointer">
            Make this donation anonymous
          </Label>
        </div>
      </div>

      {/* Card Element */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Payment Details</h3>
        
        <div className="p-4 bg-white rounded-lg">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white text-lg py-6"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Donate ${amount}
          </>
        )}
      </Button>

      {/* Security Note */}
      <div className="flex items-center justify-center text-sm text-gray-400">
        <Lock className="w-4 h-4 mr-2" />
        Secure payment powered by Stripe
      </div>
    </form>
  );
};

// Main PaymentPage component
const PaymentPage = () => {
  const { id: campaignId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const amount = parseFloat(searchParams.get('amount') || '0');

  useEffect(() => {
    fetchCampaign();
  }, [campaignId]);

  const fetchCampaign = async () => {
    try {
      const data = await campaignService.getCampaign({ id: campaignId });
      setCampaign(data);
      
      // Validate amount
      const validation = validateDonationAmount(amount, data.currency);
      if (!validation.valid) {
        setError(validation.error);
      }
    } catch (err) {
      console.error('Error fetching campaign:', err);
      setError('Campaign not found');
      toast({
        title: "Error",
        description: "Failed to load campaign details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
            <p className="text-gray-300">{error || 'Campaign not found'}</p>
            <Button 
              onClick={() => navigate(-1)} 
              className="mt-4"
              variant="outline"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stripePromise = getStripe();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="container mx-auto px-4 py-8"
    >
      <Helmet>
        <title>Donate to {campaign.title} - Blessed Horizon</title>
        <meta name="description" content={`Make a secure donation to support ${campaign.title}`} />
      </Helmet>
      
      <Button 
        variant="ghost" 
        onClick={() => navigate(`/campaigns/${campaignId}`)} 
        className="mb-8 text-white hover:bg-white/10"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Campaign
      </Button>

      <div className="max-w-2xl mx-auto">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-3xl">Complete Your Donation</CardTitle>
            <p className="text-blue-200 mt-2">
              You're donating <span className="font-bold text-2xl">${amount}</span> to
            </p>
            <p className="text-xl text-white font-semibold mt-1">{campaign.title}</p>
          </CardHeader>
          
          <CardContent>
            <Elements stripe={stripePromise} options={stripeConfig.elementsOptions}>
              <StripePaymentForm 
                campaign={campaign} 
                amount={amount}
                onSuccess={() => {
                  // Optional: Add any additional success handling
                }}
              />
            </Elements>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default PaymentPage;
