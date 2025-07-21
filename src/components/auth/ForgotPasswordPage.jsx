import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ForgotPasswordModal from '../modals/ForgotPasswordModal';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ForgotPasswordModal 
        isOpen={isOpen} 
        onOpenChange={handleClose}
      />
    </div>
  );
};

export default ForgotPasswordPage;
