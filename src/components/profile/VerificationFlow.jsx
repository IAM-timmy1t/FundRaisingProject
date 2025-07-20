import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Check,
  CheckCircle2,
  ShieldCheck,
  Upload,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Camera,
  Loader2,
  AlertCircle,
  ChevronRight,
  Lock,
} from 'lucide-react';
import userProfileService from '@/lib/userProfileService';
import { cn } from '@/lib/utils';

const VerificationFlow = ({ 
  userId, 
  currentStatus = 'unverified',
  onComplete 
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [verificationData, setVerificationData] = useState({
    email_verified: false,
    phone_verified: false,
    identity_document: null,
    address_proof: null,
    selfie: null,
    consent: false
  });

  const verificationLevels = [
    {
      key: 'email_verified',
      title: 'Email Verification',
      description: 'Verify your email address',
      icon: Mail,
      status: currentStatus !== 'unverified' ? 'completed' : 'pending',
      required: true
    },
    {
      key: 'kyc_basic',
      title: 'Basic KYC',
      description: 'Verify your identity with government ID',
      icon: User,
      status: ['kyc_basic', 'kyc_advanced', 'kyc_full'].includes(currentStatus) ? 'completed' : 'pending',
      required: true,
      documents: ['identity_document']
    },
    {
      key: 'kyc_advanced',
      title: 'Advanced KYC',
      description: 'Add address verification',
      icon: MapPin,
      status: ['kyc_advanced', 'kyc_full'].includes(currentStatus) ? 'completed' : 'pending',
      required: false,
      documents: ['address_proof']
    },
    {
      key: 'kyc_full',
      title: 'Full Verification',
      description: 'Complete verification with selfie',
      icon: Camera,
      status: currentStatus === 'kyc_full' ? 'completed' : 'pending',
      required: false,
      documents: ['selfie']
    }
  ];

  const handleFileUpload = (documentType, file) => {
    // In a real app, you'd upload to Supabase Storage
    setVerificationData(prev => ({
      ...prev,
      [documentType]: file
    }));
  };

  const handleStartVerification = () => {
    const nextPendingStep = verificationLevels.findIndex(level => level.status === 'pending');
    if (nextPendingStep !== -1) {
      setCurrentStep(nextPendingStep);
      setShowDialog(true);
    }
  };

  const handleSubmitVerification = async () => {
    setLoading(true);
    const level = verificationLevels[currentStep];

    try {
      // Simulate verification process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update verification status
      const { error } = await userProfileService.updateVerificationStatus(
        userId,
        level.key,
        {
          verified_at: new Date().toISOString(),
          documents: level.documents,
          method: level.key === 'email_verified' ? 'email' : 'document'
        }
      );

      if (error) throw error;

      toast({
        title: "Verification Successful",
        description: `${level.title} completed successfully!`,
      });

      // Move to next step or close
      const nextPendingStep = verificationLevels.findIndex(
        (l, index) => index > currentStep && l.status === 'pending'
      );
      
      if (nextPendingStep !== -1) {
        setCurrentStep(nextPendingStep);
        setVerificationData({
          email_verified: false,
          phone_verified: false,
          identity_document: null,
          address_proof: null,
          selfie: null,
          consent: false
        });
      } else {
        setShowDialog(false);
        if (onComplete) {
          onComplete(level.key);
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderVerificationStep = () => {
    const level = verificationLevels[currentStep];
    
    switch (level.key) {
      case 'email_verified':
        return (
          <div className="space-y-4">
            <div className="text-center py-4">
              <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                We'll send a verification code to your registered email address.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input 
                type="email" 
                value="user@example.com" 
                disabled 
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <Input 
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
            </div>
          </div>
        );

      case 'kyc_basic':
        return (
          <div className="space-y-4">
            <div className="text-center py-4">
              <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Upload a clear photo of your government-issued ID.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Identity Document</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  id="identity-upload"
                  onChange={(e) => handleFileUpload('identity_document', e.target.files[0])}
                />
                <label htmlFor="identity-upload" className="cursor-pointer">
                  {verificationData.identity_document ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm">{verificationData.identity_document.name}</span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Passport, Driver's License, or National ID
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>
        );

      case 'kyc_advanced':
        return (
          <div className="space-y-4">
            <div className="text-center py-4">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Upload a document showing your current address.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Address Proof</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  id="address-upload"
                  onChange={(e) => handleFileUpload('address_proof', e.target.files[0])}
                />
                <label htmlFor="address-upload" className="cursor-pointer">
                  {verificationData.address_proof ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm">{verificationData.address_proof.name}</span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Utility bill, Bank statement, or Rental agreement
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>
        );

      case 'kyc_full':
        return (
          <div className="space-y-4">
            <div className="text-center py-4">
              <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Take a selfie holding your ID document.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Selfie with ID</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  id="selfie-upload"
                  onChange={(e) => handleFileUpload('selfie', e.target.files[0])}
                />
                <label htmlFor="selfie-upload" className="cursor-pointer">
                  {verificationData.selfie ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm">{verificationData.selfie.name}</span>
                    </div>
                  ) : (
                    <div>
                      <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to take photo or upload
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ensure your face and ID are clearly visible
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canSubmit = () => {
    const level = verificationLevels[currentStep];
    
    if (level.key === 'email_verified') {
      return true; // Would check for code in real app
    }
    
    if (level.documents) {
      return level.documents.every(doc => verificationData[doc] !== null);
    }
    
    return false;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Account Verification</CardTitle>
          <CardDescription>
            Complete verification steps to unlock all features and build trust with the community.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium">Current Status</p>
              <p className="text-xs text-muted-foreground">
                {currentStatus === 'unverified' 
                  ? 'Not verified' 
                  : verificationLevels.find(l => l.key === currentStatus)?.title || 'Unknown'
                }
              </p>
            </div>
            <Badge 
              variant={currentStatus === 'unverified' ? 'secondary' : 'default'}
              className={cn(
                currentStatus === 'kyc_full' && 'bg-gold-500',
                currentStatus === 'kyc_advanced' && 'bg-purple-500',
                currentStatus === 'kyc_basic' && 'bg-green-500',
                currentStatus === 'email_verified' && 'bg-blue-500'
              )}
            >
              {currentStatus.replace(/_/g, ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Verification Levels */}
          <div className="space-y-3">
            {verificationLevels.map((level, index) => {
              const Icon = level.icon;
              const isCompleted = level.status === 'completed';
              const isLocked = index > 0 && verificationLevels[index - 1].status !== 'completed';
              
              return (
                <div
                  key={level.key}
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    isCompleted && "bg-primary/10 border-primary",
                    !isCompleted && !isLocked && "hover:bg-muted/50 cursor-pointer",
                    isLocked && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => !isCompleted && !isLocked && handleStartVerification()}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        isCompleted ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : isLocked ? (
                          <Lock className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{level.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {level.description}
                        </p>
                      </div>
                    </div>
                    {!isCompleted && !isLocked && (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  {level.required && !isCompleted && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Required for campaigns
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Benefits */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Verification Benefits
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3" />
                Higher trust score and visibility
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3" />
                Ability to create and manage campaigns
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3" />
                Access to advanced features
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3" />
                Priority support
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Verification Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{verificationLevels[currentStep]?.title}</DialogTitle>
            <DialogDescription>
              {verificationLevels[currentStep]?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {renderVerificationStep()}
            
            {/* Consent Checkbox */}
            <div className="flex items-start gap-2 mt-4">
              <Checkbox
                id="consent"
                checked={verificationData.consent}
                onCheckedChange={(checked) => 
                  setVerificationData(prev => ({ ...prev, consent: checked }))
                }
              />
              <label
                htmlFor="consent"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                I consent to the verification of my information and understand that
                false information may result in account suspension.
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitVerification}
              disabled={!canSubmit() || !verificationData.consent || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Verifying...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VerificationFlow;