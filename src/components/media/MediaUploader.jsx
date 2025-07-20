import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, X, Image, Video, FileText, AlertCircle, 
  CheckCircle, Loader2, Eye, Trash2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';
import { storageService } from '@/services/storageService';
import { toast } from 'sonner';

const MediaUploader = ({
  bucket,
  maxFiles = 10,
  maxSize,
  accept,
  onUploadComplete,
  onFileRemove,
  existingFiles = [],
  prefix,
  className,
  disabled = false,
  showPreview = true,
  multiple = true
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState(existingFiles);

  // Get max size and allowed types from storage service if not provided
  const actualMaxSize = maxSize || storageService.maxSizes[bucket];
  const actualAccept = accept || storageService.allowedTypes[bucket];

  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map(({ file, errors }) => {
          const errorMessages = errors.map(e => e.message).join(', ');
          return `${file.name}: ${errorMessages}`;
        });
        toast.error('Some files were rejected', {
          description: errors.join('\n')
        });
      }
      // Add accepted files
      const newFiles = acceptedFiles.map(file => ({
        file,
        id: Math.random().toString(36).substring(7),
        status: 'pending',
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      }));

      setFiles(prev => [...prev, ...newFiles].slice(0, maxFiles));
    },
    [maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: actualAccept,
    maxSize: actualMaxSize,
    multiple,
    disabled: disabled || uploading,
    maxFiles: maxFiles - uploadedFiles.length
  });

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    // Clean up preview URL
    const file = files.find(f => f.id === fileId);
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }
  };

  const removeUploadedFile = async (file) => {
    if (onFileRemove) {
      await onFileRemove(file);
    } else {
      setUploadedFiles(prev => prev.filter(f => f.url !== file.url));
    }
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const filesToUpload = files.filter(f => f.status === 'pending');

    for (const fileItem of filesToUpload) {
      try {
        // Update status
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'uploading' } : f
        ));

        // Upload file
        const result = await storageService.uploadFile(
          fileItem.file,
          bucket,
          { prefix }
        );

        // Update status and add to uploaded
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'success', result } : f
        ));
        setUploadedFiles(prev => [...prev, result]);

        // Update progress
        setUploadProgress(prev => ({ ...prev, [fileItem.id]: 100 }));

      } catch (error) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'error', error: error.message } : f
        ));
        toast.error(`Failed to upload ${fileItem.file.name}`);
      }
    }

    setUploading(false);

    // Call completion callback
    if (onUploadComplete) {
      const successfulUploads = files
        .filter(f => f.status === 'success')
        .map(f => f.result);
      onUploadComplete([...uploadedFiles, ...successfulUploads]);
    }

    // Clean up completed files after delay
    setTimeout(() => {
      setFiles(prev => prev.filter(f => f.status !== 'success'));
      setUploadProgress({});
    }, 2000);
  };

  const getFileIcon = (file) => {
    const type = file.file?.type || file.type || '';
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (type.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalFiles = files.length + uploadedFiles.length;
  const canUpload = files.some(f => f.status === 'pending') && !uploading;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive && "border-primary bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed",
          !isDragActive && !disabled && "hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-sm font-medium">Drop the files here...</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              Drag & drop files here, or click to select
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {multiple ? `Up to ${maxFiles} files` : 'One file'}, 
              max {formatFileSize(actualMaxSize)} each
            </p>
          </>
        )}
      </div>