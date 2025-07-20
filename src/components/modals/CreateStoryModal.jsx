
import React from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

const CreateStoryModal = ({ isOpen, onOpenChange, onSubmit }) => {

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    onSubmit({
      title: formData.get('title'),
      story: formData.get('story'),
      category: formData.get('category'),
      goalAmount: formData.get('goalAmount'),
      photoUrl: formData.get('photoUrl'),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-transparent border-none shadow-none p-0 w-full max-w-lg overflow-visible">
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
                <DialogTitle className="text-white text-2xl">Share Your Story</DialogTitle>
                <DialogDescription className="text-white/70">
                  Let the world know your needs. Your story can inspire action.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <Input name="title" placeholder="Story Title" required className="bg-white/10 border-white/20 text-white placeholder:text-gray-300" />
                <Textarea name="story" placeholder="Tell your story..." required className="bg-white/10 border-white/20 text-white placeholder:text-gray-300" />
                <Input name="category" placeholder="Category (e.g., Medical, Education)" required className="bg-white/10 border-white/20 text-white placeholder:text-gray-300" />
                <Input name="goalAmount" type="number" placeholder="Goal Amount ($)" required className="bg-white/10 border-white/20 text-white placeholder:text-gray-300" />
                <Input name="photoUrl" placeholder="Image URL (optional)" className="bg-white/10 border-white/20 text-white placeholder:text-gray-300" />
                <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-teal-500">Share Story</Button>
              </form>
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStoryModal;
