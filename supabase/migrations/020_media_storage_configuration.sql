-- Migration: Media Storage Configuration
-- Task #20: Set up Supabase Storage buckets for campaign media

-- Enable storage extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create storage buckets (Note: These need to be created via Supabase Dashboard or API)
-- The SQL below documents the bucket configuration

-- 1. Campaign Media Bucket
-- Bucket name: campaign-media
-- Public: true
-- Allowed MIME types: image/*, video/mp4, video/webm
-- Max file size: 50MB for images, 200MB for videos
-- File name pattern: {campaign_id}/{timestamp}-{random}.{ext}

-- 2. Update Media Bucket
-- Bucket name: update-media
-- Public: true
-- Allowed MIME types: image/*, video/mp4, video/webm
-- Max file size: 25MB for images, 100MB for videos
-- File name pattern: {update_id}/{timestamp}-{random}.{ext}

-- 3. Receipt Documents Bucket
-- Bucket name: receipt-documents
-- Public: false (authenticated access only)
-- Allowed MIME types: image/*, application/pdf
-- Max file size: 10MB
-- File name pattern: {campaign_id}/receipts/{timestamp}-{random}.{ext}

-- 4. User Avatars Bucket
-- Bucket name: user-avatars
-- Public: true
-- Allowed MIME types: image/*
-- Max file size: 5MB
-- File name pattern: {user_id}/avatar-{timestamp}.{ext}

-- 5. Verification Documents Bucket
-- Bucket name: verification-docs
-- Public: false (authenticated access only)
-- Allowed MIME types: image/*, application/pdf
-- Max file size: 10MB
-- File name pattern: {user_id}/verification/{doc_type}-{timestamp}.{ext}

-- Create storage policies for campaign-media bucket
INSERT INTO storage.policies (bucket_id, name, definition, check_expression)
VALUES 
  ('campaign-media', 'Public read access', 
   '{"operation": "SELECT", "isolation_level": "read committed"}', 
   'true'),
   
  ('campaign-media', 'Authenticated users can upload', 
   '{"operation": "INSERT", "isolation_level": "read committed"}', 
   'auth.uid() IS NOT NULL'),
   
  ('campaign-media', 'Campaign owners can update', 
   '{"operation": "UPDATE", "isolation_level": "read committed"}', 
   'auth.uid() IN (
     SELECT recipient_id FROM public.campaigns 
     WHERE id = (storage.foldername(name))[1]::uuid
   )'),
   
  ('campaign-media', 'Campaign owners can delete', 
   '{"operation": "DELETE", "isolation_level": "read committed"}', 
   'auth.uid() IN (
     SELECT recipient_id FROM public.campaigns 
     WHERE id = (storage.foldername(name))[1]::uuid
   )')
ON CONFLICT DO NOTHING;

-- Create storage policies for update-media bucket
INSERT INTO storage.policies (bucket_id, name, definition, check_expression)
VALUES 
  ('update-media', 'Public read access', 
   '{"operation": "SELECT", "isolation_level": "read committed"}', 
   'true'),
   
  ('update-media', 'Campaign owners can upload', 
   '{"operation": "INSERT", "isolation_level": "read committed"}', 
   'auth.uid() IN (
     SELECT c.recipient_id 
     FROM public.campaigns c
     JOIN public.campaign_updates cu ON cu.campaign_id = c.id
     WHERE cu.id = (storage.foldername(name))[1]::uuid
   )'),
   
  ('update-media', 'Campaign owners can update', 
   '{"operation": "UPDATE", "isolation_level": "read committed"}', 
   'auth.uid() IN (
     SELECT c.recipient_id 
     FROM public.campaigns c
     JOIN public.campaign_updates cu ON cu.campaign_id = c.id
     WHERE cu.id = (storage.foldername(name))[1]::uuid
   )'),
   
  ('update-media', 'Campaign owners can delete', 
   '{"operation": "DELETE", "isolation_level": "read committed"}', 
   'auth.uid() IN (
     SELECT c.recipient_id 
     FROM public.campaigns c
     JOIN public.campaign_updates cu ON cu.campaign_id = c.id
     WHERE cu.id = (storage.foldername(name))[1]::uuid
   )')
ON CONFLICT DO NOTHING;

-- Create storage policies for receipt-documents bucket
INSERT INTO storage.policies (bucket_id, name, definition, check_expression)
VALUES 
  ('receipt-documents', 'Authenticated read access', 
   '{"operation": "SELECT", "isolation_level": "read committed"}', 
   'auth.uid() IS NOT NULL'),
   
  ('receipt-documents', 'Campaign owners can upload', 
   '{"operation": "INSERT", "isolation_level": "read committed"}', 
   'auth.uid() IN (
     SELECT recipient_id FROM public.campaigns 
     WHERE id = (storage.foldername(name))[1]::uuid
   )'),
   
  ('receipt-documents', 'Campaign owners can delete', 
   '{"operation": "DELETE", "isolation_level": "read committed"}', 
   'auth.uid() IN (
     SELECT recipient_id FROM public.campaigns 
     WHERE id = (storage.foldername(name))[1]::uuid
   )')
ON CONFLICT DO NOTHING;

-- Create storage policies for user-avatars bucket
INSERT INTO storage.policies (bucket_id, name, definition, check_expression)
VALUES 
  ('user-avatars', 'Public read access', 
   '{"operation": "SELECT", "isolation_level": "read committed"}', 
   'true'),
   
  ('user-avatars', 'Users can upload own avatar', 
   '{"operation": "INSERT", "isolation_level": "read committed"}', 
   'auth.uid()::text = (storage.foldername(name))[1]'),
   
  ('user-avatars', 'Users can update own avatar', 
   '{"operation": "UPDATE", "isolation_level": "read committed"}', 
   'auth.uid()::text = (storage.foldername(name))[1]'),
   
  ('user-avatars', 'Users can delete own avatar', 
   '{"operation": "DELETE", "isolation_level": "read committed"}', 
   'auth.uid()::text = (storage.foldername(name))[1]')
ON CONFLICT DO NOTHING;

-- Create storage policies for verification-docs bucket
INSERT INTO storage.policies (bucket_id, name, definition, check_expression)
VALUES 
  ('verification-docs', 'Users can read own docs', 
   '{"operation": "SELECT", "isolation_level": "read committed"}', 
   'auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IN (
     SELECT id FROM auth.users WHERE raw_user_meta_data->>"role" = "admin"
   )'),
   
  ('verification-docs', 'Users can upload own docs', 
   '{"operation": "INSERT", "isolation_level": "read committed"}', 
   'auth.uid()::text = (storage.foldername(name))[1]'),
   
  ('verification-docs', 'Users can delete own docs', 
   '{"operation": "DELETE", "isolation_level": "read committed"}', 
   'auth.uid()::text = (storage.foldername(name))[1]')
ON CONFLICT DO NOTHING;

-- Create function to validate file uploads
CREATE OR REPLACE FUNCTION validate_file_upload(
  bucket_name text,
  file_name text,
  file_size bigint,
  mime_type text
) RETURNS boolean AS $$
DECLARE
  max_size bigint;
  allowed_types text[];
BEGIN
  -- Set limits based on bucket
  CASE bucket_name
    WHEN 'campaign-media' THEN
      IF mime_type LIKE 'image/%' THEN
        max_size := 50 * 1024 * 1024; -- 50MB
      ELSIF mime_type IN ('video/mp4', 'video/webm') THEN
        max_size := 200 * 1024 * 1024; -- 200MB
      ELSE
        RETURN false;
      END IF;
      
    WHEN 'update-media' THEN
      IF mime_type LIKE 'image/%' THEN
        max_size := 25 * 1024 * 1024; -- 25MB
      ELSIF mime_type IN ('video/mp4', 'video/webm') THEN
        max_size := 100 * 1024 * 1024; -- 100MB
      ELSE
        RETURN false;
      END IF;
      
    WHEN 'receipt-documents' THEN
      max_size := 10 * 1024 * 1024; -- 10MB
      IF mime_type NOT LIKE 'image/%' AND mime_type != 'application/pdf' THEN
        RETURN false;
      END IF;
      
    WHEN 'user-avatars' THEN
      max_size := 5 * 1024 * 1024; -- 5MB
      IF mime_type NOT LIKE 'image/%' THEN
        RETURN false;
      END IF;
      
    WHEN 'verification-docs' THEN
      max_size := 10 * 1024 * 1024; -- 10MB
      IF mime_type NOT LIKE 'image/%' AND mime_type != 'application/pdf' THEN
        RETURN false;
      END IF;
      
    ELSE
      RETURN false;
  END CASE;
  
  -- Check file size
  IF file_size > max_size THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate optimized file names
CREATE OR REPLACE FUNCTION generate_storage_filename(
  bucket_name text,
  original_filename text,
  folder_id uuid DEFAULT NULL,
  doc_type text DEFAULT NULL
) RETURNS text AS $$
DECLARE
  file_ext text;
  timestamp_str text;
  random_str text;
  new_filename text;
BEGIN
  -- Extract file extension
  file_ext := lower(split_part(original_filename, '.', -1));
  
  -- Generate timestamp and random string
  timestamp_str := to_char(now(), 'YYYYMMDD-HH24MISS');
  random_str := substr(md5(random()::text), 1, 8);
  
  -- Generate filename based on bucket
  CASE bucket_name
    WHEN 'campaign-media' THEN
      new_filename := folder_id::text || '/' || timestamp_str || '-' || random_str || '.' || file_ext;
      
    WHEN 'update-media' THEN
      new_filename := folder_id::text || '/' || timestamp_str || '-' || random_str || '.' || file_ext;
      
    WHEN 'receipt-documents' THEN
      new_filename := folder_id::text || '/receipts/' || timestamp_str || '-' || random_str || '.' || file_ext;
      
    WHEN 'user-avatars' THEN
      new_filename := folder_id::text || '/avatar-' || timestamp_str || '.' || file_ext;
      
    WHEN 'verification-docs' THEN
      new_filename := folder_id::text || '/verification/' || doc_type || '-' || timestamp_str || '.' || file_ext;
      
    ELSE
      new_filename := timestamp_str || '-' || random_str || '.' || file_ext;
  END CASE;
  
  RETURN new_filename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up orphaned media
CREATE OR REPLACE FUNCTION cleanup_orphaned_media()
RETURNS void AS $$
DECLARE
  orphaned_record RECORD;
BEGIN
  -- Find campaign media without corresponding campaigns
  FOR orphaned_record IN
    SELECT cm.id, cm.media_url
    FROM campaign_media cm
    LEFT JOIN campaigns c ON c.id = cm.campaign_id
    WHERE c.id IS NULL
  LOOP
    -- Delete from storage (handled by trigger)
    DELETE FROM campaign_media WHERE id = orphaned_record.id;
  END LOOP;
  
  -- Find update media without corresponding updates
  -- (Similar logic for other media types)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to delete storage files when database records are deleted
CREATE OR REPLACE FUNCTION delete_storage_file()
RETURNS TRIGGER AS $$
DECLARE
  bucket_name text;
  file_path text;
BEGIN
  -- Determine bucket and path based on table
  IF TG_TABLE_NAME = 'campaign_media' THEN
    bucket_name := 'campaign-media';
    file_path := substring(OLD.media_url from position('/campaign-media/' in OLD.media_url) + 16);
  ELSIF TG_TABLE_NAME = 'user_profiles' AND OLD.avatar_url IS NOT NULL THEN
    bucket_name := 'user-avatars';
    file_path := substring(OLD.avatar_url from position('/user-avatars/' in OLD.avatar_url) + 14);
  END IF;
  
  -- Note: Actual storage deletion needs to be handled via edge function
  -- This trigger just prepares the data
  IF bucket_name IS NOT NULL AND file_path IS NOT NULL THEN
    INSERT INTO storage_deletion_queue (bucket_name, file_path, created_at)
    VALUES (bucket_name, file_path, now());
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage deletion queue table
CREATE TABLE IF NOT EXISTS storage_deletion_queue (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  bucket_name text NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  error text
);

-- Apply deletion trigger to relevant tables
DROP TRIGGER IF EXISTS delete_campaign_media_file ON campaign_media;
CREATE TRIGGER delete_campaign_media_file
  BEFORE DELETE ON campaign_media
  FOR EACH ROW
  EXECUTE FUNCTION delete_storage_file();

DROP TRIGGER IF EXISTS delete_user_avatar_file ON user_profiles;
CREATE TRIGGER delete_user_avatar_file
  BEFORE UPDATE OF avatar_url ON user_profiles
  FOR EACH ROW
  WHEN (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url AND OLD.avatar_url IS NOT NULL)
  EXECUTE FUNCTION delete_storage_file();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_storage_deletion_queue_unprocessed 
  ON storage_deletion_queue(created_at) 
  WHERE processed_at IS NULL;

-- Add comments for documentation
COMMENT ON FUNCTION validate_file_upload IS 'Validates file uploads against bucket-specific rules for size and MIME type';
COMMENT ON FUNCTION generate_storage_filename IS 'Generates standardized filenames for storage buckets with proper folder structure';
COMMENT ON FUNCTION cleanup_orphaned_media IS 'Removes media records that no longer have associated parent records';
COMMENT ON TABLE storage_deletion_queue IS 'Queue for files that need to be deleted from storage buckets';
