import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
const Footer = () => {
  return <motion.footer initial={{
    opacity: 0
  }} animate={{
    opacity: 1
  }} transition={{
    duration: 0.5
  }} className="bg-black/20 backdrop-blur-sm border-t border-white/10 text-blue-200 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <p className="text-lg italic text-white">🌱 “Delivering dignity, hope, and daily relief — across borders and beyond barriers.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="space-y-2">
            <h3 className="font-bold text-white text-lg">Ocean of Hope Foundation</h3>
            <p className="text-sm">A non-profit initiative powered by ATIM EMPIRE LTD</p>
            <p className="text-sm">Registered in England & Wales</p>
            <p className="text-sm">📍 London, UK</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-white text-lg">Contact Us</h3>
            <p className="text-sm">✉️ info@oceanofhope.org</p>
            <p className="text-sm">🌍 www.oceanofhope.org</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-white text-lg">Legal</h3>
            <div className="flex flex-col space-y-2">
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link to="/donation-disclaimer" className="hover:text-white transition-colors">Donation Disclaimer</Link>
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/10 mt-8 pt-6 text-center text-sm">
          <p>&copy; 2025 Ocean of Hope Foundation. All Rights Reserved.</p>
        </div>
      </div>
    </motion.footer>;
};
export default Footer;