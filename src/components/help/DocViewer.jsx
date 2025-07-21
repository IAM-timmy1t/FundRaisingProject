import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronRight, Home, Book, Search, Printer, Share2, Bookmark, ThumbsUp, ThumbsDown } from 'lucide-react';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

const DocViewer = ({ docPath }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toc, setToc] = useState([]);
  const [activeSection, setActiveSection] = useState('');
  const [helpful, setHelpful] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);

  // Load document content
  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        // In a real app, this would fetch from your server
        const response = await fetch(docPath);
        if (!response.ok) throw new Error('Document not found');
        const text = await response.text();
        setContent(text);
        
        // Extract table of contents from headers
        const headers = text.match(/^#{1,3} .+$/gm) || [];
        const tocItems = headers.map((header) => {
          const level = header.match(/^#+/)[0].length;
          const title = header.replace(/^#+\s+/, '');
          const id = title.toLowerCase().replace(/\s+/g, '-');
          return { level, title, id };
        });
        setToc(tocItems);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (docPath) {
      loadDocument();
    }
  }, [docPath]);

  // Track scroll position for active section highlighting
  useEffect(() => {
    const handleScroll = () => {
      const headers = document.querySelectorAll('h1, h2, h3');
      let current = '';
      
      headers.forEach((header) => {
        const rect = header.getBoundingClientRect();
        if (rect.top < 100) {
          current = header.id;
        }
      });
      
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Copy URL to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    // In a real app, this would save to user's bookmarks
  };

  const handleHelpful = (wasHelpful) => {
    setHelpful(wasHelpful);
    // In a real app, this would send feedback to server
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <a href="/help" className="text-blue-600 hover:text-blue-800">
            Return to Help Center
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center text-sm">
            <a href="/" className="text-gray-500 hover:text-gray-700">
              <Home className="w-4 h-4" />
            </a>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <a href="/help" className="text-gray-500 hover:text-gray-700">
              Help Center
            </a>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <span className="text-gray-900">Article</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Table of Contents - Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Table of Contents</h3>
              <nav className="space-y-1">
                {toc.map((item, index) => (
                  <a
                    key={index}
                    href={`#${item.id}`}
                    className={`block py-1 text-sm transition-colors ${
                      activeSection === item.id
                        ? 'text-blue-600 font-medium'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                  >
                    {item.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 bg-white rounded-lg shadow-md p-8">
            {/* Action Bar */}
            <div className="flex justify-between items-center mb-8 pb-4 border-b">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handlePrint}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="Print"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  onClick={handleShare}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="Share"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleBookmark}
                  className={`transition-colors ${
                    bookmarked
                      ? 'text-yellow-500 hover:text-yellow-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Bookmark"
                >
                  <Bookmark className="w-5 h-5" fill={bookmarked ? 'currentColor' : 'none'} />
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search in document..."
                  className="px-3 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Document Content */}
            <article className="prose prose-lg max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  h1: ({ children, ...props }) => (
                    <h1 id={children.toString().toLowerCase().replace(/\s+/g, '-')} {...props}>
                      {children}
                    </h1>
                  ),
                  h2: ({ children, ...props }) => (
                    <h2 id={children.toString().toLowerCase().replace(/\s+/g, '-')} {...props}>
                      {children}
                    </h2>
                  ),
                  h3: ({ children, ...props }) => (
                    <h3 id={children.toString().toLowerCase().replace(/\s+/g, '-')} {...props}>
                      {children}
                    </h3>
                  ),
                  a: ({ href, children, ...props }) => {
                    const isExternal = href && (href.startsWith('http') || href.startsWith('https'));
                    return (
                      <a
                        href={href}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        className="text-blue-600 hover:text-blue-800 underline"
                        {...props}
                      >
                        {children}
                      </a>
                    );
                  },
                  code: ({ inline, className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props}>
                        {children}
                      </code>
                    );
                  },
                  img: ({ src, alt, ...props }) => (
                    <img
                      src={src}
                      alt={alt}
                      className="rounded-lg shadow-md my-4"
                      {...props}
                    />
                  ),
                  blockquote: ({ children, ...props }) => (
                    <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4" {...props}>
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </article>

            {/* Feedback Section */}
            <div className="mt-12 pt-8 border-t">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-4">Was this article helpful?</h3>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => handleHelpful(true)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                      helpful === true
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <ThumbsUp className="w-5 h-5" />
                    <span>Yes</span>
                  </button>
                  <button
                    onClick={() => handleHelpful(false)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                      helpful === false
                        ? 'bg-red-50 border-red-500 text-red-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <ThumbsDown className="w-5 h-5" />
                    <span>No</span>
                  </button>
                </div>
                
                {helpful !== null && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">
                      {helpful
                        ? 'Great! Thanks for your feedback.'
                        : 'Sorry to hear that. Please contact support for more help.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Related Articles */}
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Related Articles</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <a href="#" className="block p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <h4 className="font-medium text-blue-600 mb-1">Setting Campaign Goals</h4>
                    <p className="text-sm text-gray-600">Learn how to set realistic funding targets</p>
                  </a>
                  <a href="#" className="block p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <h4 className="font-medium text-blue-600 mb-1">Campaign Updates</h4>
                    <p className="text-sm text-gray-600">Keep donors engaged with regular updates</p>
                  </a>
                  <a href="#" className="block p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <h4 className="font-medium text-blue-600 mb-1">Marketing Your Campaign</h4>
                    <p className="text-sm text-gray-600">Strategies to reach more potential donors</p>
                  </a>
                </div>
              </div>
            </div>
          </main>

          {/* Right Sidebar - Contact Support */}
          <aside className="hidden xl:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-semibold mb-3">Need Help?</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Our support team is available to assist you.
                </p>
                <div className="space-y-3">
                  <a
                    href="#"
                    className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <Book className="w-4 h-4 mr-2" />
                    Browse all articles
                  </a>
                  <a
                    href="#"
                    className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search help center
                  </a>
                </div>
                <hr className="my-4" />
                <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  Contact Support
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default DocViewer;
