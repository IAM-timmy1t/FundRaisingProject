import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { campaignService } from '@/lib/campaignService';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  FileText, Image, Video, Receipt, Upload, Plus, Trash2, 
  DollarSign, Calendar, AlertCircle, CheckCircle, Loader2 
} from 'lucide-react';

const UpdateCreationForm = ({ campaignId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  // Form state
  const [updateData, setUpdateData] = useState({
    title: '',
    content: '',
    update_type: 'TEXT',
    amount_spent: '',
    spending_breakdown: [],
    media_urls: [],
    receipt_urls: [],
    is_milestone: false,
    milestone_percentage: '',
    scheduled_for: ''
  });

  // Spending item state
  const [newSpendItem, setNewSpendItem] = useState({
    description: '',
    amount: '',
    receipt_url: ''
  });

  const updateTypes = [
    { value: 'TEXT', label: 'Text Update', icon: FileText },
    { value: 'PHOTO', label: 'Photo Update', icon: Image },
    { value: 'VIDEO', label: 'Video Update', icon: Video },
    { value: 'RECEIPT', label: 'Financial Update', icon: Receipt }
  ];

  const handleInputChange = (field, value) => {
    setUpdateData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSpendItem = () => {
    if (!newSpendItem.description || !newSpendItem.amount) {
      toast.error('Please enter description and amount for the expense');
      return;
    }

    const amount = parseFloat(newSpendItem.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setUpdateData(prev => ({
      ...prev,
      spending_breakdown: [...prev.spending_breakdown, { ...newSpendItem, amount }]
    }));

    setNewSpendItem({ description: '', amount: '', receipt_url: '' });
  };

  const handleRemoveSpendItem = (index) => {
    setUpdateData(prev => ({
      ...prev,
      spending_breakdown: prev.spending_breakdown.filter((_, i) => i !== index)
    }));
  };

  const calculateTotalSpent = () => {
    return updateData.spending_breakdown.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleMediaUpload = async (event, type) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingMedia(true);
    const uploadedUrls = [];

    try {
      for (const file of files) {
        // Validate file type
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (type === 'media' && !isImage && !isVideo) {
          toast.error(`${file.name} is not a valid image or video file`);
          continue;
        }

        if (type === 'receipt' && !isImage && file.type !== 'application/pdf') {
          toast.error(`${file.name} is not a valid receipt file (image or PDF)`);
          continue;
        }

        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${campaignId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const bucketName = type === 'receipt' ? 'receipts' : 'update-media';

        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(fileName, file);

        if (error) {
          console.error('Upload error:', error);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      // Update form state
      if (type === 'media') {
        handleInputChange('media_urls', [...updateData.media_urls, ...uploadedUrls]);
      } else {
        handleInputChange('receipt_urls', [...updateData.receipt_urls, ...uploadedUrls]);
      }

      toast.success(`Uploaded ${uploadedUrls.length} file(s)`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleRemoveMedia = (index, type) => {
    if (type === 'media') {
      handleInputChange('media_urls', updateData.media_urls.filter((_, i) => i !== index));
    } else {
      handleInputChange('receipt_urls', updateData.receipt_urls.filter((_, i) => i !== index));
    }
  };

  const validateForm = () => {
    if (!updateData.title.trim()) {
      toast.error('Please enter a title for your update');
      return false;
    }

    if (!updateData.content.trim()) {
      toast.error('Please enter content for your update');
      return false;
    }

    if (updateData.update_type === 'PHOTO' && updateData.media_urls.length === 0) {
      toast.error('Please upload at least one photo');
      return false;
    }

    if (updateData.update_type === 'VIDEO' && updateData.media_urls.length === 0) {
      toast.error('Please upload at least one video');
      return false;
    }

    if (updateData.update_type === 'RECEIPT' && updateData.spending_breakdown.length === 0) {
      toast.error('Please add at least one expense item');
      return false;
    }

    if (updateData.is_milestone && !updateData.milestone_percentage) {
      toast.error('Please enter milestone percentage');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Calculate total spent from breakdown
      const totalSpent = calculateTotalSpent();
      
      const updatePayload = {
        campaign_id: campaignId,
        ...updateData,
        amount_spent: totalSpent || parseFloat(updateData.amount_spent) || 0,
        milestone_percentage: updateData.is_milestone ? parseInt(updateData.milestone_percentage) : null,
        scheduled_for: updateData.scheduled_for || null
      };

      const result = await campaignService.createCampaignUpdate(updatePayload);
      
      toast.success('Update posted successfully!');
      if (onSuccess) onSuccess(result);
    } catch (error) {
      console.error('Error creating update:', error);
      toast.error(error.message || 'Failed to create update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post Campaign Update</CardTitle>
        <CardDescription>
          Keep your supporters informed about your progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Update Type Selection */}
          <div className="space-y-2">
            <Label>Update Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {updateTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleInputChange('update_type', type.value)}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    updateData.update_type === type.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <type.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title">Update Title</Label>
            <Input
              id="title"
              placeholder="e.g., Week 1 Progress Report"
              value={updateData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
            />
          </div>

          {/* Content Textarea */}
          <div className="space-y-2">
            <Label htmlFor="content">Update Content</Label>
            <Textarea
              id="content"
              placeholder="Share your progress, challenges, and gratitude..."
              value={updateData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              rows={6}
              required
            />
            <p className="text-sm text-muted-foreground">
              Be transparent and specific. Your supporters appreciate detailed updates.
            </p>
          </div>

          {/* Media Upload */}
          {['PHOTO', 'VIDEO'].includes(updateData.update_type) && (
            <div className="space-y-2">
              <Label>Upload Media</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept={updateData.update_type === 'PHOTO' ? 'image/*' : 'video/*'}
                  multiple
                  onChange={(e) => handleMediaUpload(e, 'media')}
                  disabled={uploadingMedia}
                  className="hidden"
                  id="media-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('media-upload').click()}
                  disabled={uploadingMedia}
                >
                  {uploadingMedia ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload {updateData.update_type === 'PHOTO' ? 'Photos' : 'Videos'}
                </Button>
              </div>
              
              {/* Media Preview */}
              {updateData.media_urls.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {updateData.media_urls.map((url, index) => (
                    <div key={index} className="relative group">
                      {updateData.update_type === 'PHOTO' ? (
                        <img
                          src={url}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ) : (
                        <video
                          src={url}
                          className="w-full h-32 object-cover rounded-lg"
                          controls
                        />
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveMedia(index, 'media')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Financial Tracking */}
          {['RECEIPT', 'TEXT'].includes(updateData.update_type) && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <Label>Financial Tracking (Optional)</Label>
              </div>

              {/* Add Expense Item */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2">
                  <Input
                    placeholder="Description"
                    value={newSpendItem.description}
                    onChange={(e) => setNewSpendItem(prev => ({ ...prev, description: e.target.value }))}
                    className="col-span-6"
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={newSpendItem.amount}
                    onChange={(e) => setNewSpendItem(prev => ({ ...prev, amount: e.target.value }))}
                    className="col-span-4"
                  />
                  <Button
                    type="button"
                    onClick={handleAddSpendItem}
                    className="col-span-2"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Expense List */}
              {updateData.spending_breakdown.length > 0 && (
                <div className="space-y-2">
                  {updateData.spending_breakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <span className="text-sm">{item.description}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">${item.amount.toFixed(2)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSpendItem(index)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between font-medium">
                      <span>Total Spent:</span>
                      <span>${calculateTotalSpent().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt Upload */}
              <div className="space-y-2">
                <Label>Upload Receipts</Label>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={(e) => handleMediaUpload(e, 'receipt')}
                  disabled={uploadingMedia}
                />
                {updateData.receipt_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {updateData.receipt_urls.map((url, index) => (
                      <Badge key={index} variant="secondary" className="pr-1">
                        Receipt {index + 1}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-4 h-4 ml-1"
                          onClick={() => handleRemoveMedia(index, 'receipt')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Milestone Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="milestone">Mark as Milestone</Label>
              <p className="text-sm text-muted-foreground">
                Significant achievement in your campaign
              </p>
            </div>
            <Switch
              id="milestone"
              checked={updateData.is_milestone}
              onCheckedChange={(checked) => handleInputChange('is_milestone', checked)}
            />
          </div>

          {/* Milestone Percentage */}
          {updateData.is_milestone && (
            <div className="space-y-2">
              <Label htmlFor="milestone-percentage">Milestone Progress (%)</Label>
              <Input
                id="milestone-percentage"
                type="number"
                min="0"
                max="100"
                placeholder="e.g., 25"
                value={updateData.milestone_percentage}
                onChange={(e) => handleInputChange('milestone_percentage', e.target.value)}
                required={updateData.is_milestone}
              />
            </div>
          )}

          {/* Schedule Update */}
          <div className="space-y-2">
            <Label htmlFor="schedule">Schedule Update (Optional)</Label>
            <Input
              id="schedule"
              type="datetime-local"
              value={updateData.scheduled_for}
              onChange={(e) => handleInputChange('scheduled_for', e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="text-sm text-muted-foreground">
              Leave empty to post immediately
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading || uploadingMedia}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Post Update
                </>
              )}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default UpdateCreationForm;
