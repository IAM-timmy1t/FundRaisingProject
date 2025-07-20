import { supabase } from '@/lib/customSupabaseClient';
import { toast } from 'sonner';

/**
 * Storage Service for handling media uploads and operations
 */
class StorageService {
  constructor() {
    this.buckets = {
      CAMPAIGN_MEDIA: 'campaign-media',
      UPDATE_MEDIA: 'update-media',
      RECEIPTS: 'receipt-documents',
      AVATARS: 'user-avatars',
      VERIFICATION: 'verification-documents'
    };
    
    this.maxSizes = {
      [this.buckets.CAMPAIGN_MEDIA]: 50 * 1024 * 1024, // 50MB
      [this.buckets.UPDATE_MEDIA]: 100 * 1024 * 1024, // 100MB
      [this.buckets.RECEIPTS]: 10 * 1024 * 1024, // 10MB
      [this.buckets.AVATARS]: 5 * 1024 * 1024, // 5MB
      [this.buckets.VERIFICATION]: 20 * 1024 * 1024 // 20MB
    };
    
    this.allowedTypes = {
      [this.buckets.CAMPAIGN_MEDIA]: {
        image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
        video: ['video/mp4', 'video/webm', 'video/quicktime']
      },
      [this.buckets.UPDATE_MEDIA]: {
        image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
        video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg']
      },
      [this.buckets.RECEIPTS]: {
        image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        document: ['application/pdf']
      },
      [this.buckets.AVATARS]: {
        image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
      },
      [this.buckets.VERIFICATION]: {
        image: ['image/jpeg', 'image/jpg', 'image/png'],
        document: ['application/pdf']
      }
    };
  }

  /**
   * Validate file before upload
   */
  validateFile(file, bucket) {
    // Check file size
    const maxSize = this.maxSizes[bucket];
    if (file.size > maxSize) {
      const sizeMB = (maxSize / 1024 / 1024).toFixed(0);
      throw new Error(`File size exceeds ${sizeMB}MB limit`);
    }
    
    // Check file type
    const allowedTypes = Object.values(this.allowedTypes[bucket]).flat();
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }
    
    return true;
  }

  /**
   * Generate unique file path
   */
  generateFilePath(bucket, file, prefix = '') {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop();
    const safeName = file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    
    if (prefix) {
      return `${prefix}/${timestamp}-${randomString}-${safeName}.${extension}`;
    }
    return `${timestamp}-${randomString}-${safeName}.${extension}`;
  }

  /**
   * Upload single file
   */
  async uploadFile(file, bucket, options = {}) {
    try {
      // Validate file
      this.validateFile(file, bucket);
      
      // Generate file path
      const filePath = options.path || this.generateFilePath(bucket, file, options.prefix);
      
      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: options.upsert || false
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);
      
      return {
        path: data.path,
        url: publicUrl,
        size: file.size,
        type: file.type,
        name: file.name
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(files, bucket, options = {}) {
    const uploadPromises = files.map(file => 
      this.uploadFile(file, bucket, {
        ...options,
        prefix: options.prefix
      })
    );
    
    const results = await Promise.allSettled(uploadPromises);
    
    const successful = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
    
    const failed = results
      .filter(r => r.status === 'rejected')
      .map((r, i) => ({
        file: files[i].name,
        error: r.reason.message
      }));
    
    return { successful, failed };
  }

  /**
   * Upload campaign media
   */
  async uploadCampaignMedia(files, campaignId) {
    const prefix = campaignId;
    const { successful, failed } = await this.uploadMultiple(
      files,
      this.buckets.CAMPAIGN_MEDIA,
      { prefix }
    );
    
    if (failed.length > 0) {
      toast.warning(`${failed.length} file(s) failed to upload`);
    }
    
    return successful;
  }

  /**
   * Upload update media
   */
  async uploadUpdateMedia(files, campaignId, updateId) {
    const prefix = `${campaignId}/${updateId}`;
    const { successful, failed } = await this.uploadMultiple(
      files,
      this.buckets.UPDATE_MEDIA,
      { prefix }
    );
    
    if (failed.length > 0) {
      toast.warning(`${failed.length} file(s) failed to upload`);
    }
    
    return successful;
  }

  /**
   * Upload receipt
   */
  async uploadReceipt(file, campaignId, updateId) {
    const prefix = `${campaignId}/${updateId}`;
    return await this.uploadFile(
      file,
      this.buckets.RECEIPTS,
      { prefix }
    );
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(file, userId) {
    const prefix = userId;
    const path = `${prefix}/avatar`;
    
    return await this.uploadFile(
      file,
      this.buckets.AVATARS,
      { path, upsert: true }
    );
  }

  /**
   * Upload verification document
   */
  async uploadVerificationDocument(file, userId, documentType) {
    const prefix = `${userId}/${documentType}`;
    return await this.uploadFile(
      file,
      this.buckets.VERIFICATION,
      { prefix }
    );
  }

  /**
   * Delete file
   */
  async deleteFile(bucket, path) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }

  /**
   * Delete multiple files
   */
  async deleteMultiple(bucket, paths) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove(paths);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }

  /**
   * Get signed URL for private files
   */
  async getSignedUrl(bucket, path, expiresIn = 3600) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);
      
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Signed URL error:', error);
      throw error;
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(bucket, folder, options = {}) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(folder, {
          limit: options.limit || 100,
          offset: options.offset || 0,
          sortBy: options.sortBy || { column: 'created_at', order: 'desc' }
        });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('List files error:', error);
      throw error;
    }
  }

  /**
   * Move/rename file
   */
  async moveFile(bucket, fromPath, toPath) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .move(fromPath, toPath);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Move file error:', error);
      throw error;
    }
  }

  /**
   * Copy file
   */
  async copyFile(bucket, fromPath, toPath) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .copy(fromPath, toPath);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Copy file error:', error);
      throw error;
    }
  }

  /**
   * Download file
   */
  async downloadFile(bucket, path) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(bucket, path) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path.split('/').slice(0, -1).join('/'), {
          limit: 1,
          search: path.split('/').pop()
        });
      
      if (error) throw error;
      return data[0] || null;
    } catch (error) {
      console.error('Metadata error:', error);
      throw error;
    }
  }

  /**
   * Optimize image before upload
   */
  async optimizeImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              resolve(new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              }));
            },
            file.type,
            quality
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(file, size = 200) {
    return this.optimizeImage(file, size, size, 0.7);
  }

  /**
   * Get storage usage stats
   */
  async getStorageStats(bucket) {
    try {
      const { data, error } = await supabase
        .rpc('get_bucket_size', { bucket_id: bucket });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Storage stats error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
export default storageService;