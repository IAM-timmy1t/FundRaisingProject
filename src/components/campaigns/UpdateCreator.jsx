import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Image, 
  Video, 
  Receipt, 
  Upload, 
  X, 
  DollarSign, 
  Plus, 
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { campaignService } from '@/lib/campaignService';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const UpdateCreator = ({ campaign, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef(null);
  const receiptInputRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    update_type: 'TEXT',
    amount_spent: 0,
    is_milestone: false,
    milestone_percentage: 0,
    scheduled_for: null
  });

  // Media state
  const [mediaFiles, setMediaFiles] = useState([]);
  const [receiptFiles, setReceiptFiles] = useState([]);
  const [uploadedMediaUrls, setUploadedMediaUrls] = useState([]);
  const [uploadedReceiptUrls, setUploadedReceiptUrls] = useState([]);

  // Spending breakdown state
  const [spendingItems, setSpendingItems] = useState([]);
  const [newSpendItem, setNewSpendItem] = useState({
    description: '',
    amount: '',
    receipt_index: null
  });

  // Calculate remaining funds
  const totalSpent = spendingItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const remainingFunds = campaign.raised_amount - (campaign.withdrawn_amount || 0) - totalSpent;

  // Update type configuration
  const updateTypes = [
    { value: 'TEXT', label: 'Text Update', icon: FileText },
    { value: 'PHOTO', label: 'Photo Update', icon: Image },
    { value: 'VIDEO', label: 'Video Update', icon: Video },
    { value: 'RECEIPT', label: 'Receipt Update', icon: Receipt }
  ];

  const handleTypeChange = (type) => {
    setFormData({ ...formData, update_type: type });
  };

  const handleMediaUpload = async (files, type = 'media') => {
    const uploadPromises = [];
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (const file of files) {
      if (file.size > maxSize) {
        toast.error(`File ${file.name} exceeds 10MB limit`);
        continue;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${campaign.id}/${type}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      uploadPromises.push(
        supabase.storage
          .from('campaign-media')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })
      );
    }

    setUploadingMedia(true);
    try {
      const results = await Promise.all(uploadPromises);
      const urls = [];

      for (const result of results) {
        if (result.error) {
          toast.error(`Upload failed: ${result.error.message}`);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('campaign-media')
            .getPublicUrl(result.data.path);
          urls.push(publicUrl);
        }
      }

      if (type === 'media') {
        setUploadedMediaUrls([...uploadedMediaUrls, ...urls]);
      } else {
        setUploadedReceiptUrls([...uploadedReceiptUrls, ...urls]);
      }

      toast.success(`${urls.length} file(s) uploaded successfully`);
    } catch (error) {
      toast.error('Upload failed');
      console.error('Upload error:', error);
    } finally {
      setUploadingMedia(false);
    }
  };

  const removeMedia = (index, type = 'media') => {
    if (type === 'media') {
      setUploadedMediaUrls(uploadedMediaUrls.filter((_, i) => i !== index));
    } else {
      setUploadedReceiptUrls(uploadedReceiptUrls.filter((_, i) => i !== index));
    }
  };

  const addSpendingItem = () => {
    if (!newSpendItem.description || !newSpendItem.amount) {
      toast.error('Please enter description and amount');
      return;
    }

    setSpendingItems([
      ...spendingItems,
      {
        ...newSpendItem,
        amount: parseFloat(newSpendItem.amount)
      }
    ]);

    setNewSpendItem({
      description: '',
      amount: '',
      receipt_index: null
    });
  };

  const removeSpendingItem = (index) => {
    setSpendingItems(spendingItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      toast.error('Please enter an update title');
      return;
    }

    if (!formData.content.trim()) {
      toast.error('Please enter update content');
      return;
    }

    if (totalSpent > remainingFunds) {
      toast.error('Spending exceeds available funds');
      return;
    }

    setLoading(true);
    try {
      // Build update data
      const updateData = {
        campaign_id: campaign.id,
        title: formData.title,
        content: formData.content,
        update_type: formData.update_type,
        amount_spent: totalSpent,
        spending_breakdown: spendingItems,
        remaining_funds: remainingFunds - totalSpent,
        media_urls: uploadedMediaUrls,
        receipt_urls: uploadedReceiptUrls,
        is_milestone: formData.is_milestone,
        milestone_percentage: formData.is_milestone ? formData.milestone_percentage : null,
        scheduled_for: formData.scheduled_for
      };

      const result = await campaignService.createCampaignUpdate(updateData);
      
      toast.success('Update posted successfully!');
      if (onSuccess) onSuccess(result);
    } catch (error) {
      console.error('Error creating update:', error);
      toast.error('Failed to create update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create Campaign Update</CardTitle>
        <CardDescription>
          Keep your donors informed about your progress and spending
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Update Type Selection */}
        <div className="space-y-2">
          <Label>Update Type</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {updateTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Button
                  key={type.value}
                  type="button"
                  variant={formData.update_type === type.value ? 'default' : 'outline'}
                  className="flex items-center gap-2"
                  onClick={() => handleTypeChange(type.value)}
                >
                  <Icon className="w-4 h-4" />
                  {type.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Update Title*</Label>
          <Input
            id="title"
            placeholder="e.g., Week 2 Progress Update"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            {formData.title.length}/100 characters
          </p>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="content">Update Content*</Label>
          <Textarea
            id="content"
            placeholder="Share your progress, challenges, and gratitude..."
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={8}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Be transparent and specific about your progress and spending
          </p>
        </div>

        {/* Media Upload */}
        {(formData.update_type === 'PHOTO' || formData.update_type === 'VIDEO') && (
          <div className="space-y-4">
            <Separator />
            <div className="space-y-2">
              <Label>Upload Media</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={formData.update_type === 'PHOTO' ? 'image/*' : 'video/*'}
                  onChange={(e) => handleMediaUpload(Array.from(e.target.files))}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingMedia}
                >
                  {uploadingMedia ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Choose Files
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Max 10MB per file
                </p>
              </div>

              {/* Uploaded Media Preview */}
              {uploadedMediaUrls.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {uploadedMediaUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      {formData.update_type === 'PHOTO' ? (
                        <img
                          src={url}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <video
                          src={url}
                          className="w-full h-24 object-cover rounded-lg"
                          controls
                        />
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeMedia(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Spending Transparency */}
        <div className="space-y-4">
          <Separator />
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Spending Transparency
            </Label>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Adding spending details with receipts improves your trust score
              </AlertDescription>
            </Alert>

            {/* Add Spending Item */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Input
                    placeholder="What did you spend on?"
                    value={newSpendItem.description}
                    onChange={(e) => setNewSpendItem({ ...newSpendItem, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={newSpendItem.amount}
                    onChange={(e) => setNewSpendItem({ ...newSpendItem, amount: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={addSpendingItem}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Spending Items List */}
            {spendingItems.length > 0 && (
              <div className="space-y-2">
                {spendingItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {campaign.currency} {item.amount.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSpendingItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="font-medium">Total Spent:</span>
                  <span className="text-lg font-bold">
                    {campaign.currency} {totalSpent.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Receipt Upload */}
            <div className="space-y-2">
              <Label>Upload Receipts</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <input
                  ref={receiptInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={(e) => handleMediaUpload(Array.from(e.target.files), 'receipts')}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => receiptInputRef.current?.click()}
                  disabled={uploadingMedia}
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Add Receipts
                </Button>
              </div>

              {uploadedReceiptUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {uploadedReceiptUrls.map((url, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="pr-1"
                    >
                      Receipt {index + 1}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => removeMedia(index, 'receipts')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Milestone Update */}
        <div className="space-y-4">
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="milestone">Milestone Update</Label>
              <p className="text-sm text-muted-foreground">
                Mark this as a significant campaign milestone
              </p>
            </div>
            <Switch
              id="milestone"
              checked={formData.is_milestone}
              onCheckedChange={(checked) => setFormData({ ...formData, is_milestone: checked })}
            />
          </div>

          {formData.is_milestone && (
            <div className="space-y-2">
              <Label>Milestone Progress</Label>
              <div className="space-y-2">
                <Progress value={formData.milestone_percentage} className="h-3" />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.milestone_percentage}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    milestone_percentage: parseInt(e.target.value) || 0 
                  })}
                  className="w-24"
                />
              </div>
            </div>
          )}
        </div>

        {/* Schedule Update */}
        <div className="space-y-4">
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="schedule">Schedule Update (Optional)</Label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input
                id="schedule"
                type="datetime-local"
                value={formData.scheduled_for || ''}
                onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value || null })}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Leave empty to post immediately
            </p>
          </div>
        </div>

        {/* Funds Summary */}
        <Alert className={remainingFunds < 0 ? 'border-destructive' : ''}>
          <DollarSign className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Raised Amount:</span>
                <span className="font-medium">{campaign.currency} {campaign.raised_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Previously Withdrawn:</span>
                <span className="font-medium">- {campaign.currency} {(campaign.withdrawn_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>This Update Spending:</span>
                <span className="font-medium">- {campaign.currency} {totalSpent.toFixed(2)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>Remaining Funds:</span>
                <span className={remainingFunds < 0 ? 'text-destructive' : 'text-green-600'}>
                  {campaign.currency} {(remainingFunds - totalSpent).toFixed(2)}
                </span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>

      <CardFooter className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !formData.title || !formData.content}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              {formData.scheduled_for ? 'Schedule Update' : 'Post Update'}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default UpdateCreator;
