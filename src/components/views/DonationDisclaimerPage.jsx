import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';

const DonationDisclaimerPage = () => {
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
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <CardTitle className="text-3xl md:text-4xl font-bold">Donation Disclaimer</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-blue-200 leading-relaxed text-lg">
            <p>
              Ocean of Hope Foundation is a non-profit initiative operated by ATIM EMPIRE LTD, a limited company registered in England and Wales. We are not currently a registered charity, and as such, donations are not eligible for Gift Aid at this time.
            </p>
            <p>
              All donations received are used to fund projects and support individuals featured on our platform. We are committed to transparency and ensuring that your contributions make a direct impact.
            </p>
            <p>
              Please review our <Link to="/terms-of-service" className="text-cyan-400 hover:underline">Terms of Service</Link> for more details on how funds are allocated and managed.
            </p>
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

export default DonationDisclaimerPage;