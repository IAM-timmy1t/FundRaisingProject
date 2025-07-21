import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpenIcon, ImageIcon, VideoIcon, XIcon, ChevronRight, AlertCircle, Camera } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { motion } from 'framer-motion';
import { InfoCircledIcon } from '@radix-ui/react-icons';

const StoryScriptureStepMobile = ({ data, onUpdate, onNext, onBack }) => {
  const [errors, setErrors] = React.useState({});
  const [mediaFiles, setMediaFiles] = React.useState(data.media || []);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const [touched, setTouched] = React.useState({});
  const isMobile = useMediaQuery('(max-width: 768px)');

  const MIN_STORY_LENGTH = 200;
  const MAX_STORY_LENGTH = 5000;

  // Auto-save functionality
  React.useEffect(() => {
    const saveTimeout = setTimeout(() => {
      if (Object.keys(touched).length > 0) {
        console.log('Auto-saving story data...');
      }
    }, 2000);

    return () => clearTimeout(saveTimeout);
  }, [data, touched]);

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

  const handleFieldChange = (field, value) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    onUpdate({ ...data, [field]: value });
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    setIsUploading(true);
    
    const newMediaFiles = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert(`${file.name} is not a valid image or video file`);
        continue;
      }
      
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum file size is 50MB`);
        continue;
      }
      
      setUploadProgress((i + 1) / files.length * 100);
      
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
    setTouched(prev => ({ ...prev, media: true }));
  };

  const removeMedia = (id) => {
    const filtered = mediaFiles.filter(m => m.id !== id);
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

  const inputAnimation = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  };

  return (
    <Card className={cn(
      "shadow-lg border-0",
      isMobile && "rounded-none"
    )}>
      <CardHeader className={cn(
        "bg-gradient-to-r from-primary/10 to-primary/5",
        isMobile ? "p-4" : "p-6"
      )}>
        <CardTitle className={cn(
          "flex items-center gap-2",
          isMobile ? "text-lg" : "text-2xl"
        )}>
          Tell Your Story
        </CardTitle>
        {!isMobile && (
          <CardDescription>
            Share your story and add scriptures or inspirational quotes
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className={cn(
        "space-y-6",
        isMobile ? "p-4" : "p-6"
      )}>
        <motion.div {...inputAnimation} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="story" className="flex items-center gap-1">
              Your Story*
              {errors.story && touched.story && (
                <AlertCircle className="h-3 w-3 text-destructive" />
              )}
            </Label>
            <span className={cn(
              "text-sm",
              storyLength < MIN_STORY_LENGTH ? "text-muted-foreground" : "text-green-600"
            )}>
              {storyLength} / {MIN_STORY_LENGTH}
            </span>
          </div>
          <Textarea
            id="story"
            value={data.story || ''}
            onChange={(e) => handleFieldChange('story', e.target.value)}
            placeholder="Share your story here. Be authentic, specific, and explain how the funds will be used..."
            className={cn(
              "transition-all",
              isMobile && "text-base",
              errors.story && touched.story ? 'border-destructive' : '',
              touched.story && !errors.story ? 'border-green-500' : ''
            )}
            rows={isMobile ? 6 : 8}
          />
          <Progress 
            value={storyProgress} 
            className={cn(
              "h-2",
              storyProgress >= 100 && "[&>div]:bg-green-500"
            )} 
          />
          {errors.story && touched.story && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.story}
            </p>
          )}
          {isMobile && (
            <p className="text-xs text-muted-foreground">
              Tell people who you are and why you're fundraising
            </p>
          )}
        </motion.div>

        <motion.div {...inputAnimation} className="space-y-2">
          <Label htmlFor="scripture">Scripture or Inspiration (Optional)</Label>
          <div className="space-y-3">
            <div className={cn(
              "flex gap-2",
              isMobile && "flex-col"
            )}>
              {!isMobile && <BookOpenIcon className="h-5 w-5 text-muted-foreground mt-2" />}
              <div className="flex-1 space-y-2">
                <Input
                  id="scripture"
                  value={data.scripture_reference || ''}
                  onChange={(e) => handleFieldChange('scripture_reference', e.target.value)}
                  placeholder="e.g., Philippians 4:19"
                  className={cn(
                    "transition-all",
                    isMobile && "text-base py-6"
                  )}
                />
                <Textarea
                  value={data.scripture_text || ''}
                  onChange={(e) => handleFieldChange('scripture_text', e.target.value)}
                  placeholder="Type or paste the scripture text here..."
                  className={cn(
                    "transition-all",
                    isMobile && "text-base"
                  )}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div {...inputAnimation} className="space-y-4">
          <div>
            <Label className="flex items-center gap-1">
              Campaign Media*
              {errors.media && touched.media && (
                <AlertCircle className="h-3 w-3 text-destructive" />
              )}
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Add at least one image (max 10 files)
            </p>
          </div>

          {/* Mobile-optimized media upload */}
          <div className={cn(
            "border-2 border-dashed border-muted-foreground/25 rounded-lg",
            isMobile ? "p-4" : "p-6"
          )}>
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
              {isMobile ? (
                <>
                  <div className="bg-primary/10 rounded-full p-4 mb-3">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-base font-medium">Tap to add photos or videos</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, GIF, MP4 up to 50MB
                  </p>
                </>
              ) : (
                <>
                  <div className="flex gap-4 mb-2">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <VideoIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">Click to upload images or videos</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, GIF, MP4, MOV up to 50MB
                  </p>
                </>
              )}
            </label>
            
            {isUploading && (
              <div className="mt-4">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-center mt-2">Uploading...</p>
              </div>
            )}
          </div>

          {errors.media && touched.media && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.media}
            </p>
          )}

          {/* Mobile-optimized media preview */}
          {mediaFiles.length > 0 && (
            <div className={cn(
              "grid gap-3",
              isMobile ? "grid-cols-2" : "grid-cols-3"
            )}>
              {mediaFiles.map((media) => (
                <div key={media.id} className="relative group">
                  <div className={cn(
                    "aspect-square rounded-lg overflow-hidden bg-muted",
                    isMobile && "touch-manipulation"
                  )}>
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
                  
                  {/* Mobile-optimized controls */}
                  <div className={cn(
                    "absolute top-2 right-2 flex gap-1",
                    isMobile && "opacity-100"
                  )}>
                    <Button
                      size="sm"
                      variant={media.is_primary ? "default" : "secondary"}
                      className={cn(
                        "text-xs",
                        isMobile ? "h-8 px-2" : "h-7 px-2"
                      )}
                      onClick={() => setPrimaryMedia(media.id)}
                    >
                      {media.is_primary ? 'Primary' : 'Set'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className={cn(
                        "p-0",
                        isMobile ? "h-8 w-8" : "h-7 w-7"
                      )}
                      onClick={() => removeMedia(media.id)}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Simplified caption for mobile */}
                  {!isMobile && (
                    <Input
                      placeholder="Add caption..."
                      value={media.caption || ''}
                      onChange={(e) => updateMediaCaption(media.id, e.target.value)}
                      className="mt-2 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {isMobile && (
          <motion.div 
            {...inputAnimation}
            className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-200 dark:border-blue-800"
          >
            <div className="flex gap-2">
              <InfoCircledIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">Story Tips:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                  <li>Be authentic and specific</li>
                  <li>Include a clear call to action</li>
                  <li>Add photos to build trust</li>
                  <li>Update regularly with progress</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
      
      {!isMobile && (
        <CardFooter className="flex justify-between bg-muted/50 p-6">
          <Button variant="outline" onClick={onBack} size="lg">
            Previous
          </Button>
          <Button onClick={handleNext} size="lg" className="min-w-[120px]">
            Next Step
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default StoryScriptureStepMobile;