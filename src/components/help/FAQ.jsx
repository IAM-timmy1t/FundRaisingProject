import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

const FAQ = ({ embedded = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openItems, setOpenItems] = useState(new Set());

  const faqCategories = [
    {
      title: 'Getting Started',
      questions: [
        {
          id: 'gs-1',
          question: 'How do I create an account?',
          answer: 'Creating an account is easy! Click the "Sign Up" button in the top right corner, fill in your email and password, verify your email address, and you\'re ready to start making a difference.'
        },
        {
          id: 'gs-2',
          question: 'Is Blessed Horizon free to use?',
          answer: 'Yes! Creating an account and browsing campaigns is completely free. We only charge a small platform fee (2.9% + $0.30) on donations to cover payment processing and platform maintenance.'
        },
        {
          id: 'gs-3',
          question: 'How do I verify my account?',
          answer: 'Account verification involves confirming your email address and, for campaign creators, providing identification documents. This helps us maintain a trusted platform for all users.'
        }
      ]
    },
    {
      title: 'Campaigns',
      questions: [
        {
          id: 'c-1',
          question: 'How do I start a fundraising campaign?',
          answer: 'After creating and verifying your account, click "Create Campaign" from your dashboard. Fill in your campaign details, set a goal, add photos or videos, and submit for approval. Our team typically reviews campaigns within 24-48 hours.'
        },
        {
          id: 'c-2',
          question: 'What happens if I don\'t reach my goal?',
          answer: 'Blessed Horizon uses flexible funding, meaning you receive all donations regardless of whether you reach your goal. This ensures that every contribution makes a difference.'
        },
        {
          id: 'c-3',
          question: 'Can I edit my campaign after it\'s published?',
          answer: 'Yes! You can update your campaign story, add new photos, and post updates anytime. However, changing the goal amount or beneficiary requires re-approval.'
        },
        {
          id: 'c-4',
          question: 'How long can my campaign run?',
          answer: 'Campaigns can run for up to 90 days initially. You can extend your campaign if needed, and even after it ends, you can still receive donations if you keep it active.'
        }
      ]
    },
    {
      title: 'Donations',
      questions: [
        {
          id: 'd-1',
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit and debit cards (Visa, Mastercard, American Express, Discover), Apple Pay, Google Pay, and ACH bank transfers. International cards with 3D Secure are also supported.'
        },
        {
          id: 'd-2',
          question: 'Can I donate anonymously?',
          answer: 'Yes! When making a donation, simply check the "Make this donation anonymous" box. Your name won\'t appear publicly, but you\'ll still receive a receipt for your records.'
        },
        {
          id: 'd-3',
          question: 'Are donations tax-deductible?',
          answer: 'Donations to registered 501(c)(3) organizations are tax-deductible. Personal fundraising campaigns are generally not tax-deductible. We provide receipts for all donations, but please consult your tax advisor.'
        },
        {
          id: 'd-4',
          question: 'How do I get a refund?',
          answer: 'Refunds are available within 60 days for cases of fraud, technical errors, or duplicate charges. Contact support@blessedhorizon.org with your transaction ID and reason for the refund request.'
        }
      ]
    },
    {
      title: 'Trust & Safety',
      questions: [
        {
          id: 'ts-1',
          question: 'How do you verify campaigns are legitimate?',
          answer: 'We use a multi-step verification process including identity verification, document review, story validation, and ongoing monitoring. Our Trust Score system helps donors make informed decisions.'
        },
        {
          id: 'ts-2',
          question: 'What if I suspect a campaign is fraudulent?',
          answer: 'Report it immediately using the "Report Campaign" button on the campaign page. Our team investigates all reports within 24 hours, and funds are frozen during investigation.'
        },
        {
          id: 'ts-3',
          question: 'Is my personal information secure?',
          answer: 'Absolutely. We use bank-level 256-bit SSL encryption, are PCI DSS compliant, and never store your full payment information. We also offer two-factor authentication for additional security.'
        }
      ]
    },
    {
      title: 'Withdrawals',
      questions: [
        {
          id: 'w-1',
          question: 'How do I withdraw funds from my campaign?',
          answer: 'From your dashboard, click "Withdraw Funds," enter the amount you want to withdraw, confirm your bank details, and submit. Funds typically arrive within 2-5 business days.'
        },
        {
          id: 'w-2',
          question: 'Are there any withdrawal fees?',
          answer: 'No! We don\'t charge any fees for withdrawing funds. You receive the full amount donated minus the platform fee that was already deducted from each donation.'
        },
        {
          id: 'w-3',
          question: 'What\'s the minimum withdrawal amount?',
          answer: 'The minimum withdrawal amount is $25. You can withdraw once per day with no maximum limit.'
        }
      ]
    }
  ];

  const toggleItem = (id) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
           q.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const containerClass = embedded ? '' : 'min-h-screen bg-gray-50 py-12';
  const headerClass = embedded ? 'mb-8' : 'max-w-4xl mx-auto px-4 mb-12 text-center';

  return (
    <div className={containerClass}>
      <div className={headerClass}>
        {!embedded && (
          <>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Find answers to common questions about Blessed Horizon
            </p>
          </>
        )}
        
        <div className="max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No questions found matching "{searchTerm}"</p>
          </div>
        ) : (
          filteredCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {category.title}
              </h2>
              <div className="space-y-4">
                {category.questions.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleItem(item.id)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="font-medium text-gray-900 pr-4">
                        {item.question}
                      </h3>
                      {
                        openItems.has(item.id) ? 
                          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" /> : 
                          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      }
                    </button>
                    
                    {openItems.has(item.id) && (
                      <div className="px-6 pb-4">
                        <p className="text-gray-600 leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {!embedded && (
          <div className="mt-12 text-center bg-blue-50 rounded-lg p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Still have questions?
            </h3>
            <p className="text-gray-600 mb-4">
              We're here to help! Contact our support team.
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="/contact"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Contact Support
              </a>
              <a
                href="/help"
                className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-colors border border-blue-600"
              >
                Help Center
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FAQ;