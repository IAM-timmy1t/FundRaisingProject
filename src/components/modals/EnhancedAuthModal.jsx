import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/components/ui/use-toast';
import { X, Eye, EyeOff, Mail } from 'lucide-react';
import PasswordStrengthMeter from '@/components/shared/PasswordStrengthMeter';
import HumanCaptcha from '@/components/shared/HumanCaptcha';
import { CountrySelector } from '@/components/shared/CountrySelector';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';

const EnhancedAuthModal = ({ 
  isOpen, 
  onOpenChange, 
  onForgotPasswordClick, 
  initialTab = 'login',
  defaultRole = 'donor' 
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isHuman, setIsHuman] = useState(false);
  const [country, setCountry] = useState('');
  const [selectedRole, setSelectedRole] = useState(defaultRole);
  const { toast } = useToast();
  const { signIn, signUp, signInWithProvider, authConfig } = useAuth();

  useEffect(() => {
    if(isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const result = await signIn(
      formData.get('email'),
      formData.get('password')
    );
    
    if (!result.error) {
      onOpenChange(false);
    }
  };
  
  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordStrength < 3) {
      toast({
        title: "Weak Password",
        description: "Please choose a stronger password based on the requirements.",
        variant: "destructive",
      });
      return;
    }

    if (!isHuman) {
      toast({
        title: "Verification Failed",
        description: "Please complete the human verification step.",
        variant: "destructive",
      });
      return;
    }

    if (!country) {
      toast({
        title: "Country not selected",
        description: "Please select your country.",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData(e.target);
    const result = await signUp(
      formData.get('email'),
      password,
      {
        displayName: formData.get('name'),
        country: country,
        role: selectedRole,
        data: {
          role: selectedRole
        }
      }
    );
    
    if (!result.error) {
      onOpenChange(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    const result = await signInWithProvider(provider);
    if (!result.error) {
      onOpenChange(false);
    }
  };

  const isSignUpDisabled = passwordStrength < 3 || !isHuman || !country || password !== confirmPassword;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-transparent border-none shadow-none p-0 w-full max-w-md">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute top-[-40px] right-[-10px] text-white/70 hover:text-white hover:bg-white/10 rounded-full z-20"
          >
            <X className="w-5 h-5" />
          </Button>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 overflow-y-auto">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-white/10 p-1 rounded-full">
                  <TabsTrigger value="login" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">Login</TabsTrigger>
                  <TabsTrigger value="signup" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <form onSubmit={handleLoginSubmit} className="space-y-4 pt-4">
                    {/* Social Login Buttons */}
                    <div className="space-y-3">
                      {authConfig.socialProviders.google.enabled && (
                        <Button
                          type="button"
                          onClick={() => handleSocialLogin('google')}
                          className="w-full bg-white text-gray-900 hover:bg-gray-100 flex items-center justify-center gap-2"
                        >
                          <FcGoogle className="w-5 h-5" />
                          Continue with Google
                        </Button>
                      )}
                      
                      {authConfig.socialProviders.apple.enabled && (
                        <Button
                          type="button"
                          onClick={() => handleSocialLogin('apple')}
                          className="w-full bg-black text-white hover:bg-gray-900 flex items-center justify-center gap-2"
                        >
                          <FaApple className="w-5 h-5" />
                          Continue with Apple
                        </Button>
                      )}
                    </div>
                    
                    {(authConfig.socialProviders.google.enabled || authConfig.socialProviders.apple.enabled) && (
                      <div className="relative flex items-center justify-center my-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-white/20"></div>
                        </div>
                        <div className="relative px-4 text-sm text-gray-300 bg-transparent">
                          Or continue with email
                        </div>
                      </div>
                    )}
                    
                    <Input 
                      name="email" 
                      type="email" 
                      placeholder="Email Address" 
                      required 
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-300" 
                    />
                    <Input 
                      name="password" 
                      type="password" 
                      placeholder="Password" 
                      required 
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-300" 
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2 text-sm text-gray-300">
                        <input type="checkbox" className="rounded bg-white/20 border-white/30 text-pink-500 focus:ring-pink-500" />
                        <span>Remember me</span>
                      </label>
                      <Button type="button" variant="link" onClick={onForgotPasswordClick} className="p-0 h-auto text-sm text-blue-300 hover:text-white">
                        Forgot password?
                      </Button>
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-purple-500">Login</Button>
                    <p className="text-center text-sm text-gray-300">
                      Don't have an account?{' '}
                      <Button type="button" variant="link" className="p-0 h-auto text-blue-300 hover:text-white" onClick={() => setActiveTab('signup')}>
                        Create an account
                      </Button>
                    </p>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup">
                  <form onSubmit={handleSignUpSubmit} className="space-y-6 pt-4">
                    {/* Role Selection */}
                    <div className="space-y-2">
                      <label className="text-sm text-gray-300">I want to:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={selectedRole === 'donor' ? 'default' : 'outline'}
                          onClick={() => setSelectedRole('donor')}
                          className={`${selectedRole === 'donor' ? 'bg-blue-500' : 'bg-white/10 border-white/20 text-white'}`}
                        >
                          Support Others
                        </Button>
                        <Button
                          type="button"
                          variant={selectedRole === 'recipient' ? 'default' : 'outline'}
                          onClick={() => setSelectedRole('recipient')}
                          className={`${selectedRole === 'recipient' ? 'bg-green-500' : 'bg-white/10 border-white/20 text-white'}`}
                        >
                          Receive Support
                        </Button>
                      </div>
                    </div>
                    
                    <Input name="name" placeholder="Full Name" required className="bg-white/10 border-white/20 text-white placeholder:text-gray-300" />
                    <Input name="email" type="email" placeholder="Email Address" required className="bg-white/10 border-white/20 text-white placeholder:text-gray-300" />
                    <CountrySelector onValueChange={setCountry} />
                    
                    <div className="relative">
                      <Input 
                        name="password" 
                        type={showPassword ? "text" : "password"}
                        placeholder="Password" 
                        required 
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-300 pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <Button type="button" variant="ghost" size="icon" className="absolute top-1/2 right-1 transform -translate-y-1/2 h-8 w-8 text-white/70 hover:bg-transparent hover:text-white" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </Button>
                    </div>

                    <div className="relative">
                      <Input 
                        name="confirmPassword" 
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Repeat Password" 
                        required 
                        className={`bg-white/10 border-white/20 text-white placeholder:text-gray-300 pr-10 ${password && confirmPassword && password !== confirmPassword ? 'border-red-500' : ''}`}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                       <Button type="button" variant="ghost" size="icon" className="absolute top-1/2 right-1 transform -translate-y-1/2 h-8 w-8 text-white/70 hover:bg-transparent hover:text-white" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </Button>
                    </div>

                    <p className="text-xs text-gray-300 px-1">
                      Your password should be at least 8 characters long, including an uppercase letter, a number, and a special character (!@#$%).
                    </p>

                    <PasswordStrengthMeter password={password} onStrengthChange={setPasswordStrength} />

                    <HumanCaptcha onVerified={setIsHuman} />
                    
                    <div className="space-y-4 pt-4">
                      <Button type="submit" disabled={isSignUpDisabled} className="w-full bg-gradient-to-r from-green-500 to-blue-500 disabled:opacity-50 disabled:from-gray-500 disabled:to-gray-600">Create Account</Button>
                      <p className="text-center text-sm text-gray-300">
                        Already have an account?{' '}
                        <Button type="button" variant="link" className="p-0 h-auto text-blue-300 hover:text-white" onClick={() => setActiveTab('login')}>
                          Login
                        </Button>
                      </p>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedAuthModal;