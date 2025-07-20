import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Heart, Users, ImagePlus, X, File, Music, Video, MoreVertical, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg'];

const MediaPreview = ({ file, onRemove }) => {
    if (!file) return null;
    const fileType = file.type.split('/')[0];
    const iconSize = "w-8 h-8 text-white";

    return (
        <div className="mt-2 p-2 bg-black/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
                 {fileType === 'image' && <img src={URL.createObjectURL(file)} alt="preview" className="w-16 h-16 object-cover rounded-md" />}
                 {fileType === 'video' && <Video className={iconSize} />}
                 {fileType === 'audio' && <Music className={iconSize} />}
                 {fileType !== 'image' && fileType !== 'video' && fileType !== 'audio' && <File className={iconSize} />}
                 <span className="text-white text-sm truncate max-w-xs">{file.name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onRemove} className="text-red-400 hover:text-red-500 hover:bg-red-500/10">
                <X className="w-5 h-5" />
            </Button>
        </div>
    );
};

const PostMedia = ({ url, type }) => {
    if (!url) return null;
    const mediaType = type?.split('/')[0];

    return (
        <div className="mt-3 rounded-lg overflow-hidden border border-white/10">
            {mediaType === 'image' && <img src={url} alt="Community post media" className="max-w-full h-auto object-contain" />}
            {mediaType === 'video' && <video src={url} controls className="w-full" />}
            {mediaType === 'audio' && <audio src={url} controls className="w-full" />}
        </div>
    );
};


const CommunityView = ({ posts, onPostSubmit, onLikePost, user, onSendMessage, onDeletePost }) => {
  const [newPostContent, setNewPostContent] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large!",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive"
        });
        return;
      }
      if (!ACCEPTED_MEDIA_TYPES.includes(file.type)) {
        toast({
          title: "Unsupported file type!",
          description: "Please select an image, MP4 video, or MP3 audio file.",
          variant: "destructive"
        });
        return;
      }
      setAttachedFile(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newPostContent.trim() && !attachedFile) {
      toast({
        title: "Message can't be empty!",
        description: "Write something or attach a file to post.",
        variant: "destructive"
      });
      return;
    }
    onPostSubmit(newPostContent, attachedFile);
    setNewPostContent('');
    setAttachedFile(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  return (
    <motion.div
      key="community"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-white">Community Hub</h1>
        <p className="text-xl text-blue-200">Connect, share experiences, and support each other</p>
      </div>

      <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start space-x-3">
             {user && (
              <Avatar className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="bg-transparent text-white text-sm font-semibold">
                  {user.name ? user.name.split(' ').map(n => n[0]).join('') : 'U'}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="w-full">
                <Textarea 
                  placeholder={user ? "Share your thoughts with the community..." : "Log in or sign up to join the conversation!"}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-300 focus:ring-cyan-500"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  disabled={!user}
                  rows={3}
                />
                <MediaPreview file={attachedFile} onRemove={() => {
                  setAttachedFile(null);
                  if(fileInputRef.current) fileInputRef.current.value = "";
                }} />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
                <Input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    className="hidden" 
                    id="media-upload-input"
                    accept={ACCEPTED_MEDIA_TYPES.join(',')}
                />
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={!user} 
                                className="text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/20"
                                aria-label="Attach file"
                            >
                                <ImagePlus className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Attach file</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <Button 
              type="submit"
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
              disabled={!user}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Post Message
            </Button>
          </div>
        </form>
      </Card>

        {posts && posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post, index) => {
              const profile = post.profiles || {};
              const isLiked = user && post.liked_by && post.liked_by.includes(user.id);
              const isOwner = user && user.id === post.user_id;

              return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500">
                            <AvatarImage src={profile.avatar_url} />
                            <AvatarFallback className="bg-transparent text-white text-sm font-semibold">
                              {profile.name ? profile.name.split(' ').map(n => n[0]).join('') : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-white font-semibold">{profile.name || 'Anonymous'}</span>
                            <p className="text-blue-200 text-sm">{new Date(post.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {user && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10">
                                        <MoreVertical className="w-5 h-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-black/50 border-white/20 text-white backdrop-blur-lg">
                                    {isOwner ? (
                                        <DropdownMenuItem onClick={() => onDeletePost(post.id)} className="text-red-400 focus:bg-red-500/20 focus:text-red-300">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete Post
                                        </DropdownMenuItem>
                                    ) : (
                                        <DropdownMenuItem onClick={() => onSendMessage(post.user_id)}>
                                            <Send className="w-4 h-4 mr-2" />
                                            Message {profile.name}
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                    {post.content && <p className="text-white whitespace-pre-wrap">{post.content}</p>}
                    <PostMedia url={post.media_url} type={post.media_type} />
                    <div className="flex items-center space-x-4 text-blue-200 pt-2">
                      <button 
                        onClick={() => onLikePost(post.id)}
                        className={cn(
                            "flex items-center space-x-1 hover:text-white transition-colors",
                            isLiked && "text-pink-400"
                        )}
                      >
                        <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                        <span>{post.liked_by?.length || 0}</span>
                      </button>
                      <button 
                        onClick={() => onSendMessage(post.user_id)}
                        className="flex items-center space-x-1 hover:text-white transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Reply</span>
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )})}
          </div>
        ) : (
            <div className="text-center py-20 bg-white/5 border border-white/10 rounded-lg flex flex-col items-center justify-center">
                <div className="relative mb-6">
                    <Users className="w-16 h-16 text-green-400 opacity-30" />
                    <MessageCircle className="absolute -bottom-2 -right-2 w-8 h-8 text-blue-400 bg-blue-900 p-1 rounded-full" />
                </div>
                <h2 className="text-2xl font-semibold text-white">The Conversation Starts Here</h2>
                <p className="text-blue-200 mt-2 max-w-md mx-auto">Be the first to post a message in the community hub!</p>
            </div>
        )}
    </motion.div>
  );
};

export default CommunityView;