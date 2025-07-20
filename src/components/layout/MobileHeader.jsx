import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  LogOut, 
  Users, 
  LifeBuoy, 
  Shield, 
  Target, 
  Menu, 
  X,
  Home,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const logoUrl = "https://storage.googleapis.com/hostinger-horizons-assets-prod/05bb7280-8f3e-44fe-afa6-945be0a5b5c7/d2a60dec2aa785b2ec9d10ea4c13dab1.png";

const MobileHeader = ({ user, onLoginClick, onLogout, onDonateClick }) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { icon: Home, label: 'Home', path: '/', show: true },
    { icon: Target, label: 'Browse Campaigns', path: '/campaigns', show: true },
    { icon: Heart, label: 'Donor Dashboard', path: '/donor/dashboard', show: !!user },
    { icon: User, label: 'My Profile', path: '/profile', show: !!user },
    { icon: Shield, label: 'Admin Panel', path: '/admin', show: user?.role === 'admin', className: 'text-cyan-400' },
    { icon: LifeBuoy, label: 'Support', path: '/support', show: true },
  ];

  const handleMenuItemClick = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleDonateClick = () => {
    onDonateClick();
    setMobileMenuOpen(false);
  };

  return (
    <>
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-black/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/10"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div 
              className="flex items-center space-x-2 cursor-pointer" 
              onClick={() => navigate('/')}
            >
              <motion.img 
                src={logoUrl} 
                alt="Ocean of Hope Foundation Logo" 
                className="object-contain mix-blend-screen h-12"
                whileHover={{ scale: 1.05 }}
              />
            </div>
            
            {/* Mobile Menu Button or User Avatar */}
            <div className="flex items-center space-x-3">
              {user && (
                <motion.div 
                  whileHover={{ scale: 1.1 }} 
                  className="cursor-pointer"
                  onClick={() => navigate('/profile')}
                >
                  <Avatar className="w-9 h-9 bg-gradient-to-r from-purple-500 to-pink-500">
                    <AvatarImage src={user.avatar_url} alt={user.name} />
                    <AvatarFallback className="bg-transparent text-white font-semibold text-sm">
                      {user.name ? user.name.split(' ').map(n => n[0]).join('') : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Background Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed right-0 top-16 bottom-0 w-72 bg-black/90 backdrop-blur-lg border-l border-white/10 z-50 overflow-y-auto"
            >
              <div className="p-4 space-y-2">
                {/* Login/Signup for non-authenticated users */}
                {!user && (
                  <div className="pb-4 mb-4 border-b border-white/10">
                    <Button 
                      onClick={() => {
                        onLoginClick();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Join the Community
                    </Button>
                  </div>
                )}

                {/* Menu Items */}
                {menuItems.filter(item => item.show).map((item) => (
                  <motion.button
                    key={item.path}
                    whileHover={{ x: 4 }}
                    onClick={() => handleMenuItemClick(item.path)}
                    className={cn(
                      "w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors text-left",
                      item.className
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </motion.button>
                ))}

                {/* Donate Button */}
                {user && (
                  <motion.button
                    whileHover={{ x: 4 }}
                    onClick={handleDonateClick}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors text-left"
                  >
                    <Heart className="h-5 w-5" />
                    <span className="font-medium">Donate Now</span>
                  </motion.button>
                )}

                {/* Logout */}
                {user && (
                  <div className="pt-4 mt-4 border-t border-white/10">
                    <motion.button
                      whileHover={{ x: 4 }}
                      onClick={() => {
                        onLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-left"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">Log Out</span>
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileHeader;