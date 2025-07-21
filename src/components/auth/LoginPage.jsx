import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../modals/AuthModal';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthModal 
        isOpen={isOpen} 
        onOpenChange={handleClose}
      />
    </div>
  );
};

export default LoginPage;
