import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <motion.div
      key="privacy-policy"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="container mx-auto px-4 py-12"
    >
      <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <ShieldCheck className="w-10 h-10 text-green-400" />
            <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
          </div>
          <p className="text-blue-200">Effective Date: {new Date().toLocaleDateString()}</p>
        </CardHeader>
        <CardContent className="space-y-6 text-blue-200 leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">1. Information We Collect</h2>
            <p>
              We may collect personal information such as your name, email address, and payment details when you donate, subscribe to updates, or contact us.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">2. Use of Information</h2>
            <p>We use your data to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>Process donations</li>
              <li>Send updates and receipts</li>
              <li>Respond to enquiries</li>
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">3. Data Security</h2>
            <p>
              We use secure third-party platforms (e.g., Stripe) to process donations. We do not store full payment information on our servers.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">4. Sharing of Information</h2>
            <p>
              We do not sell, rent, or trade your personal data. Your information is only shared with trusted third-party service providers necessary for donation processing and communications.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">5. Data Access and Deletion</h2>
            <p>
              You can request to access, update, or delete your personal data by contacting: <a href="mailto:privacy@globalrelieffoundation.org" className="text-cyan-400 hover:underline">privacy@globalrelieffoundation.org</a>
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">6. Cookies</h2>
            <p>
              Our website may use cookies to enhance your browsing experience. You can disable cookies in your browser settings.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">7. Policy Changes</h2>
            <p>
              We may update our Privacy Policy periodically. Continued use of the website implies acceptance of any revised policy.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PrivacyPolicy;