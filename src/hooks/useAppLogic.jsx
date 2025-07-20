import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

const AppLogicContext = createContext();

export const AppLogicProvider = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, signIn, signOut, sendPasswordResetEmail, signUp, updateUserPassword } = useAuth();
  const { toast } = useToast();

  const [stories, setStories] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [profile, setProfile] = useState(null);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState('login');
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) {
      console.error('Error fetching profile:', error);
      toast({ variant: 'destructive', title: 'Error fetching profile', description: error.message });
    } else {
      setProfile(data);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchProfile(user.id);
    } else {
      setProfile(null);
    }
  }, [user, fetchProfile]);

  const fetchStories = useCallback(async () => {
    const { data, error } = await supabase.from('stories').select('*, profiles(*)').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching stories:', error);
      toast({ variant: 'destructive', title: 'Error fetching stories', description: error.message });
    } else {
      setStories(data || []);
    }
  }, [toast]);

  const fetchCommunityPosts = useCallback(async () => {
    const { data, error } = await supabase.from('community_posts').select('*, profiles(name, avatar_url, id)').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching posts:', error);
      toast({ variant: 'destructive', title: 'Error fetching posts', description: error.message });
    } else {
      setCommunityPosts(data || []);
    }
  }, [toast]);

  useEffect(() => {
    fetchStories();
    fetchCommunityPosts();
  }, [fetchStories, fetchCommunityPosts]);

  const handleLogin = async (formData) => {
    const { error } = await signIn(formData.email, formData.password);
    if (!error) {
      setShowAuthModal(false);
      toast({ title: t('auth.loginSuccessTitleGeneric'), description: t('auth.loginSuccessDesc') });
      navigate('/profile');
    }
  };

  const handleCreateAccount = async (formData) => {
    const { error } = await signUp(formData.email, formData.password, {
      data: {
        name: formData.name,
        location: formData.location,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`,
      },
    });

    if (!error) {
      setShowAuthModal(false);
      toast({ title: t('auth.confirmEmailTitle'), description: t('auth.confirmEmailDesc') });
    }
  };

  const handleShareStoryClick = () => {
    if (user) {
      setShowCreateStory(true);
    } else {
      setAuthModalInitialTab('signup');
      setShowAuthModal(true);
    }
  };

  const handleCreateStory = async (formData) => {
    if (!user) {
      setAuthModalInitialTab('login');
      setShowAuthModal(true);
      return;
    }
    const { error } = await supabase.from('stories').insert([{ 
      title: formData.title,
      description: formData.story,
      image_url: formData.photoUrl,
      goal_amount: parseInt(formData.goalAmount),
      category: formData.category,
      urgent: formData.urgent,
      user_id: user.id, 
      raised_amount: 0, 
      supporters: 0, 
    }]).select();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setShowCreateStory(false);
      toast({ title: t('story.shareSuccessTitle'), description: t('story.shareSuccessDesc') });
      fetchStories();
    }
  };

  const handlePostToCommunity = async (content, file) => {
    if (!user) {
      toast({ title: t('community.loginRequiredTitle'), description: t('community.loginRequiredDesc'), variant: "destructive" });
      setAuthModalInitialTab('login');
      setShowAuthModal(true);
      return;
    }
    let mediaUrl = null;
    let mediaType = null;
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      const { error: uploadError } = await supabase.storage.from('community_media').upload(filePath, file);
      if (uploadError) {
        toast({ title: "Upload Error", description: uploadError.message, variant: "destructive" });
        return;
      }
      const { data: urlData } = supabase.storage.from('community_media').getPublicUrl(filePath);
      mediaUrl = urlData.publicUrl;
      mediaType = file.type;
    }
    const { error } = await supabase.from('community_posts').insert([{ content, media_url: mediaUrl, media_type: mediaType, user_id: user.id, liked_by: [] }]);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t('community.postSuccessTitle'), description: t('community.postSuccessDesc') });
      fetchCommunityPosts();
    }
  };

  const handleLikePost = async (postId) => {
    if (!user) {
      toast({ title: t('community.loginRequiredTitle'), description: "You need to be logged in to like posts.", variant: "destructive" });
      setAuthModalInitialTab('login');
      setShowAuthModal(true);
      return;
    }
    const { error } = await supabase.rpc('toggle_like', { post_id_in: postId, user_id_in: user.id });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchCommunityPosts();
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
    toast({ title: t('auth.logoutTitle'), description: t('auth.logoutDesc') });
  };

  const handleForgotPasswordRequest = async (email) => {
    const { error } = await sendPasswordResetEmail(email);
    if (!error) {
      setShowForgotPasswordModal(false);
      toast({ title: "Password Reset Email Sent", description: "If an account exists, you will receive an email with instructions." });
    }
  };

  const handleLoginClick = () => {
    setAuthModalInitialTab('login');
    setShowAuthModal(true);
  };
  
  const handleForgotPasswordClick = () => {
    setShowAuthModal(false);
    setShowForgotPasswordModal(true);
  };

  const handleBackToLogin = () => {
    setShowForgotPasswordModal(false);
    handleLoginClick();
  };

  const handleDonateClick = () => {
    navigate('/');
  };
  
  const handleUpdateProfile = async (updateData) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id);
    if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
        await fetchProfile(user.id);
        toast({ title: "Profile updated successfully!" });
    }
  };
  
  const handleUpdatePassword = async (newPassword) => {
      const { error } = await updateUserPassword(newPassword);
      if (error) {
        toast({ title: "Error updating password", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Password updated successfully!" });
      }
  };
  
  const handleDeleteStory = async (storyId) => {
      const { error } = await supabase.from('stories').delete().eq('id', storyId);
      if(error) {
          toast({ title: "Error deleting story", description: error.message, variant: "destructive" });
      } else {
          fetchStories();
          toast({ title: "Story deleted successfully" });
      }
  };

  const handleDeletePost = async (postId) => {
      const { error } = await supabase.from('community_posts').delete().eq('id', postId);
      if(error) {
          toast({ title: "Error deleting post", description: error.message, variant: "destructive" });
      } else {
          fetchCommunityPosts();
          toast({ title: "Post deleted successfully" });
      }
  };
  
  const handleEditStory = (story) => {
      toast({ title: "Feature coming soon!", description: "Editing stories will be available in a future update." });
  }
  
  const handleSendMessage = async (recipientId) => {
    if (!user) {
        handleLoginClick();
        return;
    }
    if (user.id === recipientId) {
        toast({ title: "Cannot message yourself", variant: 'destructive'});
        return;
    }
    const { data, error } = await supabase.rpc('create_or_get_conversation', { participant_id: recipientId });
    if(error) {
        toast({ title: "Error starting conversation", description: error.message, variant: 'destructive'});
    } else {
        // This navigation is now handled by the ChatWidget,
        // but we can keep it for fallback or direct navigation.
        navigate(`/messages/${data}`);
    }
  }

  const value = useMemo(() => ({
    user,
    profile,
    stories,
    communityPosts,
    showAuthModal,
    setShowAuthModal,
    showCreateStory,
    setShowCreateStory,
    showForgotPasswordModal,
    setShowForgotPasswordModal,
    authModalInitialTab,
    handlers: {
      handleLogin,
      handleCreateAccount,
      handleShareStoryClick,
      handleCreateStory,
      handlePostToCommunity,
      handleLikePost,
      handleLogout,
      handleForgotPasswordRequest,
      handleLoginClick,
      handleDonateClick,
      handleForgotPasswordClick,
      handleBackToLogin,
      handleUpdateProfile,
      handleUpdatePassword,
      handleDeleteStory,
      handleDeletePost,
      handleEditStory,
      handleSendMessage
    }
  }), [user, profile, stories, communityPosts, showAuthModal, showCreateStory, showForgotPasswordModal, authModalInitialTab, handleLogin, handleCreateAccount, handleShareStoryClick, handleCreateStory, handlePostToCommunity, handleLikePost, handleLogout, handleForgotPasswordRequest, handleLoginClick, handleDonateClick, handleForgotPasswordClick, handleBackToLogin, handleUpdateProfile, handleUpdatePassword, handleDeleteStory, handleDeletePost, handleEditStory, handleSendMessage]);

  return <AppLogicContext.Provider value={value}>{children}</AppLogicContext.Provider>;
};

export const useAppLogic = () => {
  const context = useContext(AppLogicContext);
  if (context === undefined) {
    throw new Error('useAppLogic must be used within an AppLogicProvider');
  }
  return context;
};