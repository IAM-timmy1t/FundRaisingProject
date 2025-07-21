import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import FileType from 'file-type';
import crypto from 'crypto';

class SecureUploadService {
  constructor() {
    this.allowedMimeTypes = {
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      videos: ['video/mp4', 'video/webm', 'video/ogg']
    };

    this.maxFileSizes = {
      images: 10 * 1024 * 1024, // 10MB
      documents: 25 * 1024 * 1024, // 25MB
      videos: 100 * 1024 * 1024 // 100MB
    };
  }

  async validateAndProcessUpload(file, type = 'images', userId) {
    try {
      // Validate file exists
      if (!file || !file.buffer) {
        throw new Error('No file provided');
      }

      // Check file size
      if (file.size > this.maxFileSizes[type]) {
        throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSizes[type] / 1024 / 1024}MB`);
      }

      // Detect actual file type
      const fileTypeResult = await FileType.fromBuffer(file.buffer);
      if (!fileTypeResult) {
        throw new Error('Unable to determine file type');
      }

      // Validate MIME type
      if (!this.allowedMimeTypes[type].includes(fileTypeResult.mime)) {
        throw new Error(`File type ${fileTypeResult.mime} is not allowed`);
      }

      // Generate secure filename
      const fileExtension = fileTypeResult.ext;
      const secureFilename = `${uuidv4()}.${fileExtension}`;
      const filePath = `${type}/${userId}/${secureFilename}`;

      // Process based on type
      let processedBuffer = file.buffer;
      
      if (type === 'images') {
        processedBuffer = await this.processImage(file.buffer, fileTypeResult.mime);
      }

      // Calculate file hash for integrity
      const fileHash = crypto
        .createHash('sha256')
        .update(processedBuffer)
        .digest('hex');

      // Scan for malware (integrate with ClamAV or similar)
      await this.scanForMalware(processedBuffer);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('campaign-media')
        .upload(filePath, processedBuffer, {
          contentType: fileTypeResult.mime,
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Store metadata in database
      const metadata = {
        user_id: userId,
        file_path: filePath,
        file_type: fileTypeResult.mime,
        file_size: processedBuffer.length,
        file_hash: fileHash,
        original_name: file.originalname,
        uploaded_at: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('file_uploads')
        .insert(metadata);

      if (dbError) {
        // Rollback file upload
        await supabase.storage
          .from('campaign-media')
          .remove([filePath]);
        throw dbError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('campaign-media')
        .getPublicUrl(filePath);

      return {
        url: publicUrl,
        path: filePath,
        metadata
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  async processImage(buffer, mimeType) {
    try {
      // Remove EXIF data and resize if needed
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Strip all metadata
      let processedImage = image.rotate(); // Auto-rotate based on EXIF

      // Resize if too large
      if (metadata.width > 2048 || metadata.height > 2048) {
        processedImage = processedImage.resize(2048, 2048, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Convert to appropriate format
      if (mimeType === 'image/jpeg') {
        processedImage = processedImage.jpeg({ quality: 85, progressive: true });
      } else if (mimeType === 'image/png') {
        processedImage = processedImage.png({ compressionLevel: 9 });
      } else if (mimeType === 'image/webp') {
        processedImage = processedImage.webp({ quality: 85 });
      }

      return await processedImage.toBuffer();
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error('Failed to process image');
    }
  }

  async scanForMalware(buffer) {
    // Integrate with ClamAV or similar service
    // For now, implement basic checks
    
    // Check for suspicious patterns
    const bufferString = buffer.toString('hex');
    const suspiciousPatterns = [
      '4d5a', // PE executable
      '7f454c46', // ELF executable
      '504b0304', // ZIP (could contain executables)
    ];

    for (const pattern of suspiciousPatterns) {
      if (bufferString.startsWith(pattern)) {
        throw new Error('File contains potentially malicious content');
      }
    }

    // In production, integrate with proper antivirus service
    return true;
  }

  async deleteFile(filePath, userId) {
    try {
      // Verify user owns the file
      const { data: fileData, error: fetchError } = await supabase
        .from('file_uploads')
        .select('*')
        .eq('file_path', filePath)
        .eq('user_id', userId)
        .single();

      if (fetchError || !fileData) {
        throw new Error('File not found or access denied');
      }

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('campaign-media')
        .remove([filePath]);

      if (deleteError) {
        throw deleteError;
      }

      // Delete metadata
      const { error: dbError } = await supabase
        .from('file_uploads')
        .delete()
        .eq('file_path', filePath);

      if (dbError) {
        throw dbError;
      }

      return { success: true };
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }
}

export default new SecureUploadService();