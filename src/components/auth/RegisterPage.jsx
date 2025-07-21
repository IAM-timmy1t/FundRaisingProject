import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateAccountModal from '../modals/CreateAccountModal';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    navigate('/');
  };

  const handleSubmit = async (data) => {
    // Handle registration logic here
    console.log('Registration data:', data);
    // After successful registration, navigate to login or dashboard
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <CreateAccountModal 
        isOpen={isOpen} 
        onOpenChange={handleClose}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default RegisterPage;
