import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircleIcon, InfoIcon } from 'lucide-react';
import CampaignCreationWizard from '@/components/campaigns/CampaignCreationWizard';

const CampaignTestPage = () => {
  const [showWizard, setShowWizard] = React.useState(false);

  if (showWizard) {
    return <CampaignCreationWizard />;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Creation Test Page</CardTitle>
          <CardDescription>
            Test the Campaign Creation Wizard functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
            <div className="flex gap-2">
              <InfoIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-2">Campaign System Status:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>✅ Backend API: All Edge Functions created and ready</li>
                  <li>✅ Database Schema: All tables and policies in place</li>
                  <li>✅ Campaign Service: Frontend service layer implemented</li>
                  <li>✅ Campaign Creation Wizard: All 4 steps created</li>
                  <li>⚠️ Dependencies: Need to install date-fns, recharts, react-day-picker</li>
                  <li>⚠️ Storage Bucket: Need to create 'campaign-media' bucket in Supabase</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Quick Actions:</h3>
            <div className="space-y-3">
              <Button
                onClick={() => setShowWizard(true)}
                size="lg"
                className="w-full"
              >
                <PlusCircleIcon className="mr-2 h-5 w-5" />
                Launch Campaign Creation Wizard
              </Button>
              
              <Link to="/campaigns/create">
                <Button variant="outline" className="w-full">
                  Go to Campaign Creation Route
                </Button>
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Required Dependencies:</h3>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm">
              npm install date-fns recharts react-day-picker @radix-ui/react-separator
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Storage Bucket Setup:</h3>
            <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
              <p>Create a new storage bucket in Supabase:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Go to Supabase Dashboard → Storage</li>
                <li>Create new bucket named: <code className="bg-background px-1 rounded">campaign-media</code></li>
                <li>Set bucket to public</li>
                <li>Add policies for authenticated users to upload/delete their own files</li>
              </ol>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Edge Functions Deployment:</h3>
            <div className="bg-muted rounded-lg p-4 text-sm">
              <p className="mb-2">Deploy all Edge Functions to Supabase:</p>
              <code className="block bg-background p-2 rounded">
                supabase functions deploy --no-verify-jwt
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignTestPage;