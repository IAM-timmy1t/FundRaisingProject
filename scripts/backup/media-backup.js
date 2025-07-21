import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import dotenv from 'dotenv';
import archiver from 'archiver';
import AWS from 'aws-sdk';
import nodemailer from 'nodemailer';
import axios from 'axios';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const pipeline = promisify(require('stream').pipeline);

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  backup: {
    localPath: path.join(__dirname, '../../backups/media'),
    tempPath: path.join(__dirname, '../../backups/temp'),
    chunkSize: 100, // Process media in chunks
    retention: {
      daily: 7,
      weekly: 4,
      monthly: 6
    }
  },
  s3: {
    bucket: process.env.BACKUP_S3_BUCKET,
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  notification: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    },
    recipients: (process.env.BACKUP_NOTIFICATION_EMAILS || '').split(',')
  }
};

// Initialize AWS S3
const s3 = new AWS.S3({
  region: config.s3.region,
  accessKeyId: config.s3.accessKeyId,
  secretAccessKey: config.s3.secretAccessKey
});

// Initialize Supabase client
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

// Email transporter
const transporter = nodemailer.createTransport(config.notification.smtp);

class MediaBackupService {
  constructor() {
    this.ensureDirectories();
    this.stats = {
      totalFiles: 0,
      totalSize: 0,
      processedFiles: 0,
      failedFiles: 0,
      startTime: null,
      endTime: null
    };
  }

  // Ensure backup directories exist
  ensureDirectories() {
    const dirs = [
      config.backup.localPath,
      config.backup.tempPath,
      path.join(config.backup.localPath, 'daily'),
      path.join(config.backup.localPath, 'weekly'),
      path.join(config.backup.localPath, 'monthly')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Generate backup filename
  generateFilename(type = 'daily') {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    return `blessed-horizon-media-${type}-${timestamp}.tar.gz`;
  }

  // Get list of all media files from database
  async getMediaFilesList() {
    const files = [];
    let lastId = null;
    
    try {
      while (true) {
        let query = supabase
          .from('file_uploads')
          .select('*')
          .order('id', { ascending: true })
          .limit(config.backup.chunkSize);
        
        if (lastId) {
          query = query.gt('id', lastId);
        }

        const { data, error } = await query;
        
        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          break;
        }

        files.push(...data);
        lastId = data[data.length - 1].id;
      }

      console.log(`Found ${files.length} media files to backup`);
      return files;
    } catch (error) {
      console.error('Failed to get media files list:', error);
      throw error;
    }
  }

  // Download media file from Supabase Storage
  async downloadFile(fileRecord, tempDir) {
    try {
      const { data, error } = await supabase.storage
        .from('campaign-media')
        .download(fileRecord.file_path);

      if (error) {
        throw error;
      }

      // Create directory structure
      const filePath = path.join(tempDir, fileRecord.file_path);
      const fileDir = path.dirname(filePath);
      
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      // Convert blob to buffer and save
      const buffer = Buffer.from(await data.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      // Verify file integrity
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      if (fileRecord.file_hash && fileRecord.file_hash !== hash) {
        console.warn(`Hash mismatch for ${fileRecord.file_path}`);
      }

      return {
        path: filePath,
        size: buffer.length,
        hash
      };
    } catch (error) {
      console.error(`Failed to download ${fileRecord.file_path}:`, error);
      throw error;
    }
  }

  // Create tar.gz archive of media files
  async createArchive(tempDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('tar', {
        gzip: true,
        gzipOptions: { level: 9 }
      });

      let totalSize = 0;

      output.on('close', () => {
        console.log(`Archive created: ${archive.pointer()} bytes`);
        resolve({
          path: outputPath,
          size: archive.pointer()
        });
      });

      archive.on('error', reject);
      archive.on('entry', (entry) => {
        totalSize += entry.stats.size;
      });

      archive.pipe(output);
      archive.directory(tempDir, false);
      archive.finalize();
    });
  }

  // Process media backup
  async createBackup() {
    const backupFile = this.generateFilename();
    const backupPath = path.join(config.backup.localPath, 'daily', backupFile);
    const tempDir = path.join(config.backup.tempPath, `media-${Date.now()}`);
    
    try {
      console.log(`Starting media backup: ${backupFile}`);
      this.stats.startTime = Date.now();

      // Create temp directory
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Get list of media files
      const mediaFiles = await this.getMediaFilesList();
      this.stats.totalFiles = mediaFiles.length;

      // Create metadata file
      const metadata = {
        backupDate: new Date().toISOString(),
        totalFiles: mediaFiles.length,
        files: []
      };

      // Download files in chunks
      for (let i = 0; i < mediaFiles.length; i += config.backup.chunkSize) {
        const chunk = mediaFiles.slice(i, i + config.backup.chunkSize);
        
        await Promise.all(chunk.map(async (file) => {
          try {
            const result = await this.downloadFile(file, tempDir);
            metadata.files.push({
              ...file,
              backup: result
            });
            this.stats.processedFiles++;
            this.stats.totalSize += result.size;
            
            console.log(`Progress: ${this.stats.processedFiles}/${this.stats.totalFiles}`);
          } catch (error) {
            console.error(`Failed to backup ${file.file_path}:`, error);
            this.stats.failedFiles++;
            metadata.files.push({
              ...file,
              backup: { error: error.message }
            });
          }
        }));
      }

      // Save metadata
      fs.writeFileSync(
        path.join(tempDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Create archive
      const archiveInfo = await this.createArchive(tempDir, backupPath);

      // Clean up temp directory
      this.cleanupTempDir(tempDir);

      this.stats.endTime = Date.now();
      const duration = (this.stats.endTime - this.stats.startTime) / 1000;

      console.log(`Media backup completed: ${backupFile}`);
      console.log(`Processed: ${this.stats.processedFiles}/${this.stats.totalFiles} files`);
      console.log(`Total size: ${this.formatBytes(this.stats.totalSize)}`);
      console.log(`Archive size: ${this.formatBytes(archiveInfo.size)}`);
      console.log(`Duration: ${duration}s`);

      return {
        filename: backupFile,
        path: archiveInfo.path,
        size: archiveInfo.size,
        duration,
        timestamp: new Date(),
        stats: { ...this.stats }
      };
    } catch (error) {
      console.error('Media backup failed:', error);
      
      // Clean up on failure
      if (fs.existsSync(tempDir)) {
        this.cleanupTempDir(tempDir);
      }
      
      throw error;
    }
  }

  // Upload backup to S3
  async uploadToS3(backupInfo) {
    try {
      console.log(`Uploading to S3: ${backupInfo.filename}`);
      
      const fileStream = fs.createReadStream(backupInfo.path);
      const s3Key = `media/${new Date().getFullYear()}/${backupInfo.filename}`;

      // Use multipart upload for large files
      const params = {
        Bucket: config.s3.bucket,
        Key: s3Key,
        Body: fileStream,
        ContentType: 'application/gzip',
        ServerSideEncryption: 'AES256',
        StorageClass: 'GLACIER', // Use Glacier for media backups
        Metadata: {
          'backup-type': 'media',
          'backup-date': backupInfo.timestamp.toISOString(),
          'total-files': backupInfo.stats.totalFiles.toString(),
          'original-size': backupInfo.stats.totalSize.toString(),
          'archive-size': backupInfo.size.toString()
        }
      };

      const result = await s3.upload(params, {
        partSize: 10 * 1024 * 1024, // 10MB chunks
        queueSize: 4
      }).promise();

      console.log(`Upload completed: ${result.Location}`);

      return {
        ...backupInfo,
        s3Location: result.Location,
        s3Key
      };
    } catch (error) {
      console.error('S3 upload failed:', error);
      throw error;
    }
  }

  // Clean up temporary directory
  cleanupTempDir(dir) {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Failed to cleanup temp directory:', error);
    }
  }

  // Manage backup retention
  async cleanupOldBackups() {
    const types = ['daily', 'weekly', 'monthly'];
    
    for (const type of types) {
      const dir = path.join(config.backup.localPath, type);
      
      if (!fs.existsSync(dir)) continue;
      
      const files = fs.readdirSync(dir)
        .filter(file => file.endsWith('.tar.gz'))
        .map(file => ({
          name: file,
          path: path.join(dir, file),
          stats: fs.statSync(path.join(dir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      const retentionCount = config.backup.retention[type];
      const filesToDelete = files.slice(retentionCount);

      filesToDelete.forEach(file => {
        console.log(`Deleting old media backup: ${file.name}`);
        fs.unlinkSync(file.path);
      });
    }
  }

  // Send notification email
  async sendNotification(success, backupInfo, error = null) {
    if (!config.notification.recipients.length) {
      return;
    }

    const subject = success 
      ? '✅ Media Backup Successful'
      : '❌ Media Backup Failed';

    const html = success
      ? `
        <h2>Media Backup Completed Successfully</h2>
        <p><strong>Filename:</strong> ${backupInfo.filename}</p>
        <p><strong>Archive Size:</strong> ${this.formatBytes(backupInfo.size)}</p>
        <p><strong>Total Files:</strong> ${backupInfo.stats.totalFiles}</p>
        <p><strong>Processed Files:</strong> ${backupInfo.stats.processedFiles}</p>
        <p><strong>Failed Files:</strong> ${backupInfo.stats.failedFiles}</p>
        <p><strong>Total Media Size:</strong> ${this.formatBytes(backupInfo.stats.totalSize)}</p>
        <p><strong>Duration:</strong> ${backupInfo.duration}s</p>
        <p><strong>S3 Location:</strong> ${backupInfo.s3Location || 'Not uploaded'}</p>
        <p><strong>Timestamp:</strong> ${backupInfo.timestamp}</p>
      `
      : `
        <h2>Media Backup Failed</h2>
        <p><strong>Error:</strong> ${error.message}</p>
        <p><strong>Stack:</strong> <pre>${error.stack}</pre></p>
        <p><strong>Timestamp:</strong> ${new Date()}</p>
      `;

    try {
      await transporter.sendMail({
        from: config.notification.smtp.auth.user,
        to: config.notification.recipients.join(','),
        subject,
        html
      });
      console.log('Notification email sent');
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
    }
  }

  // Format bytes to human readable
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Log backup to database
  async logBackup(backupInfo) {
    try {
      const { error } = await supabase
        .from('backup_logs')
        .insert({
          backup_type: 'media',
          filename: backupInfo.filename,
          size_bytes: backupInfo.size,
          duration_seconds: backupInfo.duration,
          s3_location: backupInfo.s3Location,
          metadata: {
            stats: backupInfo.stats
          },
          status: backupInfo.stats.failedFiles > 0 ? 'partial' : 'success',
          created_at: backupInfo.timestamp
        });

      if (error) {
        console.error('Failed to log backup:', error);
      }
    } catch (error) {
      console.error('Failed to log backup:', error);
    }
  }

  // Main backup process
  async run() {
    let backupInfo = null;
    
    try {
      // Create backup
      backupInfo = await this.createBackup();

      // Upload to S3
      if (config.s3.bucket) {
        backupInfo = await this.uploadToS3(backupInfo);
      }

      // Manage retention
      await this.cleanupOldBackups();

      // Send success notification
      await this.sendNotification(true, backupInfo);

      // Log to database
      await this.logBackup(backupInfo);
      
      console.log('Media backup process completed successfully');
      return backupInfo;
    } catch (error) {
      console.error('Media backup process failed:', error);
      
      // Send failure notification
      await this.sendNotification(false, backupInfo, error);
      
      throw error;
    }
  }
}

// Run backup if called directly
if (require.main === module) {
  const backupService = new MediaBackupService();
  backupService.run()
    .then(() => {
      console.log('Media backup completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Media backup failed:', error);
      process.exit(1);
    });
}

export default MediaBackupService;