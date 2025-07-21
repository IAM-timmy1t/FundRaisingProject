import React, { useState } from 'react';
import { Mail, MessageCircle, Phone, Clock, Send, CheckCircle } from 'lucide-react';

const ContactSupport = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: '',
    campaignUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'campaign', label: 'Campaign Issue' },
    { value: 'donation', label: 'Donation Question' },
    { value: 'withdrawal', label: 'Withdrawal Help' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'trust-safety', label: 'Trust & Safety' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // In production, this would send to your support system
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting support request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Request Submitted!
            </h2>
            <p className="text-gray-600 mb-6">
              We've received your support request. Our team will respond within 24 hours.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Your ticket number is: <strong>#{Date.now().toString().slice(-6)}</strong>
            </p>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setFormData({
                  name: '',
                  email: '',
                  subject: '',
                  category: 'general',
                  message: '',
                  campaignUrl: ''
                });
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Contact Support
          </h1>
          <p className="text-xl text-gray-600">
            We're here to help! Reach out to us anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Methods */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Contact Methods</h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Mail className="w-5 h-5 text-blue-600 mt-1 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-gray-600 text-sm">support@blessedhorizon.org</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <MessageCircle className="w-5 h-5 text-blue-600 mt-1 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Live Chat</p>
                    <p className="text-gray-600 text-sm">Available on all pages</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Phone className="w-5 h-5 text-blue-600 mt-1 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Phone</p>
                    <p className="text-gray-600 text-sm">1-800-BLESSED (Coming Soon)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Support Hours</h3>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Monday - Friday</p>
                    <p className="text-gray-600 text-sm">9:00 AM - 6:00 PM EST</p>
                  </div>
                </div>
                
                <div className="ml-8">
                  <p className="font-medium text-gray-900">Saturday - Sunday</p>
                  <p className="text-gray-600 text-sm">10:00 AM - 4:00 PM EST</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mt-4">
                Emergency support available 24/7 for urgent campaign issues
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Send us a message
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of your issue"
                  />
                </div>

                {formData.category === 'campaign' && (
                  <div>
                    <label htmlFor="campaignUrl" className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign URL
                    </label>
                    <input
                      type="url"
                      id="campaignUrl"
                      name="campaignUrl"
                      value={formData.campaignUrl}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://blessedhorizon.org/campaign/..."
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Please describe your issue or question in detail..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    <span className="text-red-500">*</span> Required fields
                  </p>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 bg-blue-50 rounded-lg p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
            Quick Resources
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/help"
              className="text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <h4 className="font-medium text-blue-600">Help Center</h4>
              <p className="text-sm text-gray-600 mt-1">Browse help articles</p>
            </a>
            <a
              href="/faq"
              className="text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <h4 className="font-medium text-blue-600">FAQs</h4>
              <p className="text-sm text-gray-600 mt-1">Common questions</p>
            </a>
            <a
              href="/developers"
              className="text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <h4 className="font-medium text-blue-600">API Docs</h4>
              <p className="text-sm text-gray-600 mt-1">Developer resources</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSupport;