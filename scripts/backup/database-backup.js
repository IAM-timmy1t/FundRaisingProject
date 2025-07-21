import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import archiver from 'archiver';
import AWS from 'aws-sdk';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    dbUrl: process.env.SUPABASE_DB_URL
  },
  backup: {
    localPath: path.join(__dirname, '../../backups/database'),
    retention: {
      daily: 7,
      weekly: 4,
      monthly: 12
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

class DatabaseBackupService {
  constructor() {
    this.ensureDirectories();
  }

  // Ensure backup directories exist
  ensureDirectories() {
    const dirs = [
      config.backup.localPath,
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
    return `blessed-horizon-${type}-${timestamp}.sql`;
  }

  // Execute database backup using pg_dump
  async createBackup() {
    const backupFile = this.generateFilename();
    const backupPath = path.join(config.backup.localPath, 'daily', backupFile);
    
    try {
      console.log(`Starting database backup: ${backupFile}`);
      const startTime = Date.now();

      // Parse database URL
      const dbUrl = new URL(config.supabase.dbUrl);
      const pgDumpCommand = `PGPASSWORD="${dbUrl.password}" pg_dump -h ${dbUrl.hostname} -p ${dbUrl.port} -U ${dbUrl.username} -d ${dbUrl.pathname.slice(1)} -f "${backupPath}" --verbose --no-owner --no-privileges`;

      // Execute pg_dump
      await execAsync(pgDumpCommand);

      // Compress the backup
      const compressedPath = `${backupPath}.gz`;
      await this.compressFile(backupPath, compressedPath);

      // Remove uncompressed file
      fs.unlinkSync(backupPath);

      const stats = fs.statSync(compressedPath);
      const duration = (Date.now() - startTime) / 1000;

      console.log(`Backup completed: ${backupFile}.gz (${this.formatBytes(stats.size)}) in ${duration}s`);

      return {
        filename: `${backupFile}.gz`,
        path: compressedPath,
        size: stats.size,
        duration,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  }

  // Compress file using gzip
  async compressFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('gzip', { gzip: true, zlib: { level: 9 } });

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      archive.file(inputPath, { name: path.basename(inputPath) });
      archive.finalize();
    });
  }

  // Upload backup to S3
  async uploadToS3(backupInfo) {
    try {
      console.log(`Uploading to S3: ${backupInfo.filename}`);
      
      const fileStream = fs.createReadStream(backupInfo.path);
      const s3Key = `database/${new Date().getFullYear()}/${backupInfo.filename}`;

      const params = {
        Bucket: config.s3.bucket,
        Key: s3Key,
        Body: fileStream,
        ContentType: 'application/gzip',
        ServerSideEncryption: 'AES256',
        StorageClass: 'STANDARD_IA',
        Metadata: {
          'backup-type': 'database',
          'backup-date': backupInfo.timestamp.toISOString(),
          'original-size': backupInfo.size.toString()
        }
      };

      const result = await s3.upload(params).promise();
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

  // Manage backup retention
  async cleanupOldBackups() {
    const types = ['daily', 'weekly', 'monthly'];
    
    for (const type of types) {
      const dir = path.join(config.backup.localPath, type);
      const files = fs.readdirSync(dir)
        .map(file => ({
          name: file,
          path: path.join(dir, file),
          stats: fs.statSync(path.join(dir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      const retentionCount = config.backup.retention[type];
      const filesToDelete = files.slice(retentionCount);

      filesToDelete.forEach(file => {
        console.log(`Deleting old backup: ${file.name}`);
        fs.unlinkSync(file.path);
      });
    }
  }

  // Promote backups (daily -> weekly -> monthly)
  async promoteBackups() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayOfMonth = now.getDate();

    // Promote daily to weekly (on Sundays)
    if (dayOfWeek === 0) {
      await this.promoteBackup('daily', 'weekly');
    }

    // Promote weekly to monthly (on the 1st)
    if (dayOfMonth === 1) {
      await this.promoteBackup('weekly', 'monthly');
    }
  }

  // Copy backup from one type to another
  async promoteBackup(fromType, toType) {
    const fromDir = path.join(config.backup.localPath, fromType);
    const toDir = path.join(config.backup.localPath, toType);
    
    const files = fs.readdirSync(fromDir)
      .map(file => ({
        name: file,
        path: path.join(fromDir, file),
        stats: fs.statSync(path.join(fromDir, file))
      }))
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

    if (files.length > 0) {
      const latestBackup = files[0];
      const newName = latestBackup.name.replace(`-${fromType}-`, `-${toType}-`);
      const newPath = path.join(toDir, newName);
      
      console.log(`Promoting backup: ${latestBackup.name} -> ${newName}`);
      fs.copyFileSync(latestBackup.path, newPath);
    }
  }

  // Send notification email
  async sendNotification(success, backupInfo, error = null) {
    if (!config.notification.recipients.length) {
      return;
    }

    const subject = success 
      ? '✅ Database Backup Successful'
      : '❌ Database Backup Failed';

    const html = success
      ? `
        <h2>Database Backup Completed Successfully</h2>
        <p><strong>Filename:</strong> ${backupInfo.filename}</p>
        <p><strong>Size:</strong> ${this.formatBytes(backupInfo.size)}</p>
        <p><strong>Duration:</strong> ${backupInfo.duration}s</p>
        <p><strong>S3 Location:</strong> ${backupInfo.s3Location || 'Not uploaded'}</p>
        <p><strong>Timestamp:</strong> ${backupInfo.timestamp}</p>
      `
      : `
        <h2>Database Backup Failed</h2>
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

  // Verify backup integrity
  async verifyBackup(backupPath) {
    try {
      // Basic verification - check if file exists and has content
      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }

      // TODO: Implement more thorough verification
      // - Test restore to temporary database
      // - Verify table counts
      // - Check data integrity

      return true;
    } catch (error) {
      console.error('Backup verification failed:', error);
      return false;
    }
  }

  // Format bytes to human readable
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Main backup process
  async run() {
    let backupInfo = null;
    
    try {
      // Create backup
      backupInfo = await this.createBackup();
      
      // Verify backup
      const isValid = await this.verifyBackup(backupInfo.path);
      if (!isValid) {
        throw new Error('Backup verification failed');
      }

      // Upload to S3
      if (config.s3.bucket) {
        backupInfo = await this.uploadToS3(backupInfo);
      }

      // Manage retention
      await this.cleanupOldBackups();
      
      // Promote backups
      await this.promoteBackups();

      // Send success notification
      await this.sendNotification(true, backupInfo);

      // Log to database
      await this.logBackup(backupInfo);
      
      console.log('Backup process completed successfully');
      return backupInfo;
    } catch (error) {
      console.error('Backup process failed:', error);
      
      // Send failure notification
      await this.sendNotification(false, backupInfo, error);
      
      throw error;
    }
  }

  // Log backup to database
  async logBackup(backupInfo) {
    try {
      const { error } = await supabase
        .from('backup_logs')
        .insert({
          backup_type: 'database',
          filename: backupInfo.filename,
          size_bytes: backupInfo.size,
          duration_seconds: backupInfo.duration,
          s3_location: backupInfo.s3Location,
          status: 'success',
          created_at: backupInfo.timestamp
        });

      if (error) {
        console.error('Failed to log backup:', error);
      }
    } catch (error) {
      console.error('Failed to log backup:', error);
    }
  }
}

// Run backup if called directly
if (require.main === module) {
  const backupService = new DatabaseBackupService();
  backupService.run()
    .then(() => {
      console.log('Backup completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Backup failed:', error);
      process.exit(1);
    });
}

export default DatabaseBackupService;