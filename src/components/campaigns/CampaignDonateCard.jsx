import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, Gift, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { toast } from 'sonner';

const CampaignDonateCard = ({ campaign, onDonate }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(null);

  const { currency = 'USD', status, raised_amount, goal_amount } = campaign;
  const remainingAmount = Math.max(0, goal_amount - raised_amount);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const suggestedAmounts = [25, 50, 100, 250];
  const isActive = status === 'FUNDING';

  const handleAmountSelect = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      setCustomAmount(value);
      setSelectedAmount(null);
    }
  };

  const handleDonate = () => {
    const amount = selectedAmount || parseFloat(customAmount);
    
    if (!amount || amount <= 0) {
      toast.error('Please select or enter a donation amount');
      return;
    }

    if (amount > remainingAmount) {
      toast.error(`Amount exceeds campaign goal. Maximum: ${formatCurrency(remainingAmount)}`);
      return;
    }

    // Navigate to payment page or call onDonate callback
    if (onDonate) {
      onDonate(amount);
    } else {
      navigate(`/payment/${campaign.id}?amount=${amount}`);
    }
  };

  if (!isActive) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-muted-foreground">
            <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Campaign {status.toLowerCase()}</p>
            <p className="text-sm mt-1">Donations are no longer being accepted</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          Make a Donation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Amount Selection */}
        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">
            Select an amount
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {suggestedAmounts.map((amount) => (
              <Button
                key={amount}
                variant={selectedAmount === amount ? 'default' : 'outline'}
                onClick={() => handleAmountSelect(amount)}
                className="w-full"
              >
                {formatCurrency(amount)}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div>
          <Label htmlFor="custom-amount" className="text-sm text-muted-foreground">
            Or enter a custom amount
          </Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {currency === 'USD' ? '$' : currency}
            </span>
            <Input
              id="custom-amount"
              type="text"
              placeholder="0.00"
              value={customAmount}
              onChange={handleCustomAmountChange}
              className="pl-8"
            />
          </div>
        </div>

        {/* Remaining Amount Info */}
        {remainingAmount < goal_amount * 0.2 && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-sm text-orange-600 dark:text-orange-400">
              <Zap className="inline w-4 h-4 mr-1" />
              Only {formatCurrency(remainingAmount)} left to reach the goal!
            </p>
          </div>
        )}

        {/* Donate Button */}
        <Button
          onClick={handleDonate}
          className="w-full"
          size="lg"
          disabled={!selectedAmount && !customAmount}
        >
          <Heart className="w-4 h-4 mr-2" />
          Donate {selectedAmount || customAmount ? formatCurrency(selectedAmount || parseFloat(customAmount) || 0) : 'Now'}
        </Button>

        {/* Guest Donation Note */}
        {!user && (
          <p className="text-xs text-center text-muted-foreground">
            You can donate as a guest or{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-primary hover:underline"
            >
              sign in
            </button>
            {' '}to track your donations
          </p>
        )}

        {/* Security Note */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground text-center">
            🔒 Secure payment powered by Stripe
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CampaignDonateCard;