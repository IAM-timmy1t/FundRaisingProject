import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpenIcon, ImageIcon, VideoIcon, XIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const StoryScriptureStep = ({ data, onUpdate, onNext, onBack }) => {
  const [errors, setErrors] = React.useState({});
  const [mediaFiles, setMediaFiles] = React.useState(data.media || []);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);

  const MIN_STORY_LENGTH = 200;
  const MAX_STORY_LENGTH = 5000;

  const validateForm = () => {
    const newErrors = {};
    
    if (!data.story || data.story.trim().length < MIN_STORY_LENGTH) {
      newErrors.story = `Story must be at least ${MIN_STORY_LENGTH} characters`;
    }
    
    if (data.story && data.story.trim().length > MAX_STORY_LENGTH) {
      newErrors.story = `Story cannot exceed ${MAX_STORY_LENGTH} characters`;
    }
    
    if (mediaFiles.length === 0) {
      newErrors.media = 'At least one image is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onUpdate({ ...data, media: mediaFiles });
      onNext();
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    setIsUploading(true);
    
    // Simulate file upload progress
    const newMediaFiles = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type and size
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert(`${file.name} is not a valid image or video file`);
        continue;
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        alert(`${file.name} is too large. Maximum file size is 50MB`);
        continue;
      }
      
      // Simulate upload progress
      setUploadProgress((i + 1) / files.length * 100);
      
      // In real implementation, you would upload to Supabase storage here
      // For now, we'll create a preview URL
      const previewUrl = URL.createObjectURL(file);
      
      newMediaFiles.push({
        id: Date.now() + i,
        file: file,
        url: previewUrl,
        type: file.type.startsWith('image/') ? 'image' : 'video',
        caption: '',
        is_primary: i === 0 && mediaFiles.length === 0
      });
    }
    
    setMediaFiles([...mediaFiles, ...newMediaFiles]);
    setIsUploading(false);
    setUploadProgress(0);
  };

  const removeMedia = (id) => {
    const filtered = mediaFiles.filter(m => m.id !== id);
    // If we removed the primary image, make the first one primary
    if (filtered.length > 0 && !filtered.some(m => m.is_primary)) {
      filtered[0].is_primary = true;
    }
    setMediaFiles(filtered);
  };

  const setPrimaryMedia = (id) => {
    setMediaFiles(mediaFiles.map(m => ({
      ...m,
      is_primary: m.id === id
    })));
  };

  const updateMediaCaption = (id, caption) => {
    setMediaFiles(mediaFiles.map(m => 
      m.id === id ? { ...m, caption } : m
    ));
  };

  const storyLength = data.story?.trim().length || 0;
  const storyProgress = Math.min(100, (storyLength / MIN_STORY_LENGTH) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tell Your Story</CardTitle>
        <CardDescription>
          Share your story and add scriptures or inspirational quotes that resonate with your campaign
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="story">Your Story*</Label>
            <span className="text-sm text-muted-foreground">
              {storyLength} / {MIN_STORY_LENGTH} minimum
            </span>
          </div>
          <Textarea
            id="story"
            value={data.story || ''}
            onChange={(e) => onUpdate({ ...data, story: e.target.value })}
            placeholder="Share your story here. Be authentic, specific, and explain how the funds will be used..."
            className={errors.story ? 'border-destructive' : ''}
            rows={8}
          />
          <Progress value={storyProgress} className="h-2" />
          {errors.story && (
            <p className="text-sm text-destructive">{errors.story}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Tell people who you are, why you're fundraising, and how their support will make a difference
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scripture">Scripture or Inspiration (Optional)</Label>
          <div className="space-y-4">
            <div className="flex gap-2">
              <BookOpenIcon className="h-5 w-5 text-muted-foreground mt-2" />
              <div className="flex-1 space-y-2">
                <Input
                  id="scripture"
                  value={data.scripture_reference || ''}
                  onChange={(e) => onUpdate({ ...data, scripture_reference: e.target.value })}
                  placeholder="e.g., Philippians 4:19"
                />
                <Textarea
                  value={data.scripture_text || ''}
                  onChange={(e) => onUpdate({ ...data, scripture_text: e.target.value })}
                  placeholder="Type or paste the scripture text here..."
                  rows={3}
                />
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Add a meaningful scripture or quote that connects to your campaign
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Campaign Media*</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Add at least one image to help tell your story (max 10 files)
            </p>
          </div>

          {/* Media Upload */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
            <input
              type="file"
              id="media-upload"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={mediaFiles.length >= 10}
            />
            <label
              htmlFor="media-upload"
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="flex gap-4 mb-2">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <VideoIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Click to upload images or videos</p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, GIF, MP4, MOV up to 50MB
              </p>
            </label>
            
            {isUploading && (
              <div className="mt-4">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-center mt-2">Uploading...</p>
              </div>
            )}
          </div>

          {errors.media && (
            <p className="text-sm text-destructive">{errors.media}</p>
          )}

          {/* Media Preview Grid */}
          {mediaFiles.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {mediaFiles.map((media) => (
                <div key={media.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    {media.type === 'image' ? (
                      <img
                        src={media.url}
                        alt="Campaign media"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={media.url}
                        className="w-full h-full object-cover"
                        controls
                      />
                    )}
                  </div>
                  
                  {/* Media Controls */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      size="sm"
                      variant={media.is_primary ? "default" : "secondary"}
                      className="h-7 px-2 text-xs"
                      onClick={() => setPrimaryMedia(media.id)}
                    >
                      {media.is_primary ? 'Primary' : 'Set Primary'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 w-7 p-0"
                      onClick={() => removeMedia(media.id)}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Caption Input */}
                  <Input
                    placeholder="Add caption..."
                    value={media.caption || ''}
                    onChange={(e) => updateMediaCaption(media.id, e.target.value)}
                    className="mt-2 text-sm"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Previous</Button>
        <Button onClick={handleNext}>Next Step</Button>
      </CardFooter>
    </Card>
  );
};

export default StoryScriptureStep;