import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Zap, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLocale } from '@/context/LocaleContext';
import { useTranslation } from 'react-i18next';
import { useAppLogic } from '@/hooks/useAppLogic';

const getProgressPercentage = (raised, goal) => {
  if (goal === 0) return 0;
  return Math.min((raised / goal) * 100, 100);
};

const StoryCard = ({ story, onDonateClick, index }) => {
  const { t } = useTranslation();
  const { formatCurrency } = useLocale();
  const { user, handlers } = useAppLogic();
  const profile = story.profiles || {};
  const progress = getProgressPercentage(story.raised_amount, story.goal_amount);

  const isOwner = user && user.id === story.user_id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="h-full"
    >
      <Card className={cn(
        "bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-300 overflow-hidden group h-full flex flex-col relative",
        { 'text-white': story.image_url }
      )}>
        {isOwner && (
            <div className="absolute top-2 right-2 z-30 flex gap-2">
                <Button variant="outline" size="icon" className="bg-blue-500/50 hover:bg-blue-500/80 border-none h-8 w-8" onClick={() => handlers.handleEditStory(story)}>
                    <Edit className="h-4 w-4 text-white" />
                </Button>
                <Button variant="outline" size="icon" className="bg-red-500/50 hover:bg-red-500/80 border-none h-8 w-8" onClick={() => handlers.handleDeleteStory(story.id)}>
                    <Trash2 className="h-4 w-4 text-white" />
                </Button>
            </div>
        )}
        {story.image_url && (
          <>
            <div className="absolute inset-0 bg-cover bg-center z-0 transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: `url(${story.image_url})` }}></div>
            <div className="absolute inset-0 bg-black/60 z-10"></div>
          </>
        )}
        <div className="p-6 space-y-4 flex-grow flex flex-col z-20">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500">
                <AvatarImage src={profile.avatar_url} alt={profile.name} />
                <AvatarFallback className="bg-transparent text-white font-semibold">{profile.name ? profile.name.split(' ').map(n=>n[0]).join('') : 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <span className="font-semibold">{profile.name}</span>
                <p className={cn("text-sm", story.image_url ? "text-gray-300" : "text-blue-200")}>{profile.location}</p>
              </div>
            </div>
            {story.urgent && (
              <Badge variant="destructive" className="bg-red-500 text-white border-transparent">
                <Zap className="w-3 h-3 mr-1" />
                {t('story.urgent')}
              </Badge>
            )}
          </div>

          <div className="flex-grow">
            <span className="text-lg font-semibold">{story.title}</span>
            <p className={cn("text-sm mt-2 line-clamp-3", story.image_url ? "text-gray-200" : "text-blue-200")}>{story.description}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className={cn(story.image_url ? "text-gray-300" : "text-blue-200")}>{t('story.raised')}: {formatCurrency(story.raised_amount)}</span>
              <span className={cn(story.image_url ? "text-gray-300" : "text-blue-200")}>{t('story.goal')}: {formatCurrency(story.goal_amount)}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <motion.div 
                className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: index * 0.1 + 0.5 }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className={cn(story.image_url ? "text-gray-300" : "text-blue-200")}>{t('story.supportersCount', { count: story.supporters || 0 })}</span>
              <span className={cn(story.image_url ? "text-gray-300" : "text-blue-200")}>{t('story.funded', { progress: progress.toFixed(0) })}</span>
            </div>
          </div>

          <div className="mt-4">
            <Button 
              onClick={() => onDonateClick(story)}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 group-hover:scale-105 transition-transform"
            >
              <Heart className="w-4 h-4 mr-2" />
              {t('story.support')}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default StoryCard;