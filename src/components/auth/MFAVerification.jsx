import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/EnhancedAuthContext';

/**
 * MFAVerification Component
 * Shown during login when user has MFA enabled
 */
const MFAVerification = ({ 
  isOpen, 
  onOpenChange, 
  onSuccess,
  factorId 
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const { verifyMFACode } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setVerificationCode('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (verificationCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter a 6-digit code from your authenticator app.",
      });
      return;
    }

    setIsVerifying(true);
    
    try {
      const result = await verifyMFACode(verificationCode, factorId);
      
      if (!result.error) {
        toast({
          title: "Verification Successful",
          description: "You have been logged in securely.",
        });
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('MFA verification error:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Enter the 6-digit code from your authenticator app to continue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="mfa-code" className="text-sm font-medium">
              Verification Code
            </label>
            <Input
              id="mfa-code"
              type="text"
              placeholder="000000"
              value={verificationCode}
              onChange={handleCodeChange}
              className="text-center text-2xl tracking-widest font-mono"
              autoComplete="one-time-code"
              autoFocus
              disabled={isVerifying}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isVerifying}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={verificationCode.length !== 6 || isVerifying}
              className="flex-1"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </Button>
          </div>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              className="text-sm text-muted-foreground"
              onClick={() => {
                toast({
                  title: "Lost Access?",
                  description: "Please contact support to regain access to your account.",
                });
              }}
            >
              Lost access to your authenticator?
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MFAVerification;