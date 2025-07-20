import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MailCheck, X } from 'lucide-react';

const EmailVerificationModal = ({ isOpen, onOpenChange, onSubmit, email }) => {
  const [code, setCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(code);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 w-full max-w-md relative"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-2 text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="text-center mb-4">
            <span className="text-xl font-bold text-white">Verify Your Email</span>
            <p className="text-blue-200 text-sm mt-1">
              We've sent a 6-digit code to <span className="font-semibold text-white">{email}</span>. Please enter it below.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input 
              name="code"
              type="text"
              placeholder="Enter 6-digit code" 
              required
              maxLength="6"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-300 text-center tracking-[0.5em] text-lg"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
            />
            <Button type="submit" className="w-full bg-gradient-to-r from-green-500 to-teal-500">
              <MailCheck className="w-4 h-4 mr-2" />
              Verify & Create Account
            </Button>
          </form>
        </motion.div>
      </div>
    </Dialog>
  );
};

export default EmailVerificationModal;