import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Shield, Users, Heart, LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const AboutView = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      key="about"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-12"
    >
      <div className="text-center space-y-4 relative">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-blue-500/20 rounded-full filter blur-3xl opacity-50"></div>
        <h1 className="text-4xl md:text-5xl font-bold text-white relative">About Ocean of Hope Foundation</h1>
        <p className="text-xl text-blue-200 max-w-3xl mx-auto relative">
          We're a non-profit organization dedicated to supporting individuals and families facing financial crises worldwide.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-8 text-center transform hover:-translate-y-2 transition-transform duration-300">
          <Shield className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white">Secure & Trusted</h2>
          <p className="text-blue-200 mt-2">Your donations are processed securely and reach those who need them most.</p>
        </Card>
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-8 text-center transform hover:-translate-y-2 transition-transform duration-300">
          <Users className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white">Global Community</h2>
          <p className="text-blue-200 mt-2">Connect with supporters and recipients from around the world.</p>
        </Card>
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-8 text-center transform hover:-translate-y-2 transition-transform duration-300">
          <Heart className="w-12 h-12 text-pink-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white">Direct Impact</h2>
          <p className="text-blue-200 mt-2">100% of donations go directly to supporting those in need.</p>
        </Card>
      </div>

      <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-8 relative overflow-hidden">
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-fuchsia-500/20 rounded-full filter blur-3xl opacity-50"></div>
        <div className="space-y-6 relative">
          <h2 className="text-3xl font-bold text-white">Our Mission</h2>
          <p className="text-blue-200 text-lg leading-relaxed">
            Ocean of Hope Foundation exists to bridge the gap between those who need help and those who can provide it. 
            We believe that everyone deserves a chance to overcome financial hardship with dignity and support from their global community.
          </p>
          <p className="text-blue-200 text-lg leading-relaxed">
            Through our platform, we enable instant account creation, secure story sharing, and safe donation processing, 
            creating a trusted environment where real help can reach real people in real time.
          </p>
        </div>
      </Card>
      
      <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-8 text-center">
        <LifeBuoy className="w-12 h-12 text-teal-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-white">Need Assistance?</h2>
        <p className="text-blue-200 mt-2 max-w-2xl mx-auto">
          Our support team is here to help. Visit our support center for FAQs or to get in touch with us.
        </p>
        <Button onClick={() => navigate('/support')} className="mt-6 bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600 text-white font-bold">
          Go to Support Center
        </Button>
      </Card>
    </motion.div>
  );
};

export default AboutView;