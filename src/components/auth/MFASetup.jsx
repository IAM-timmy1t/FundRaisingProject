import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Shield, Copy, Check } from 'lucide-react';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import QRCode from 'qrcode';

const MFASetup = ({ isOpen, onOpenChange }) => {
  const [step, setStep] = useState('setup'); // setup, verify, complete
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { enrollInMFA, verifyMFACode } = useAuth();

  const handleSetupMFA = async () => {
    const result = await enrollInMFA();
    
    if (result.data) {
      setFactorId(result.data.id);
      setSecret(result.data.secret);
      
      // Generate QR code
      try {
        const otpUrl = result.data.totp.uri;
        const qrDataUrl = await QRCode.toDataURL(otpUrl);
        setQrCodeUrl(qrDataUrl);
        setStep('verify');
      } catch (error) {
        console.error('QR code generation error:', error);
      }
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter a 6-digit code from your authenticator app.",
      });
      return;
    }

    const result = await verifyMFACode(verificationCode, factorId);
    
    if (!result.error) {
      setStep('complete');
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Copied!",
      description: "Secret key copied to clipboard.",
    });
  };

  const handleClose = () => {
    setStep('setup');
    setVerificationCode('');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            {step === 'setup' && "Enhance your account security with two-factor authentication."}
            {step === 'verify' && "Scan the QR code with your authenticator app and enter the code."}
            {step === 'complete' && "Two-factor authentication has been successfully enabled!"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'setup' && (
            <>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Two-factor authentication adds an extra layer of security to your account.</p>
                <p>You'll need an authenticator app like:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Google Authenticator</li>
                  <li>Microsoft Authenticator</li>
                  <li>Authy</li>
                  <li>1Password</li>
                </ul>
              </div>
              <Button onClick={handleSetupMFA} className="w-full">
                Set Up Two-Factor Authentication
              </Button>
            </>
          )}

          {step === 'verify' && (
            <>
              {qrCodeUrl && (
                <div className="flex flex-col items-center space-y-4">
                  <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
                  
                  <div className="w-full space-y-2">
                    <p className="text-sm text-muted-foreground text-center">
                      Can't scan? Enter this secret manually:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                        {secret}
                      </code>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={handleCopySecret}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Verification Code</label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-lg tracking-wider"
                />
              </div>
              
              <Button onClick={handleVerifyCode} className="w-full">
                Verify and Enable
              </Button>
            </>
          )}

          {step === 'complete' && (
            <>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Two-factor authentication is now active!</p>
                  <p className="text-sm text-muted-foreground">
                    You'll need to enter a code from your authenticator app when you sign in.
                  </p>
                </div>
              </div>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MFASetup;