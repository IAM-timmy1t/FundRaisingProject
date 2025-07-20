import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, LogOut, Users, LifeBuoy, MessageSquare, Shield, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu.jsx";
import MobileHeader from './MobileHeader';

const logoUrl = "https://storage.googleapis.com/hostinger-horizons-assets-prod/05bb7280-8f3e-44fe-afa6-945be0a5b5c7/d2a60dec2aa785b2ec9d10ea4c13dab1.png";

const Header = ({ user, onLoginClick, onLogout, onDonateClick }) => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use mobile header for small screens
  if (isMobile) {
    return (
      <MobileHeader 
        user={user} 
        onLoginClick={onLoginClick} 
        onLogout={onLogout} 
        onDonateClick={onDonateClick} 
      />
    );
  }

  // Desktop header
  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="bg-transparent sticky top-0 z-40"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20 lg:h-28">
          <div className="flex-1 md:flex-none">
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center h-full">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
              <motion.img 
                src={logoUrl} 
                alt="Ocean of Hope Foundation Logo" 
                className="object-contain mix-blend-screen h-16 lg:h-20"
                whileHover={{ scale: 1.05 }}
              />
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-end space-x-2 md:space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.div whileHover={{ scale: 1.1 }} className="cursor-pointer">
                    <Avatar className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500">
                      <AvatarImage src={user.avatar_url} alt={user.name} />
                      <AvatarFallback className="bg-transparent text-white font-semibold">
                        {user.name ? user.name.split(' ').map(n => n[0]).join('') : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-black/50 border-white/20 text-white backdrop-blur-lg mt-2 mr-4">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/donor/dashboard')}>
                    <Heart className="mr-2 h-4 w-4" />
                    <span>Donor Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/campaigns')}>
                    <Target className="mr-2 h-4 w-4" />
                    <span>Browse Campaigns</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDonateClick}>
                    <Heart className="mr-2 h-4 w-4" />
                    <span>Donate Now</span>
                  </DropdownMenuItem>
                   {user.role === 'admin' && (
                     <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4 text-cyan-400" />
                        <span className="text-cyan-400">Admin Panel</span>
                      </DropdownMenuItem>
                   )}
                  <DropdownMenuItem onClick={() => navigate('/support')}>
                    <LifeBuoy className="mr-2 h-4 w-4" />
                    <span>Support</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/20" />
                  <DropdownMenuItem onClick={onLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
               <div className="flex items-center space-x-2">
                    <Button 
                        onClick={onLoginClick}
                        className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                    >
                        <Users className="w-4 h-4 mr-2" />
                        Join the Community
                    </Button>
               </div>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;