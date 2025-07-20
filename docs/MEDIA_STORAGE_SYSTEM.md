# Media Storage Configuration - Task #20

## Overview
This document describes the media storage system implemented for the FundRaising platform using Supabase Storage buckets.

## Storage Buckets

### 1. campaign-media
- **Purpose**: Store campaign header images, gallery photos, and promotional videos
- **Access**: Public read, authenticated upload (campaign owners only)
- **Size Limit**: 50MB per file
- **Allowed Types**: Images (JPEG, PNG, GIF, WebP, AVIF) and Videos (MP4, WebM, QuickTime)

### 2. update-media
- **Purpose**: Store photos and videos attached to campaign updates
- **Access**: Public read, authenticated upload (campaign owners only)
- **Size Limit**: 100MB per file (larger for video updates)
- **Allowed Types**: Images and Videos (including AVI and MPEG)

### 3. receipt-documents
- **Purpose**: Store receipts and expense documentation
- **Access**: Authenticated read (campaign owners and donors)
- **Size Limit**: 10MB per file
- **Allowed Types**: Images and PDF documents

### 4. user-avatars
- **Purpose**: Store user profile pictures
- **Access**: Public read, user-specific upload
- **Size Limit**: 5MB per file
- **Allowed Types**: Images only

### 5. verification-documents
- **Purpose**: Store KYC and verification documents
- **Access**: Private (user can only view their own)
- **Size Limit**: 20MB per file
- **Allowed Types**: Images and PDF documents

## Security Policies

### Row Level Security (RLS)
Each bucket has specific RLS policies:

1. **Public Buckets** (campaign-media, update-media, user-avatars):
   - Anyone can view files
   - Only authenticated users can upload
   - Only owners can update/delete their files

2. **Private Buckets** (receipt-documents, verification-documents):
   - Restricted viewing based on ownership or relationship
   - Strict upload controls
   - Limited or no update/delete permissions

### File Path Structure
```
campaign-media/
  └── {campaign_id}/
      ├── header.jpg
      └── gallery/
          ├── photo1.jpg
          └── video1.mp4

update-media/
  └── {campaign_id}/
      └── {update_id}/
          ├── photo1.jpg
          └── receipt.pdf

receipt-documents/
  └── {campaign_id}/
      └── {update_id}/
          └── receipt-{timestamp}.pdf

user-avatars/
  └── {user_id}/
      └── avatar

verification-documents/
  └── {user_id}/
      └── {document_type}/
          └── document-{timestamp}.pdf
```

## Storage Service API

### Core Methods

#### uploadFile(file, bucket, options)
Upload a single file to a specified bucket.
```javascript
const result = await storageService.uploadFile(
  file, 
  'campaign-media',
  { prefix: campaignId }
);
```

#### uploadMultiple(files, bucket, options)
Upload multiple files with progress tracking.
```javascript
const { successful, failed } = await storageService.uploadMultiple(
  files,
  'update-media',
  { prefix: `${campaignId}/${updateId}` }
);
```

#### deleteFile(bucket, path)
Delete a single file from storage.
```javascript
await storageService.deleteFile('campaign-media', 'path/to/file.jpg');
```

#### getSignedUrl(bucket, path, expiresIn)
Generate a temporary signed URL for private files.
```javascript
const url = await storageService.getSignedUrl(
  'verification-documents',
  'user123/passport.pdf',
  3600 // 1 hour
);
```

#### optimizeImage(file, maxWidth, maxHeight, quality)
Optimize images before upload to reduce file size.
```javascript
const optimized = await storageService.optimizeImage(
  file,
  1920,  // max width
  1080,  // max height
  0.85   // quality
);
```

## MediaUploader Component

### Basic Usage
```jsx
<MediaUploader
  bucket="campaign-media"
  maxFiles={10}
  onUploadComplete={(files) => console.log('Uploaded:', files)}
  prefix={campaignId}
/>
```

### Props
- `bucket` (required): Storage bucket name
- `maxFiles`: Maximum number of files (default: 10)
- `maxSize`: Override default size limit
- `accept`: Override accepted file types
- `onUploadComplete`: Callback when uploads finish
- `onFileRemove`: Callback when file is removed
- `existingFiles`: Array of already uploaded files
- `prefix`: Path prefix for uploads
- `disabled`: Disable uploads
- `showPreview`: Show uploaded file previews
- `multiple`: Allow multiple file selection

## Integration Examples

### Campaign Creation
```jsx
// In campaign creation wizard
const [campaignMedia, setCampaignMedia] = useState([]);

<MediaUploader
  bucket="campaign-media"
  maxFiles={5}
  onUploadComplete={(files) => {
    setCampaignMedia(files);
    // Update form with media URLs
    form.setValue('media_urls', files.map(f => f.url));
  }}
  prefix={tempCampaignId}
/>
```

### Update Creation
```jsx
// In update creation form
const [updateMedia, setUpdateMedia] = useState([]);
const [receipt, setReceipt] = useState(null);

// Media files
<MediaUploader
  bucket="update-media"
  maxFiles={4}
  onUploadComplete={setUpdateMedia}
  prefix={`${campaignId}/${updateId}`}
/>

// Receipt upload
<MediaUploader
  bucket="receipt-documents"
  maxFiles={1}
  accept={{ 'application/pdf': ['.pdf'] }}
  onUploadComplete={(files) => setReceipt(files[0])}
  prefix={`${campaignId}/${updateId}`}
/>
```

### Profile Avatar
```jsx
// In user profile settings
<MediaUploader
  bucket="user-avatars"
  maxFiles={1}
  onUploadComplete={async (files) => {
    const avatarUrl = files[0].url;
    await updateProfile({ avatar_url: avatarUrl });
  }}
  prefix={user.id}
  showPreview={false}
/>
```

## Maintenance

### Orphaned Media Cleanup
A cleanup function removes orphaned media files not referenced in the database:
```sql
SELECT cleanup_orphaned_media();
```

This should be scheduled to run daily (e.g., 3 AM) using pg_cron:
```sql
SELECT cron.schedule(
  'cleanup-orphaned-media', 
  '0 3 * * *', 
  'SELECT cleanup_orphaned_media();'
);
```

### Storage Monitoring
Monitor storage usage with:
```javascript
const stats = await storageService.getStorageStats('campaign-media');
console.log(`Used: ${stats.size_bytes} bytes`);
console.log(`Files: ${stats.file_count}`);
```

## Best Practices

1. **Always validate files** before upload (type, size, content)
2. **Use path prefixes** to organize files by entity (campaign, user, etc.)
3. **Implement cleanup** for orphaned files
4. **Optimize images** before upload to save bandwidth
5. **Use signed URLs** for sensitive documents
6. **Monitor storage usage** to prevent quota exceeded
7. **Set appropriate CORS** headers for cross-origin access
8. **Implement retry logic** for failed uploads
9. **Show upload progress** for better UX
10. **Handle errors gracefully** with user-friendly messages

## Security Considerations

1. **File type validation**: Strictly enforce allowed MIME types
2. **Size limits**: Prevent DoS through large file uploads
3. **Path traversal**: Use sanitized paths to prevent directory traversal
4. **Access control**: Implement proper RLS policies
5. **Virus scanning**: Consider implementing virus scanning for uploads
6. **Content moderation**: Review uploaded content for inappropriate material
7. **Rate limiting**: Implement upload rate limits per user
8. **Audit logging**: Track all upload/delete operations

## Testing

Run the test script to verify the setup:
```bash
node test-media-storage.js
```

This will check:
- Migration file integrity
- Storage service implementation
- MediaUploader component
- Bucket configuration
- Security policies

## Troubleshooting

### Common Issues

1. **Upload fails with 413 error**
   - File exceeds bucket size limit
   - Check Supabase project storage quota

2. **Permission denied errors**
   - Check RLS policies are correct
   - Verify user authentication
   - Check bucket public/private settings

3. **CORS errors**
   - Configure CORS in Supabase dashboard
   - Add allowed origins

4. **Slow uploads**
   - Implement image optimization
   - Use progressive upload for large files
   - Consider chunked uploads

5. **Missing previews**
   - Check file type detection
   - Verify URL generation
   - Check for mixed content (HTTP/HTTPS)

## Future Enhancements

1. **Video processing**: Thumbnail generation, compression
2. **Image CDN**: Integrate with image optimization CDN
3. **Bulk operations**: Batch upload/delete APIs
4. **Advanced permissions**: Team-based access control
5. **Backup strategy**: S3 cross-region replication
6. **Analytics**: Track storage usage per campaign
7. **Watermarking**: Add watermarks to campaign media
8. **AI moderation**: Automatic content moderation
9. **Mobile optimization**: App-specific upload flows
10. **Blockchain verification**: Store media hashes on-chain