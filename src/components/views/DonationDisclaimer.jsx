import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

const DonationDisclaimer = () => {
  return (
    <motion.div
      key="donation-disclaimer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="container mx-auto px-4 py-12"
    >
      <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <ShieldAlert className="w-10 h-10 text-amber-400" />
            <CardTitle className="text-3xl font-bold">Donation Disclaimer</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 text-blue-200 leading-relaxed">
          <p>
            Global Relief Foundation is a non-profit initiative operated by ATIM EMPIRE LTD, a limited company registered in England and Wales. 
          </p>
          <p>
            We are not currently a registered charity, and as such, donations are not eligible for Gift Aid at this time.
          </p>
           <p>
            All donations received are used to fund projects and support our mission of providing relief to those in need. We are committed to transparency and accountability in all our operations.
          </p>
          <p>
            If you have any questions about your donation or our financial practices, please do not hesitate to contact us at <a href="mailto:info@globalrelieffoundation.org" className="text-cyan-400 hover:underline">info@globalrelieffoundation.org</a>.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DonationDisclaimer;