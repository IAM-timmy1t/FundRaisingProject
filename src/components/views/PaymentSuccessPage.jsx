import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import confetti from 'canvas-confetti';
import { CheckCircle, Heart, Share2, ArrowRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from 'sonner';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [donation, setDonation] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const donationId = searchParams.get('donation_id');
  const amount = searchParams.get('amount');

  useEffect(() => {
    // Trigger confetti animation
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      colors: ['#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#6366f1'],
    };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });

    // Fetch donation details
    if (donationId) {
      fetchDonationDetails();
    } else {
      setLoading(false);
    }
  }, [donationId]);

  const fetchDonationDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          campaign:campaigns(
            id,
            title,
            slug,
            recipient_id,
            raised_amount,
            goal_amount
          )
        `)
        .eq('id', donationId)
        .single();

      if (error) throw error;

      setDonation(data);
      setCampaign(data.campaign);
    } catch (err) {
      console.error('Error fetching donation details:', err);
      toast.error('Failed to load donation details');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: campaign ? `Support ${campaign.title}` : 'Blessed Horizon Donation',
      text: `I just donated to a meaningful cause on Blessed Horizon. Join me in making a difference!`,
      url: campaign ? `${window.location.origin}/campaigns/${campaign.slug}` : window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to copying link
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Campaign link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex items-center justify-center px-4 py-8"
    >
      <Helmet>
        <title>Thank You for Your Donation - Blessed Horizon</title>
        <meta name="description" content="Your donation has been successfully processed. Thank you for your generosity!" />
      </Helmet>

      <Card className="max-w-2xl w-full bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="text-center pb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto mb-4"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-16 h-16 text-white" />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <CardTitle className="text-3xl font-bold text-white mb-2">
              Thank You for Your Generosity!
            </CardTitle>
            <p className="text-xl text-blue-200">
              Your donation of{' '}
              <span className="font-bold text-white">
                {formatCurrency(donation?.amount || amount || 0, donation?.currency)}
              </span>
              {' '}has been successfully processed
            </p>
          </motion.div>
        </CardHeader>

        <CardContent className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/5 rounded-lg p-6 space-y-4"
          >
            <div className="flex items-start space-x-3">
              <Heart className="w-6 h-6 text-red-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-white mb-1">Your Impact</h3>
                <p className="text-gray-300">
                  {campaign ? (
                    <>
                      You've helped "{campaign.title}" reach{' '}
                      <span className="font-semibold text-white">
                        {Math.round((campaign.raised_amount / campaign.goal_amount) * 100)}%
                      </span>{' '}
                      of its goal. Every contribution counts!
                    </>
                  ) : (
                    'Your contribution is making a real difference in someone\'s life. Thank you for being part of this journey!'
                  )}
                </p>
              </div>
            </div>

            {donation && !donation.is_anonymous && user && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-gray-300">
                  A receipt has been sent to{' '}
                  <span className="text-white font-medium">{donation.donor_email || user.email}</span>
                </p>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-3"
          >
            {campaign && (
              <Button
                onClick={() => navigate(`/campaigns/${campaign.slug}`)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                size="lg"
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                View Campaign Updates
              </Button>
            )}

            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
              size="lg"
            >
              <Share2 className="w-5 h-5 mr-2" />
              Share This Campaign
            </Button>

            <Button
              onClick={() => navigate('/campaigns')}
              variant="ghost"
              className="w-full text-white hover:bg-white/10"
              size="lg"
            >
              <Home className="w-5 h-5 mr-2" />
              Browse More Campaigns
            </Button>
          </motion.div>

          {/* Motivational Quote */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center pt-6 border-t border-white/10"
          >
            <p className="text-sm text-gray-400 italic">
              "No one has ever become poor by giving."
            </p>
            <p className="text-xs text-gray-500 mt-1">- Anne Frank</p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PaymentSuccessPage;
