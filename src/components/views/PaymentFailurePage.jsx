import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { XCircle, AlertTriangle, RefreshCw, ArrowLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PaymentFailurePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const campaignId = searchParams.get('campaign_id');
  const errorMessage = searchParams.get('error') || 'Your payment could not be processed';
  const errorCode = searchParams.get('code');

  const getErrorAdvice = (code) => {
    const errorAdviceMap = {
      'card_declined': {
        title: 'Card Declined',
        advice: 'Please check with your bank or try a different payment method.',
        icon: AlertTriangle,
      },
      'insufficient_funds': {
        title: 'Insufficient Funds',
        advice: 'Please ensure you have sufficient funds and try again.',
        icon: AlertTriangle,
      },
      'expired_card': {
        title: 'Card Expired',
        advice: 'Your card has expired. Please use a different card.',
        icon: AlertTriangle,
      },
      'incorrect_cvc': {
        title: 'Incorrect Security Code',
        advice: 'Please check your card\'s security code (CVC) and try again.',
        icon: AlertTriangle,
      },
      'processing_error': {
        title: 'Processing Error',
        advice: 'A temporary error occurred. Please try again in a few moments.',
        icon: RefreshCw,
      },
      default: {
        title: 'Payment Failed',
        advice: 'We couldn\'t process your payment. Please try again or use a different payment method.',
        icon: XCircle,
      },
    };

    return errorAdviceMap[code] || errorAdviceMap.default;
  };

  const errorInfo = getErrorAdvice(errorCode);
  const ErrorIcon = errorInfo.icon;

  const handleRetry = () => {
    if (campaignId) {
      // Go back to the campaign page to retry
      navigate(`/campaigns/${campaignId}`);
    } else {
      navigate('/campaigns');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex items-center justify-center px-4 py-8"
    >
      <Helmet>
        <title>Payment Failed - Blessed Horizon</title>
        <meta name="description" content="Your payment could not be processed. Please try again." />
      </Helmet>

      <Card className="max-w-lg w-full bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="text-center pb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto mb-4"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
              <ErrorIcon className="w-16 h-16 text-white" />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <CardTitle className="text-2xl font-bold text-white mb-2">
              {errorInfo.title}
            </CardTitle>
            <p className="text-gray-300">
              {errorMessage}
            </p>
          </motion.div>
        </CardHeader>

        <CardContent className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Alert className="bg-red-500/10 border-red-500/20">
              <HelpCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-gray-300">
                {errorInfo.advice}
              </AlertDescription>
            </Alert>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-3"
          >
            <Button
              onClick={handleRetry}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              size="lg"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Try Again
            </Button>

            <Button
              onClick={() => navigate('/campaigns')}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
              size="lg"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Browse Campaigns
            </Button>
          </motion.div>

          {/* Common Issues */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="pt-6 border-t border-white/10"
          >
            <h3 className="text-sm font-semibold text-white mb-3">Common Issues:</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>Ensure your card details are entered correctly</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>Check that your card hasn't expired</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>Verify you have sufficient funds available</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>Try disabling any browser extensions that might interfere</span>
              </li>
            </ul>
          </motion.div>

          {/* Support Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-center"
          >
            <p className="text-sm text-gray-400">
              Still having issues?{' '}
              <button
                onClick={() => navigate('/support')}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Contact Support
              </button>
            </p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PaymentFailurePage;
