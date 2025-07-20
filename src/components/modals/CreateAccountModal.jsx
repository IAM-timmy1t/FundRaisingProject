import React from 'react';
import { motion } from 'framer-motion';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CreateAccountModal = ({ isOpen, onOpenChange, onSubmit }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    onSubmit({
      name: formData.get('name'),
      email: formData.get('email'),
      location: formData.get('location')
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 w-full max-w-md"
        >
          <span className="text-xl font-bold text-white mb-4 block">Join Our Community</span>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input 
              name="name"
              placeholder="Full Name"
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-300"
            />
            <Input 
              name="email"
              type="email"
              placeholder="Email Address"
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-300"
            />
            <Input 
              name="location"
              placeholder="City, Country"
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-300"
            />
            <div className="flex space-x-3">
              <Button type="submit" className="flex-1 bg-gradient-to-r from-green-500 to-blue-500">
                Create Account
              </Button>
              <Button 
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </Dialog>
  );
};

export default CreateAccountModal;