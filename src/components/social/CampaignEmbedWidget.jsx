import { useState, useEffect } from 'react';
import { Code, Copy, Check, Eye, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const embedTypes = {
  widget: {
    name: 'Campaign Widget',
    description: 'Full campaign card with image, progress, and donate button',
    defaultWidth: '350px',
    defaultHeight: '450px'
  },
  progress: {
    name: 'Progress Bar',
    description: 'Compact progress bar showing campaign goal',
    defaultWidth: '100%',
    defaultHeight: '80px'
  },
  button: {
    name: 'Donate Button',
    description: 'Simple donate button that links to campaign',
    defaultWidth: 'auto',
    defaultHeight: 'auto'
  }
};

export default function CampaignEmbedWidget({ campaign }) {
  const [embedType, setEmbedType] = useState('widget');
  const [embedCode, setEmbedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  
  // Embed customization options
  const [options, setOptions] = useState({
    width: embedTypes.widget.defaultWidth,
    height: embedTypes.widget.defaultHeight,
    theme: 'light',
    showTitle: true,
    showProgress: true,
    showDonateButton: true,
    showDescription: false,
    buttonText: 'Donate Now',
    primaryColor: '#3b82f6'
  });

  useEffect(() => {
    generateEmbedCode();
  }, [campaign, embedType, options]);

  const generateEmbedCode = () => {
    if (!campaign) return;

    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      id: campaign.id,
      type: embedType,
      theme: options.theme,
      ...options
    });

    const embedUrl = `${baseUrl}/embed/campaign?${params}`;
    setPreviewUrl(embedUrl);

    let code = '';

    switch (embedType) {
      case 'widget':
        code = `<!-- FundRaising Campaign Widget -->
<iframe 
  src="${embedUrl}"
  width="${options.width}"
  height="${options.height}"
  frameborder="0"
  scrolling="no"
  style="border: none; overflow: hidden;"
  title="${campaign.title} - Fundraising Campaign"
></iframe>`;
        break;

      case 'progress':
        code = `<!-- FundRaising Progress Bar -->
<iframe 
  src="${embedUrl}"
  width="${options.width}"
  height="${options.height}"
  frameborder="0"
  scrolling="no"
  style="border: none; overflow: hidden;"
  title="${campaign.title} - Campaign Progress"
></iframe>`;
        break;

      case 'button':
        code = `<!-- FundRaising Donate Button -->
<a href="${baseUrl}/campaigns/${campaign.id}" 
   target="_blank" 
   rel="noopener noreferrer"
   style="display: inline-block; padding: 12px 24px; background-color: ${options.primaryColor}; color: white; text-decoration: none; border-radius: 6px; font-family: system-ui, -apple-system, sans-serif; font-weight: 500; text-align: center;">
  ${options.buttonText}
</a>`;
        break;
    }

    setEmbedCode(code);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Embed code copied to clipboard!');
    } catch (error) {
      console.error('Error copying embed code:', error);
      toast.error('Failed to copy embed code');
    }
  };

  const handleOptionChange = (key, value) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleTypeChange = (type) => {
    setEmbedType(type);
    setOptions(prev => ({
      ...prev,
      width: embedTypes[type].defaultWidth,
      height: embedTypes[type].defaultHeight
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="w-5 h-5" />
          Embed Campaign
        </CardTitle>
        <CardDescription>
          Add this campaign to your website or blog
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={embedType} onValueChange={handleTypeChange}>
          <TabsList className="grid w-full grid-cols-3">
            {Object.entries(embedTypes).map(([key, type]) => (
              <TabsTrigger key={key} value={key}>
                {type.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(embedTypes).map(([key, type]) => (
            <TabsContent key={key} value={key} className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </div>

              {/* Customization Options */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="width">Width</Label>
                    <Input
                      id="width"
                      value={options.width}
                      onChange={(e) => handleOptionChange('width', e.target.value)}
                      placeholder="e.g., 350px or 100%"
                    />
                  </div>
                  {key !== 'button' && (
                    <div className="space-y-2">
                      <Label htmlFor="height">Height</Label>
                      <Input
                        id="height"
                        value={options.height}
                        onChange={(e) => handleOptionChange('height', e.target.value)}
                        placeholder="e.g., 450px"
                      />
                    </div>
                  )}
                </div>

                {key !== 'button' && (
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select value={options.theme} onValueChange={(value) => handleOptionChange('theme', value)}>
                      <SelectTrigger id="theme">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="auto">Auto (System)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {key === 'widget' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showTitle">Show Title</Label>
                      <Switch
                        id="showTitle"
                        checked={options.showTitle}
                        onCheckedChange={(checked) => handleOptionChange('showTitle', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showProgress">Show Progress</Label>
                      <Switch
                        id="showProgress"
                        checked={options.showProgress}
                        onCheckedChange={(checked) => handleOptionChange('showProgress', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showDonateButton">Show Donate Button</Label>
                      <Switch
                        id="showDonateButton"
                        checked={options.showDonateButton}
                        onCheckedChange={(checked) => handleOptionChange('showDonateButton', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showDescription">Show Description</Label>
                      <Switch
                        id="showDescription"
                        checked={options.showDescription}
                        onCheckedChange={(checked) => handleOptionChange('showDescription', checked)}
                      />
                    </div>
                  </div>
                )}

                {key === 'button' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="buttonText">Button Text</Label>
                      <Input
                        id="buttonText"
                        value={options.buttonText}
                        onChange={(e) => handleOptionChange('buttonText', e.target.value)}
                        placeholder="e.g., Donate Now"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Button Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={options.primaryColor}
                          onChange={(e) => handleOptionChange('primaryColor', e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          value={options.primaryColor}
                          onChange={(e) => handleOptionChange('primaryColor', e.target.value)}
                          placeholder="#3b82f6"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Preview */}
              {key !== 'button' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Preview</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(previewUrl, '_blank')}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Open Preview
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden bg-muted/20" style={{ height: '200px' }}>
                    <iframe
                      src={previewUrl}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      title="Embed Preview"
                    />
                  </div>
                </div>
              )}

              {/* Embed Code */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Embed Code</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? 'Copied!' : 'Copy Code'}
                  </Button>
                </div>
                <Textarea
                  value={embedCode}
                  readOnly
                  className="font-mono text-xs"
                  rows={8}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}