import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { campaignService } from '@/lib/campaignService';
import { toast } from 'sonner';
import {
  FileText,
  Image,
  Video,
  Receipt,
  Upload,
  X,
  Loader2
} from 'lucide-react';

/**
 * Modal component for creating campaign updates
 */
const UpdateManager = ({ campaignId, onClose, onUpdatePosted }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    update_type: 'text',
    is_public: true,
    media_url: '',
    spending_amount: null,
    spending_description: ''
  });
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);

  const updateTypes = [
    { value: 'text', label: 'Text Update', icon: FileText },
    { value: 'photo', label: 'Photo Update', icon: Image },
    { value: 'video', label: 'Video Update', icon: Video },
    { value: 'receipt', label: 'Spending Receipt', icon: Receipt }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      // Upload media if present
      let mediaUrl = formData.media_url;
      if (mediaFile) {
        setUploadingMedia(true);
        const uploadResult = await campaignService.uploadUpdateMedia(
          campaignId,
          mediaFile,
          formData.update_type
        );
        mediaUrl = uploadResult.url;
        setUploadingMedia(false);
      }

      // Create the update
      const updateData = {
        ...formData,
        media_url: mediaUrl,
        campaign_id: campaignId
      };

      await campaignService.createCampaignUpdate(campaignId, updateData);
      
      toast.success('Update posted successfully!');
      if (onUpdatePosted) {
        onUpdatePosted();
      }
      onClose();
    } catch (error) {
      console.error('Error posting update:', error);
      toast.error('Failed to post update');
    } finally {
      setLoading(false);
      setUploadingMedia(false);
    }
  };

  const handleMediaChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      // Validate file type based on update type
      const validTypes = {
        photo: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        video: ['video/mp4', 'video/webm', 'video/ogg'],
        receipt: ['image/jpeg', 'image/png', 'application/pdf']
      };

      if (formData.update_type !== 'text' && 
          !validTypes[formData.update_type]?.includes(file.type)) {
        toast.error(`Invalid file type for ${formData.update_type} update`);
        return;
      }

      setMediaFile(file);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setFormData({ ...formData, media_url: '' });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post Campaign Update</DialogTitle>
          <DialogDescription>
            Keep your donors informed about your campaign progress
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Update Type */}
          <div className="space-y-2">
            <Label>Update Type</Label>
            <Select
              value={formData.update_type}
              onValueChange={(value) => setFormData({ ...formData, update_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {updateTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Give your update a title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              placeholder="Share your update with donors..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={6}
              required
            />
          </div>

          {/* Media Upload */}
          {formData.update_type !== 'text' && (
            <div className="space-y-2">
              <Label>Media</Label>
              {mediaFile ? (
                <div className="relative p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm">{mediaFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeMedia}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleMediaChange}
                      accept={
                        formData.update_type === 'photo' ? 'image/*' :
                        formData.update_type === 'video' ? 'video/*' :
                        'image/*,application/pdf'
                      }
                    />
                    <span className="text-sm text-primary hover:underline">
                      Click to upload {formData.update_type}
                    </span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max file size: 10MB
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Spending Details (for receipts) */}
          {formData.update_type === 'receipt' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="spending_amount">Amount Spent</Label>
                <Input
                  id="spending_amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.spending_amount || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    spending_amount: parseFloat(e.target.value) || null 
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spending_description">What was it spent on?</Label>
                <Input
                  id="spending_description"
                  placeholder="e.g., Medical supplies, Food packages"
                  value={formData.spending_description}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    spending_description: e.target.value 
                  })}
                />
              </div>
            </>
          )}

          {/* Visibility */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Public Update</Label>
              <p className="text-sm text-muted-foreground">
                Make this update visible to everyone
              </p>
            </div>
            <Switch
              checked={formData.is_public}
              onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
            />
          </div>

          {/* Alert for private updates */}
          {!formData.is_public && (
            <Alert>
              <AlertDescription>
                Private updates are only visible to donors who have contributed to your campaign.
              </AlertDescription>
            </Alert>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || uploadingMedia}
          >
            {loading || uploadingMedia ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploadingMedia ? 'Uploading...' : 'Posting...'}
              </>
            ) : (
              'Post Update'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateManager;