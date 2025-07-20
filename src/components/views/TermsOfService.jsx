import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

const TermsOfService = () => {
  return (
    <motion.div
      key="terms-of-service"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="container mx-auto px-4 py-12"
    >
      <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <FileText className="w-10 h-10 text-cyan-400" />
            <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
          </div>
          <p className="text-blue-200">Effective Date: {new Date().toLocaleDateString()}</p>
        </CardHeader>
        <CardContent className="space-y-6 text-blue-200 leading-relaxed">
          <p>
            By accessing and using the Global Relief Foundation website ("we", "our", "us"), you agree to the following terms:
          </p>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">1. Purpose and Scope</h2>
            <p>
              The Global Relief Foundation website exists to share our mission, provide information about our activities, and accept donations in support of our non-profit humanitarian work.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">2. Content Use</h2>
            <p>
              All content on our site, including text, images, logos, and graphics, is the property of Global Relief Foundation unless otherwise noted. You may not copy, reproduce, modify, distribute, or use any material without prior written consent.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">3. User Conduct</h2>
            <p>
              You agree not to use our website for any unlawful purpose or in a way that could harm our operations or reputation. We reserve the right to block users who violate these terms.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">4. Donations</h2>
            <p>
              All donations are voluntary and non-refundable. We reserve the right to allocate donations based on need, priority, and operational discretion. Donation summaries are available upon request.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">5. Modifications</h2>
            <p>
              We reserve the right to update or modify these Terms at any time. Continued use of the website after changes constitutes your acceptance of the new terms.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TermsOfService;