import React from 'react';
import Header from './Header';
import Footer from './Footer';
import AnimatedBackground from './AnimatedBackground';

const AdminLayout = ({ children }) => {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-purple-900">
      <AnimatedBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default AdminLayout;
