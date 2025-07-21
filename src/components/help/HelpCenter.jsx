import React, { useState, useEffect } from 'react';
import { Search, Book, MessageCircle, HelpCircle, FileText, ChevronRight, Home, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { documentationService } from '../../services/documentationService';

const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleContent, setArticleContent] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const categories = {
    'getting-started': {
      title: 'Getting Started',
      icon: Book,
      description: 'Everything you need to begin your journey',
      articles: [
        { id: 'creating-account', title: 'Creating Your Account', path: 'getting-started/creating-account.md' },
        { id: 'verification', title: 'Account Verification Process', path: 'getting-started/verification.md' },
        { id: 'first-campaign', title: 'Creating Your First Campaign', path: 'getting-started/first-campaign.md' }
      ]
    },
    'campaigns': {
      title: 'Campaign Management',
      icon: FileText,
      description: 'Create and manage successful campaigns',
      articles: [
        { id: 'create-campaign', title: 'Creating a Campaign', path: 'campaigns/create-campaign.md' },
        { id: 'manage-updates', title: 'Managing Campaign Updates', path: 'campaigns/manage-updates.md' },
        { id: 'analytics', title: 'Understanding Analytics', path: 'campaigns/analytics.md' },
        { id: 'best-practices', title: 'Campaign Best Practices', path: 'campaigns/best-practices.md' }
      ]
    },
    'donations': {
      title: 'Donations',
      icon: MessageCircle,
      description: 'Making and receiving donations',
      articles: [
        { id: 'making-donations', title: 'How to Make Donations', path: 'donations/making-donations.md' },
        { id: 'recurring-donations', title: 'Setting Up Recurring Donations', path: 'donations/recurring.md' },
        { id: 'withdrawals', title: 'Withdrawing Funds', path: 'donations/withdrawals.md' },
        { id: 'tax-info', title: 'Tax Information', path: 'donations/tax-info.md' }
      ]
    },
    'faq': {
      title: 'FAQ',
      icon: HelpCircle,
      description: 'Frequently asked questions',
      articles: [
        { id: 'general-faq', title: 'General FAQ', path: 'faq/general-faq.md' },
        { id: 'payment-faq', title: 'Payment Questions', path: 'faq/payment-faq.md' },
        { id: 'security-faq', title: 'Security & Privacy', path: 'faq/security-faq.md' },
        { id: 'troubleshooting', title: 'Troubleshooting', path: 'faq/troubleshooting.md' }
      ]
    }
  };

  const popularArticles = [
    { title: 'Creating Your Account', category: 'getting-started', id: 'creating-account' },
    { title: 'How to Make Donations', category: 'donations', id: 'making-donations' },
    { title: 'Creating a Campaign', category: 'campaigns', id: 'create-campaign' },
    { title: 'General FAQ', category: 'faq', id: 'general-faq' }
  ];

  // Load article content
  const loadArticle = async (path) => {
    setLoading(true);
    try {
      const content = await documentationService.fetchDocument(path);
      setArticleContent(content);
    } catch (error) {
      console.error('Error loading article:', error);
      setArticleContent('# Article Not Found\n\nSorry, this article is not available yet.');
    }
    setLoading(false);
  };

  // Search functionality
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }

    // Simple search implementation
    const results = [];
    Object.entries(categories).forEach(([catKey, category]) => {
      category.articles.forEach(article => {
        if (article.title.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            ...article,
            category: catKey,
            categoryTitle: category.title
          });
        }
      });
    });
    setSearchResults(results);
  };

  const selectArticle = (categoryKey, article) => {
    setSelectedCategory(categoryKey);
    setSelectedArticle(article);
    loadArticle(article.path);
    setSearchQuery('');
    setSearchResults([]);
  };

  const breadcrumbs = () => {
    const items = [{ label: 'Help Center', onClick: () => { setSelectedCategory(null); setSelectedArticle(null); }}];
    
    if (selectedCategory) {
      items.push({
        label: categories[selectedCategory].title,
        onClick: () => setSelectedArticle(null)
      });
    }
    
    if (selectedArticle) {
      items.push({ label: selectedArticle.title });
    }
    
    return items;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
            <div className="max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for articles..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                />
              </div>
              
              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute mt-2 w-full max-w-xl bg-white rounded-lg shadow-lg z-10">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => selectArticle(result.category, result)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 text-gray-900"
                    >
                      <div className="font-medium">{result.title}</div>
                      <div className="text-sm text-gray-500">{result.categoryTitle}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        {(selectedCategory || selectedArticle) && (
          <nav className="mb-8">
            <ol className="flex items-center space-x-2 text-sm">
              {breadcrumbs().map((item, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />}
                  {item.onClick ? (
                    <button
                      onClick={item.onClick}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span className="text-gray-900">{item.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Main Content */}
        {!selectedCategory && !selectedArticle ? (
          // Category Grid
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {Object.entries(categories).map(([key, category]) => {
                const Icon = category.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all text-left group"
                  >
                    <Icon className="w-8 h-8 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="font-semibold text-lg mb-2">{category.title}</h3>
                    <p className="text-gray-600 text-sm">{category.description}</p>
                    <p className="text-blue-600 text-sm mt-3 flex items-center">
                      {category.articles.length} articles
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Popular Articles */}
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-2xl font-bold mb-6">Popular Articles</h2>
              <div className="space-y-4">
                {popularArticles.map((article, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const cat = categories[article.category];
                      const art = cat.articles.find(a => a.id === article.id);
                      selectArticle(article.category, art);
                    }}
                    className="w-full text-left p-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900">{article.title}</h4>
                      <p className="text-sm text-gray-500">{categories[article.category].title}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : !selectedArticle ? (
          // Category Articles List
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex items-center mb-6">
              {React.createElement(categories[selectedCategory].icon, {
                className: "w-8 h-8 text-blue-600 mr-3"
              })}
              <h2 className="text-2xl font-bold">{categories[selectedCategory].title}</h2>
            </div>
            <div className="space-y-4">
              {categories[selectedCategory].articles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => selectArticle(selectedCategory, article)}
                  className="w-full text-left p-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <h4 className="font-medium text-gray-900">{article.title}</h4>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Article Content
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-8">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <article className="prose prose-blue max-w-none">
                  <ReactMarkdown>{articleContent}</ReactMarkdown>
                </article>
              )}
            </div>
            
            {/* Article Footer */}
            <div className="border-t px-8 py-6 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600">Was this article helpful?</p>
                  <div className="flex gap-2 mt-2">
                    <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                      Yes
                    </button>
                    <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                      No
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Still need help?</p>
                  <Link to="/contact" className="text-blue-600 hover:text-blue-800 font-medium">
                    Contact Support
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contact Support Banner */}
      <div className="bg-blue-50 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Can't find what you're looking for?
          </h3>
          <p className="text-gray-600 mb-6">
            Our support team is here to help you 24/7
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/contact"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Contact Support
            </Link>
            <a
              href="mailto:support@blessedhorizon.org"
              className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-colors border border-blue-600"
            >
              Email Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;