import React from 'react';
import { Link } from 'react-router-dom';

const PaymentSuccessPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="text-green-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">Thank you for your generous donation. Your contribution will make a difference.</p>
          <Link to="/campaigns" className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700">
            Back to Campaigns
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
