import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Code2, 
  FileJson, 
  Terminal, 
  BookOpen, 
  Download,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Zap,
  Shield,
  Globe
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const DeveloperPortal = () => {
  const { theme } = useTheme();
  const [copiedEndpoint, setCopiedEndpoint] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');

  const handleCopyEndpoint = (endpoint) => {
    navigator.clipboard.writeText(endpoint);
    setCopiedEndpoint(endpoint);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const apiEndpoints = [
    { 
      method: 'POST', 
      path: '/auth/register', 
      description: 'Register a new user',
      category: 'Authentication'
    },
    { 
      method: 'POST', 
      path: '/auth/login', 
      description: 'Login user',
      category: 'Authentication'
    },
    { 
      method: 'GET', 
      path: '/campaigns', 
      description: 'List all campaigns',
      category: 'Campaigns'
    },
    { 
      method: 'POST', 
      path: '/campaigns', 
      description: 'Create a new campaign',
      category: 'Campaigns'
    },
    { 
      method: 'GET', 
      path: '/campaigns/{id}', 
      description: 'Get campaign details',
      category: 'Campaigns'
    },
    { 
      method: 'POST', 
      path: '/donations', 
      description: 'Make a donation',
      category: 'Donations'
    },
    { 
      method: 'GET', 
      path: '/users/me', 
      description: 'Get current user profile',
      category: 'Users'
    },
    { 
      method: 'GET', 
      path: '/analytics/platform', 
      description: 'Get platform statistics',
      category: 'Analytics'
    }
  ];

  const codeExamples = {
    javascript: `// Install the SDK
npm install @blessed-horizon/api-sdk

// Initialize the client
import { BlessedHorizonAPI } from '@blessed-horizon/api-sdk';

const api = new BlessedHorizonAPI({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Create a campaign
const campaign = await api.campaigns.create({
  title: 'Help Build a School',
  description: 'Raising funds for education...',
  goalAmount: 50000,
  endDate: '2025-12-31',
  category: 'education'
});

// Make a donation
const donation = await api.donations.create({
  campaignId: campaign.id,
  amount: 10000, // in cents
  paymentMethodId: 'pm_stripe_id'
});`,
    python: `# Install the SDK
pip install blessed-horizon

# Initialize the client
from blessed_horizon import BlessedHorizonAPI

api = BlessedHorizonAPI(
    api_key='your-api-key',
    environment='production'
)

# Create a campaign
campaign = api.campaigns.create(
    title='Help Build a School',
    description='Raising funds for education...',
    goal_amount=50000,
    end_date='2025-12-31',
    category='education'
)

# Make a donation
donation = api.donations.create(
    campaign_id=campaign['id'],
    amount=10000,  # in cents
    payment_method_id='pm_stripe_id'
)`,
    curl: `# Register a new user
curl -X POST https://api.blessedhorizon.org/v1/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "fullName": "John Doe"
  }'

# Create a campaign (authenticated)
curl -X POST https://api.blessedhorizon.org/v1/campaigns \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Help Build a School",
    "description": "Raising funds for education...",
    "goalAmount": 50000,
    "endDate": "2025-12-31",
    "category": "education"
  }'`
  };

  const methodColors = {
    GET: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    POST: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    PUT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Developer Portal</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Build powerful applications with the Blessed Horizon API
        </p>
      </div>

      {/* Quick Start */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Quick Start Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">1</Badge>
                Get Your API Key
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sign up for an account and generate your API key from the dashboard
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">2</Badge>
                Install the SDK
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose your preferred language and install our official SDK
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">3</Badge>
                Make Your First Call
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Start building with our comprehensive API endpoints
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="documentation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
          <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
          <TabsTrigger value="examples">Code Examples</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        {/* Documentation Tab */}
        <TabsContent value="documentation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <CardDescription>
                Complete reference for all API endpoints and features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="justify-start gap-2 h-auto p-4"
                  onClick={() => window.open('/docs/api/', '_blank')}
                >
                  <BookOpen className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Interactive API Docs</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Explore endpoints with Swagger UI
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 ml-auto" />
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start gap-2 h-auto p-4"
                  onClick={() => window.open('/docs/api/redoc.html', '_blank')}
                >
                  <FileJson className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">API Reference</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Clean, readable documentation with ReDoc
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 ml-auto" />
                </Button>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Authentication</AlertTitle>
                <AlertDescription>
                  All API requests require authentication via Bearer token in the Authorization header:
                  <code className="block mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                    Authorization: Bearer YOUR_API_KEY
                  </code>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h4 className="font-semibold">Base URL</h4>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                    https://api.blessedhorizon.org/v1
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopyEndpoint('https://api.blessedhorizon.org/v1')}
                  >
                    {copiedEndpoint === 'https://api.blessedhorizon.org/v1' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>
                All available endpoints grouped by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {['Authentication', 'Campaigns', 'Donations', 'Users', 'Analytics'].map(category => (
                    <div key={category} className="space-y-2">
                      <h3 className="font-semibold text-lg mb-3">{category}</h3>
                      <div className="space-y-2">
                        {apiEndpoints
                          .filter(endpoint => endpoint.category === category)
                          .map((endpoint, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                            >
                              <Badge className={methodColors[endpoint.method]}>
                                {endpoint.method}
                              </Badge>
                              <code className="font-mono text-sm flex-1">
                                {endpoint.path}
                              </code>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {endpoint.description}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopyEndpoint(`${endpoint.method} ${endpoint.path}`)}
                              >
                                {copiedEndpoint === `${endpoint.method} ${endpoint.path}` ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Code Examples Tab */}
        <TabsContent value="examples" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Code Examples</CardTitle>
              <CardDescription>
                Get started quickly with code examples in multiple languages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <TabsList className="mb-4">
                  <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                </TabsList>

                {Object.entries(codeExamples).map(([lang, code]) => (
                  <TabsContent key={lang} value={lang}>
                    <div className="relative">
                      <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto">
                        <code>{code}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-100"
                        onClick={() => handleCopyEndpoint(code)}
                      >
                        {copiedEndpoint === code ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Downloads
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FileJson className="h-4 w-4" />
                  OpenAPI Specification (YAML)
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Code2 className="h-4 w-4" />
                  Postman Collection
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Terminal className="h-4 w-4" />
                  CLI Tool
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  SDKs & Libraries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Official SDKs</h4>
                  <div className="space-y-1">
                    <a href="#" className="flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400">
                      JavaScript/TypeScript SDK
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <a href="#" className="flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400">
                      Python SDK
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <a href="#" className="flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400">
                      PHP SDK
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Community Libraries</h4>
                  <div className="space-y-1">
                    <a href="#" className="flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400">
                      Ruby Gem
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <a href="#" className="flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400">
                      Go Package
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Rate Limits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>API Rate Limiting</AlertTitle>
                    <AlertDescription>
                      To ensure fair usage and system stability, API requests are rate limited:
                    </AlertDescription>
                  </Alert>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-1">Standard Tier</h4>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">1,000</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">requests/hour</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-1">Pro Tier</h4>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">10,000</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">requests/hour</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-1">Enterprise</h4>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">Custom</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Contact sales</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Rate limit information is included in response headers: 
                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">X-RateLimit-Limit</code>, 
                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs mx-1">X-RateLimit-Remaining</code>, 
                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">X-RateLimit-Reset</code>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeveloperPortal;