import React from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

const ForgotPasswordModal = ({ isOpen, onOpenChange, onSubmit, onBackToLogin }) => {

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    onSubmit(formData.get('email'));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-transparent border-none shadow-none p-0 w-full max-w-md overflow-visible">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute top-[-40px] right-[-10px] text-white/70 hover:text-white hover:bg-white/10 rounded-full z-20"
          >
            <X className="w-5 h-5" />
          </Button>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white text-2xl">Forgot Password</DialogTitle>
                <DialogDescription className="text-white/70">
                  Enter your email and we'll send you a link to reset your password.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <Input name="email" type="email" placeholder="Email Address" required className="bg-white/10 border-white/20 text-white placeholder:text-gray-300" />
                <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-indigo-500">Send Reset Link</Button>
                <Button type="button" variant="link" onClick={onBackToLogin} className="w-full text-sm text-blue-300 hover:text-white">
                  Back to Login
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordModal;