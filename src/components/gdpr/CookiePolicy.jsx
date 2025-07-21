import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cookie, Info, Settings, Shield } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CookiePolicy = () => {
  const cookieCategories = [
    {
      category: 'Necessary',
      description: 'Essential for website functionality',
      examples: 'Session cookies, security tokens, consent preferences',
      retention: 'Session or up to 1 year',
      canDisable: false
    },
    {
      category: 'Analytics',
      description: 'Help us understand how visitors use our website',
      examples: 'Google Analytics, usage statistics',
      retention: 'Up to 2 years',
      canDisable: true
    },
    {
      category: 'Marketing',
      description: 'Used to track visitors for advertising purposes',
      examples: 'Facebook Pixel, Google Ads',
      retention: 'Up to 1 year',
      canDisable: true
    },
    {
      category: 'Preferences',
      description: 'Remember your preferences and settings',
      examples: 'Language, currency, theme preferences',
      retention: 'Up to 1 year',
      canDisable: true
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <Card className="bg-white/5 backdrop-blur-xl border-white/20">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Cookie className="w-10 h-10 text-yellow-400" />
            <CardTitle className="text-3xl font-bold text-white">Cookie Policy</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 text-gray-200">
          <Alert className="border-blue-500">
            <Info className="h-4 w-4" />
            <AlertDescription>
              This policy explains how we use cookies and similar technologies on our website.
            </AlertDescription>
          </Alert>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">What Are Cookies?</h2>
            <p className="mb-4">
              Cookies are small text files stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Types of Cookies We Use</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Examples</TableHead>
                    <TableHead>Retention</TableHead>
                    <TableHead>Optional</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cookieCategories.map((cookie) => (
                    <TableRow key={cookie.category}>
                      <TableCell className="font-medium">{cookie.category}</TableCell>
                      <TableCell>{cookie.description}</TableCell>
                      <TableCell>{cookie.examples}</TableCell>
                      <TableCell>{cookie.retention}</TableCell>
                      <TableCell>
                        {cookie.canDisable ? (
                          <span className="text-green-400">Yes</span>
                        ) : (
                          <span className="text-red-400">No</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Managing Cookies</h2>
            <p className="mb-4">
              You can manage your cookie preferences at any time through our cookie consent banner or by clicking the button below:
            </p>
            <Button 
              onClick={() => window.dispatchEvent(new CustomEvent('showCookieSettings'))}
              className="bg-gradient-to-r from-cyan-500 to-blue-500"
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Cookie Preferences
            </Button>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">Third-Party Cookies</h2>
            <p>
              Some cookies are placed by third-party services that appear on our pages. We do not control these cookies, and you should refer to the third party's privacy policy for more information.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default CookiePolicy;