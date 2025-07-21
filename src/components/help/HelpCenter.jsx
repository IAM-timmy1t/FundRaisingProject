import React, { useState, useEffect } from 'react';
import { Search, Book, MessageCircle, FileText, ChevronDown, ChevronRight, Home, HelpCircle, Award, DollarSign, Users, Shield, Zap, ExternalLink } from 'lucide-react';

const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  const categories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Home className="w-6 h-6" />,
      description: 'Learn the basics of using Blessed Horizon',
      articles: [
        { id: 1, title: 'Creating Your Account', path: '/docs/user-guide/getting-started/creating-account.md' },
        { id: 2, title: 'Verification Process', path: '/docs/user-guide/getting-started/verification-process.md' },
        { id: 3, title: 'Creating Your First Campaign', path: '/docs/user-guide/getting-started/first-campaign.md' },
      ]
    },
    {
      id: 'campaigns',
      title: 'Campaign Management',
      icon: <Award className="w-6 h-6" />,
      description: 'Everything about creating and managing campaigns',
      articles: [
        { id: 4, title: 'Campaign Best Practices', path: '/docs/user-guide/campaigns/best-practices.md' },
        { id: 5, title: 'Managing Updates', path: '/docs/user-guide/campaigns/managing-updates.md' },
        { id: 6, title: 'Understanding Analytics', path: '/docs/user-guide/campaigns/analytics-guide.md' },
      ]
    },
    {
      id: 'donations',
      title: 'Donations & Payments',
      icon: <DollarSign className="w-6 h-6" />,
      description: 'Learn about making and receiving donations',
      articles: [
        { id: 7, title: 'Making a Donation', path: '/docs/user-guide/donations/making-donations.md' },
        { id: 8, title: 'Payment Methods', path: '/docs/user-guide/donations/payment-methods.md' },
        { id: 9, title: 'Tax Receipts', path: '/docs/user-guide/donations/tax-receipts.md' },
      ]
    },
    {
      id: 'trust',
      title: 'Trust & Verification',
      icon: <Shield className="w-6 h-6" />,
      description: 'Understanding our trust system',
      articles: [
        { id: 10, title: 'Understanding Trust Scores', path: '/docs/user-guide/trust-system/trust-scores.md' },
        { id: 11, title: 'Improving Your Score', path: '/docs/user-guide/trust-system/improving-score.md' },
      ]
    },
  ];

  const faqs = [
    {
      id: 1,
      question: 'How much does Blessed Horizon charge?',
      answer: 'Blessed Horizon charges a platform fee of 2.9% + $0.30 per donation. Payment processing fees (Stripe) are an additional 2.9% + $0.30. For campaigns that raise $10,000, total fees would be approximately $600.',
      category: 'general'
    },
    {
      id: 2,
      question: 'How quickly can I access donated funds?',
      answer: 'Funds are typically available for withdrawal 2-5 business days after a donation is made. Verified accounts have access to express withdrawals (1-2 business days). First-time campaign creators may experience a 7-day hold for security purposes.',
      category: 'donations'
    },
    {
      id: 3,
      question: 'What happens if I don\'t reach my goal?',
      answer: 'Blessed Horizon uses a "Keep It All" funding model. You\'ll receive all funds raised minus fees, regardless of whether you reach your goal. This ensures that every donation helps, even if the full goal isn\'t met.',
      category: 'campaigns'
    },
    {
      id: 4,
      question: 'Can I edit my campaign after launching?',
      answer: 'Yes! You can update your campaign story, add new photos, post updates, and even adjust your goal amount at any time. The only thing you cannot change is the campaign URL and certain details if donations have already been made.',
      category: 'campaigns'
    },
    {
      id: 5,
      question: 'Are donations tax-deductible?',
      answer: 'Donations to registered 501(c)(3) organizations through Blessed Horizon are tax-deductible. Personal campaigns (medical bills, education, etc.) are generally considered personal gifts and are not tax-deductible. Donors receive receipts for all donations.',
      category: 'donations'
    },
    {
      id: 6,
      question: 'How do I increase my trust score?',
      answer: 'Your trust score improves by: completing identity verification, linking social media accounts, providing regular campaign updates, maintaining transparent communication with donors, and having a history of successful campaigns. Responding quickly to donor questions also helps.',
      category: 'trust'
    },
  ];

  const popularArticles = [
    { title: 'How to Write a Compelling Campaign Story', views: '15.2k' },
    { title: 'Marketing Your Campaign on Social Media', views: '12.8k' },
    { title: 'Setting Realistic Funding Goals', views: '10.5k' },
    { title: 'Building Trust with Donors', views: '9.3k' },
    { title: 'Campaign Update Best Practices', views: '8.7k' },
  ];

  // Search functionality
  useEffect(() => {
    if (searchQuery.length > 2) {
      const results = [];
      categories.forEach(category => {
        category.articles.forEach(article => {
          if (article.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({ ...article, category: category.title });
          }
        });
      });
      
      faqs.forEach(faq => {
        if (faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase())) {
          results.push({ ...faq, type: 'faq' });
        }
      });
      
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
            <p className="text-xl mb-8">Search our knowledge base or browse categories below</p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for articles, FAQs, or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
              
              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute mt-2 w-full max-w-2xl bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <a
                      key={index}
                      href={result.path || '#'}
                      className="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 text-left"
                    >
                      <div className="font-medium text-gray-900">
                        {result.type === 'faq' ? result.question : result.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {result.type === 'faq' ? 'FAQ' : result.category}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <a href="#" className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow text-center">
            <Zap className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <h3 className="font-semibold">Quick Start Guide</h3>
          </a>
          <a href="#" className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow text-center">
            <MessageCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <h3 className="font-semibold">Contact Support</h3>
          </a>
          <a href="#" className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow text-center">
            <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <h3 className="font-semibold">Community Forum</h3>
          </a>
          <a href="#" className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow text-center">
            <FileText className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <h3 className="font-semibold">API Documentation</h3>
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Categories and Articles */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
            
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <button
                    onClick={() => setSelectedCategory(
                      selectedCategory === category.id ? null : category.id
                    )}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="text-blue-600 mr-4">{category.icon}</div>
                      <div className="text-left">
                        <h3 className="font-semibold text-lg">{category.title}</h3>
                        <p className="text-sm text-gray-600">{category.description}</p>
                      </div>
                    </div>
                    {selectedCategory === category.id ? 
                      <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    }
                  </button>
                  
                  {selectedCategory === category.id && (
                    <div className="px-6 pb-4">
                      <div className="border-t pt-4 space-y-2">
                        {category.articles.map((article) => (
                          <a
                            key={article.id}
                            href={article.path}
                            className="block px-4 py-2 rounded hover:bg-gray-100 transition-colors"
                          >
                            <span className="text-blue-600 hover:text-blue-800">
                              {article.title}
                            </span>
                            <ExternalLink className="inline-block w-4 h-4 ml-2 text-gray-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* FAQs */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
              
              <div className="space-y-4">
                {faqs.map((faq) => (
                  <div key={faq.id} className="bg-white rounded-lg shadow-md">
                    <button
                      onClick={() => setExpandedFAQ(
                        expandedFAQ === faq.id ? null : faq.id
                      )}
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="font-medium pr-4">{faq.question}</h3>
                      {expandedFAQ === faq.id ? 
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" /> : 
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      }
                    </button>
                    
                    {expandedFAQ === faq.id && (
                      <div className="px-6 pb-4">
                        <p className="text-gray-600">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Popular Articles */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Popular Articles</h3>
              <div className="space-y-3">
                {popularArticles.map((article, index) => (
                  <a
                    key={index}
                    href="#"
                    className="block hover:text-blue-600 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-sm pr-2">{article.title}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">{article.views}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Need More Help */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Need More Help?</h3>
              <p className="text-sm text-gray-700 mb-4">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="space-y-3">
                <a
                  href="mailto:support@blessedhorizon.org"
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  <span>Live Chat Support</span>
                </a>
                <a
                  href="mailto:support@blessedhorizon.org"
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  <span>Submit a Ticket</span>
                </a>
                <div className="text-sm text-gray-600">
                  <p>Support Hours:</p>
                  <p>Mon-Fri: 9 AM - 6 PM EST</p>
                  <p>Sat-Sun: 10 AM - 4 PM EST</p>
                </div>
              </div>
            </div>

            {/* Video Tutorials */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Video Tutorials</h3>
              <div className="space-y-3">
                <a href="#" className="block hover:text-blue-600 transition-colors">
                  <div className="flex items-center">
                    <div className="w-16 h-12 bg-gray-200 rounded mr-3 flex items-center justify-center">
                      <Book className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Getting Started</p>
                      <p className="text-xs text-gray-500">5:23</p>
                    </div>
                  </div>
                </a>
                <a href="#" className="block hover:text-blue-600 transition-colors">
                  <div className="flex items-center">
                    <div className="w-16 h-12 bg-gray-200 rounded mr-3 flex items-center justify-center">
                      <Book className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Campaign Setup</p>
                      <p className="text-xs text-gray-500">8:45</p>
                    </div>
                  </div>
                </a>
                <a href="#" className="block hover:text-blue-600 transition-colors">
                  <div className="flex items-center">
                    <div className="w-16 h-12 bg-gray-200 rounded mr-3 flex items-center justify-center">
                      <Book className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Marketing Tips</p>
                      <p className="text-xs text-gray-500">12:10</p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
