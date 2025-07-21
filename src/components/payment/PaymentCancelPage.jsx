import React from 'react';
import { Link } from 'react-router-dom';

const PaymentCancelPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="text-yellow-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Cancelled</h2>
          <p className="text-gray-600 mb-6">Your payment was cancelled. No charges were made to your account.</p>
          <Link to="/campaigns" className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700">
            Return to Campaigns
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelPage;
