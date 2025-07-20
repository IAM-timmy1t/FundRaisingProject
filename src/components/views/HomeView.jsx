import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Heart, FileText, LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StoryCard from '@/components/shared/StoryCard';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/context/LocaleContext';

const HomeView = ({ stories, onShareStoryClick, user }) => {
  const { t } = useTranslation();
  const { country } = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const navigate = useNavigate();

  const handleDonateClick = (story) => {
    navigate(`/payment/${story.id}`);
  };

  const filteredStories = stories.filter(story => {
    const profile = story.profiles || {};
    const matchesSearch = story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (profile.name && profile.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (profile.location && profile.location.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterCategory === 'all' || story.category === filterCategory;
    const matchesCountry = country === 'GLOBAL' || (profile.location && profile.location.includes(country));
    return matchesSearch && matchesFilter && matchesCountry;
  });

  return (
    <motion.div
      key="home"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="text-center space-y-6 py-12 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/20 rounded-full filter blur-3xl opacity-50"></div>
        <motion.h1 
          className="text-4xl md:text-6xl font-extrabold text-white tracking-tight relative"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {t('home.title')} <span className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">{t('home.titleHighlight')}</span>
        </motion.h1>
        <motion.p 
          className="text-xl text-blue-200 max-w-3xl mx-auto relative"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {t('home.subtitle')}
        </motion.p>
        
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center items-center relative"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button 
            onClick={onShareStoryClick}
            size="lg"
            className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('home.shareStory')}
          </Button>
        </motion.div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-black/10 rounded-lg backdrop-blur-sm border border-white/10">
        <div className="flex-1 w-full md:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={t('home.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-300 focus:ring-cyan-500"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-white" />
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-cyan-500"
          >
            <option value="all">{t('categories.all')}</option>
            <option value="medical">{t('categories.medical')}</option>
            <option value="education">{t('categories.education')}</option>
            <option value="housing">{t('categories.housing')}</option>
            <option value="emergency">{t('categories.emergency')}</option>
            <option value="business">{t('categories.business')}</option>
          </select>
        </div>
      </div>

      {stories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStories.map((story, index) => (
            <StoryCard 
              key={story.id} 
              story={story} 
              onDonateClick={handleDonateClick} 
              index={index} 
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-lg flex flex-col items-center justify-center">
            <div className="relative mb-6">
                <FileText className="w-16 h-16 text-blue-400 opacity-30" />
                <Heart className="absolute -bottom-2 -right-2 w-8 h-8 text-pink-400 bg-blue-900 p-1 rounded-full" />
            </div>
            <h2 className="text-2xl font-semibold text-white">{t('home.noStoriesTitle')}</h2>
            <p className="text-blue-200 mt-2 max-w-md mx-auto">{t('home.noStoriesDesc')}</p>
        </div>
      )}

      {stories.length > 0 && filteredStories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-blue-200 text-lg">{t('home.noMatch')}</p>
        </div>
      )}
    </motion.div>
  );
};

export default HomeView;