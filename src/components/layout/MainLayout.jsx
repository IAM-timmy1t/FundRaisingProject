import React from 'react';
import { useLocation } from 'react-router-dom';
import HomeView from '@/components/views/HomeView';
import CommunityView from '@/components/views/CommunityView';
import AboutView from '@/components/views/AboutView';

const MainLayout = ({ stories, communityPosts, user, onShareStoryClick, onPostToCommunity, onLikePost, onLoginClick, onSendMessage, onDeletePost }) => {
  const location = useLocation();

  const renderContent = () => {
    const path = location.pathname;

    if (path.startsWith('/community')) {
      return (
        <CommunityView 
          posts={communityPosts} 
          onPostSubmit={onPostToCommunity} 
          onLikePost={onLikePost}
          user={user}
          onSendMessage={onSendMessage}
          onDeletePost={onDeletePost}
        />
      );
    }
    if (path.startsWith('/about')) {
      return <AboutView />;
    }
    
    // Default to HomeView
    return (
      <HomeView 
        stories={stories}
        onShareStoryClick={onShareStoryClick}
        user={user}
      />
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {renderContent()}
    </div>
  );
};

export default MainLayout;