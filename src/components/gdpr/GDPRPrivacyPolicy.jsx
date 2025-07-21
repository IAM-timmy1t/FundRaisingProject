import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Info, Mail, Globe, Lock, Users, FileText, AlertCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const GDPRPrivacyPolicy = () => {
  const lastUpdated = '2025-07-21';
  const companyInfo = {
    name: 'Blessed Horizon',
    address: 'Data Controller Address',
    email: 'privacy@blessed-horizon.com',
    dpo: 'dpo@blessed-horizon.com'
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <Card className="bg-white/5 backdrop-blur-xl border-white/20">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Shield className="w-10 h-10 text-green-400" />
            <div>
              <CardTitle className="text-3xl font-bold text-white">Privacy Policy</CardTitle>
              <p className="text-blue-300 mt-2">GDPR Compliant - Last Updated: {lastUpdated}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-gray-200">
          <Alert className="mb-8 border-blue-500">
            <Info className="h-4 w-4" />
            <AlertDescription>
              This privacy policy explains how we collect, use, and protect your personal data in compliance with the General Data Protection Regulation (GDPR).
            </AlertDescription>
          </Alert>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="controller">
              <AccordionTrigger className="text-lg font-semibold">1. Data Controller Information</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p><strong>Company:</strong> {companyInfo.name}</p>
                <p><strong>Address:</strong> {companyInfo.address}</p>
                <p><strong>Email:</strong> <a href={`mailto:${companyInfo.email}`} className="text-cyan-400 hover:underline">{companyInfo.email}</a></p>
                <p><strong>Data Protection Officer:</strong> <a href={`mailto:${companyInfo.dpo}`} className="text-cyan-400 hover:underline">{companyInfo.dpo}</a></p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="data-collection">
              <AccordionTrigger className="text-lg font-semibold">2. What Data We Collect</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Personal Information:</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Name and contact details (email, phone number)</li>
                    <li>Account credentials</li>
                    <li>Payment information (processed securely via Stripe)</li>
                    <li>Profile information (bio, profile picture)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Campaign Information:</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Campaign details and descriptions</li>
                    <li>Media files and documentation</li>
                    <li>Updates and progress reports</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Technical Information:</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>IP address and device information</li>
                    <li>Browser type and version</li>
                    <li>Usage data and analytics (if consented)</li>
                    <li>Cookies and similar technologies</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="legal-basis">
              <AccordionTrigger className="text-lg font-semibold">3. Legal Basis for Processing</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p>We process your personal data under the following legal bases:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Contract:</strong> To provide our crowdfunding platform services</li>
                  <li><strong>Consent:</strong> For marketing communications and analytics</li>
                  <li><strong>Legitimate Interests:</strong> For fraud prevention and platform security</li>
                  <li><strong>Legal Obligation:</strong> To comply with financial regulations and tax laws</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="your-rights">
              <AccordionTrigger className="text-lg font-semibold">4. Your Rights Under GDPR</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p>You have the following rights regarding your personal data:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Right to Rectification:</strong> Correct inaccurate personal data</li>
                  <li><strong>Right to Erasure:</strong> Request deletion of your personal data</li>
                  <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
                  <li><strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
                  <li><strong>Right to Object:</strong> Object to certain types of processing</li>
                  <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
                </ul>
                <div className="mt-4">
                  <Link to="/account/privacy">
                    <Button className="bg-gradient-to-r from-cyan-500 to-blue-500">
                      Exercise Your Rights
                    </Button>
                  </Link>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default GDPRPrivacyPolicy;