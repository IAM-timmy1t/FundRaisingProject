import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';

const PrivacyPolicyPage = () => {
  const effectiveDate = "2025-07-15";

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-white/5 backdrop-blur-xl border-white/20 text-white">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <ShieldCheck className="w-10 h-10 text-green-400" />
              <CardTitle className="text-3xl md:text-4xl font-bold">Privacy Policy</CardTitle>
            </div>
            <p className="text-blue-300 pt-2">Effective Date: {effectiveDate}</p>
          </CardHeader>
          <CardContent className="space-y-6 text-blue-200 leading-relaxed text-lg">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">1. Information We Collect</h3>
              <p>We may collect personal information such as your name, email address, and payment details when you donate, subscribe to updates, or contact us.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">2. Use of Information</h3>
              <p>We use your data to: Process donations, send updates and receipts, and respond to enquiries.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">3. Data Security</h3>
              <p>We use secure third-party platforms to process donations. We do not store full payment information on our servers.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">4. Sharing of Information</h3>
              <p>We do not sell, rent, or trade your personal data. Your information is only shared with trusted third-party service providers necessary for donation processing and communications.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">5. Data Access and Deletion</h3>
              <p>You can request to access, update, or delete your personal data by contacting: <a href="mailto:privacy@oceanofhope.org" className="text-cyan-400 hover:underline">privacy@oceanofhope.org</a></p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">6. Cookies</h3>
              <p>Our website may use cookies to enhance your browsing experience. You can disable cookies in your browser settings.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">7. Policy Changes</h3>
              <p>We may update our Privacy Policy periodically. Continued use of the website implies acceptance of any revised policy.</p>
            </div>
            <div className="pt-4 text-center">
                <Button onClick={() => window.history.back()} className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
                    Go Back
                </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PrivacyPolicyPage;