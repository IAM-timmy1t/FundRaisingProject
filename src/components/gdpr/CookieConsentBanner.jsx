import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cookie, Settings, Shield, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const CookieConsentBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consent, setConsent] = useState({
    necessary: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
    preferences: false
  });

  useEffect(() => {
    // Check if user has already given consent
    const storedConsent = localStorage.getItem('cookieConsent');
    if (!storedConsent) {
      setShowBanner(true);
    } else {
      setConsent(JSON.parse(storedConsent));
    }
  }, []);

  const handleAcceptAll = () => {
    const fullConsent = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookieConsent', JSON.stringify(fullConsent));
    setConsent(fullConsent);
    setShowBanner(false);
    
    // Fire consent event for analytics tools
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: fullConsent }));
  };

  const handleRejectAll = () => {
    const minimalConsent = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookieConsent', JSON.stringify(minimalConsent));
    setConsent(minimalConsent);
    setShowBanner(false);
    
    // Fire consent event
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: minimalConsent }));
  };

  const handleSavePreferences = () => {
    const customConsent = {
      ...consent,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookieConsent', JSON.stringify(customConsent));
    setShowSettings(false);
    setShowBanner(false);
    
    // Fire consent event
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: customConsent }));
  };

  const cookieTypes = [
    {
      id: 'necessary',
      title: 'Necessary Cookies',
      description: 'These cookies are essential for the website to function properly. They cannot be disabled.',
      disabled: true
    },
    {
      id: 'analytics',
      title: 'Analytics Cookies',
      description: 'Help us understand how visitors interact with our website by collecting anonymous information.',
      disabled: false
    },
    {
      id: 'marketing',
      title: 'Marketing Cookies',
      description: 'Used to track visitors across websites to display relevant advertisements.',
      disabled: false
    },
    {
      id: 'preferences',
      title: 'Preference Cookies',
      description: 'Allow the website to remember your preferences such as language and region.',
      disabled: false
    }
  ];

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
          >
            <Card className="max-w-6xl mx-auto bg-gray-900/95 backdrop-blur-xl border-gray-700 text-white">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Cookie className="w-8 h-8 text-yellow-400" />
                    <CardTitle className="text-2xl">Cookie Consent</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowBanner(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">
                  We use cookies to enhance your experience on Blessed Horizon. By continuing to use our website, 
                  you consent to our use of cookies in accordance with our Privacy Policy and Cookie Policy.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleAcceptAll}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                  >
                    Accept All Cookies
                  </Button>
                  <Button
                    onClick={handleRejectAll}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Reject Non-Essential
                  </Button>
                  <Button
                    onClick={() => setShowSettings(true)}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800 flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Cookie Settings
                  </Button>
                </div>
                
                <p className="text-sm text-gray-400">
                  You can change your cookie preferences at any time by accessing our Cookie Settings. 
                  Read our <a href="/privacy-policy" className="text-cyan-400 hover:underline">Privacy Policy</a> and 
                  <a href="/cookie-policy" className="text-cyan-400 hover:underline ml-1">Cookie Policy</a> for more information.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl bg-gray-900 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <Cookie className="w-6 h-6 text-yellow-400" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Manage your cookie preferences below. You can enable or disable different types of cookies 
              based on your preferences.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {cookieTypes.map((cookie) => (
              <div key={cookie.id} className="space-y-3 border-b border-gray-700 pb-4 last:border-0">
                <div className="flex items-center justify-between">
                  <Label htmlFor={cookie.id} className="text-lg font-medium">
                    {cookie.title}
                  </Label>
                  <Switch
                    id={cookie.id}
                    checked={consent[cookie.id]}
                    onCheckedChange={(checked) => setConsent(prev => ({ ...prev, [cookie.id]: checked }))}
                    disabled={cookie.disabled}
                  />
                </div>
                <p className="text-sm text-gray-400">{cookie.description}</p>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => setShowSettings(false)}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePreferences}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              Save Preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieConsentBanner;
