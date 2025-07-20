import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { LifeBuoy, Mail, Phone, HelpCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '../ui/use-toast';
import { Link } from 'react-router-dom';

const SupportView = () => {
  const { toast } = useToast();

  const handleFeatureClick = () => {
    toast({
      title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀"
    });
  };

  return (
    <motion.div
      key="support"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-12 flex flex-col items-center justify-center text-center p-4"
    >
      <div className="text-center space-y-4">
        <LifeBuoy className="w-16 h-16 text-teal-400 mx-auto" />
        <h1 className="text-4xl md:text-5xl font-bold text-white">Support Center</h1>
        <p className="text-xl text-blue-200 max-w-2xl mx-auto">
          Need help? We're here for you. Find answers to common questions or get in touch with our support team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-8 text-center transform hover:-translate-y-2 transition-transform duration-300">
          <Mail className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white">Email Support</h2>
          <p className="text-blue-200 mt-2">
            Send us an email and we'll get back to you as soon as possible.
          </p>
          <Button onClick={handleFeatureClick} className="mt-6 bg-blue-500 hover:bg-blue-600">
            Contact via Email
          </Button>
        </Card>
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-8 text-center transform hover:-translate-y-2 transition-transform duration-300">
          <Phone className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white">Phone Support</h2>
          <p className="text-blue-200 mt-2">
            Prefer to talk? Give us a call during business hours for immediate assistance.
          </p>
          <Button onClick={handleFeatureClick} className="mt-6 bg-green-500 hover:bg-green-600">
            Call Us
          </Button>
        </Card>
      </div>

      <section className="w-full max-w-4xl text-left" id="faq">
        <h2 className="text-3xl font-bold mb-6 text-center text-white flex items-center justify-center gap-3">
          <HelpCircle className="w-8 h-8 text-teal-400" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          <details className="bg-white/5 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-white/10">
            <summary className="font-semibold text-lg text-white cursor-pointer list-none flex justify-between items-center">
              How can I donate?
              <span className="text-teal-400 transform transition-transform duration-300 group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-blue-200">You can donate securely using PayPal, Stripe, or bank transfer. Visit our <Link to="/payment/1" className="text-teal-400 underline hover:text-teal-300">donate page</Link> for all options.</p>
          </details>

          <details className="bg-white/5 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-white/10">
            <summary className="font-semibold text-lg text-white cursor-pointer list-none flex justify-between items-center">
              How do I get help or support?
              <span className="text-teal-400 transform transition-transform duration-300 group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-blue-200">Fill out the support request form under the <Link to="/support" className="text-teal-400 underline hover:text-teal-300">Support</Link> tab. Our team will review and respond within 72 hours.</p>
          </details>

          <details className="bg-white/5 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-white/10">
            <summary className="font-semibold text-lg text-white cursor-pointer list-none flex justify-between items-center">
              Can I donate from abroad?
              <span className="text-teal-400 transform transition-transform duration-300 group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-blue-200">Yes! We accept international donations via card and PayPal.</p>
          </details>

          <details className="bg-white/5 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-white/10">
            <summary className="font-semibold text-lg text-white cursor-pointer list-none flex justify-between items-center">
              Are donations tax deductible?
              <span className="text-teal-400 transform transition-transform duration-300 group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-blue-200">Not yet. We're currently not registered for Gift Aid but plan to apply once fully charitable status is granted.</p>
          </details>

          <details className="bg-white/5 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-white/10">
            <summary className="font-semibold text-lg text-white cursor-pointer list-none flex justify-between items-center">
              Where does my money go?
              <span className="text-teal-400 transform transition-transform duration-300 group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-blue-200">100% of donations go toward providing direct aid, outreach, and support services. Financial summaries are published quarterly for transparency.</p>
          </details>
        </div>
      </section>
    </motion.div>
  );
};

export default SupportView;