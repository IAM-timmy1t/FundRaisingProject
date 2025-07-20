import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';

const TermsOfServicePage = () => {
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
              <FileText className="w-10 h-10 text-blue-400" />
              <CardTitle className="text-3xl md:text-4xl font-bold">Terms of Service</CardTitle>
            </div>
            <p className="text-blue-300 pt-2">Effective Date: {effectiveDate}</p>
          </CardHeader>
          <CardContent className="space-y-6 text-blue-200 leading-relaxed text-lg">
            <p>
              By accessing and using the Ocean of Hope Foundation website ("we", "our", "us"), you agree to the following terms:
            </p>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">1. Purpose and Scope</h3>
              <p>The Ocean of Hope Foundation website exists to share our mission, provide information about our activities, and accept donations in support of our non-profit humanitarian work.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">2. Content Use</h3>
              <p>All content on our site, including text, images, logos, and graphics, is the property of Ocean of Hope Foundation unless otherwise noted. You may not copy, reproduce, modify, distribute, or use any material without prior written consent.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">3. User Conduct</h3>
              <p>You agree not to use our website for any unlawful purpose or in a way that could harm our operations or reputation. We reserve the right to block users who violate these terms.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">4. Donations</h3>
              <p>All donations are voluntary and non-refundable. We reserve the right to allocate donations based on need, priority, and operational discretion. Donation summaries are available upon request. See our <Link to="/donation-disclaimer" className="text-cyan-400 hover:underline">Donation Disclaimer</Link> for more info.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">5. Modifications</h3>
              <p>We reserve the right to update or modify these Terms at any time. Continued use of the website after changes constitutes your acceptance of the new terms.</p>
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

export default TermsOfServicePage;