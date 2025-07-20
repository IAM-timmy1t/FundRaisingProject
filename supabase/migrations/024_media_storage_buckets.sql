-- Migration: Media Storage Configuration
-- Description: Set up Supabase Storage buckets for campaign media with proper access policies
-- Task: #20

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES 
  -- Campaign media bucket (public read)
  (
    'campaign-media',
    'campaign-media',
    true,
    true,
    52428800, -- 50MB limit
    ARRAY[
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ]
  ),
  
  -- Update media bucket (public read)
  (
    'update-media',
    'update-media',
    true,
    true,
    104857600, -- 100MB limit for video updates
    ARRAY[
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/mpeg'
    ]
  ),
  
  -- Receipt documents bucket (authenticated read)
  (
    'receipt-documents',
    'receipt-documents',
    false,
    false,
    10485760, -- 10MB limit
    ARRAY[
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf'
    ]
  ),
  
  -- User avatars bucket (public read)
  (
    'user-avatars',
    'user-avatars',
    true,
    true,
    5242880, -- 5MB limit
    ARRAY[
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif'
    ]
  ),
  
  -- Verification documents bucket (private)
  (
    'verification-documents',
    'verification-documents',
    false,
    false,
    20971520, -- 20MB limit
    ARRAY[
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf'
    ]
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  avif_autodetection = EXCLUDED.avif_autodetection,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for campaign-media bucket
CREATE POLICY "Public can view campaign media"
ON storage.objects FOR SELECT
USING (bucket_id = 'campaign-media');

CREATE POLICY "Authenticated users can upload campaign media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-media' 
  AND auth.role() = 'authenticated'
  AND (
    -- Check if user owns the campaign
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE id::text = SPLIT_PART(name, '/', 1)
      AND recipient_id = auth.uid()
    )
  )
);

CREATE POLICY "Campaign owners can update their media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'campaign-media'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE id::text = SPLIT_PART(name, '/', 1)
    AND recipient_id = auth.uid()
  )
);

CREATE POLICY "Campaign owners can delete their media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'campaign-media'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE id::text = SPLIT_PART(name, '/', 1)
    AND recipient_id = auth.uid()
  )
);

-- Storage policies for update-media bucket
CREATE POLICY "Public can view update media"
ON storage.objects FOR SELECT
USING (bucket_id = 'update-media');

CREATE POLICY "Campaign owners can upload update media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'update-media'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.campaign_updates u ON u.campaign_id = c.id
    WHERE u.id::text = SPLIT_PART(name, '/', 2)
    AND c.recipient_id = auth.uid()
  )
);

CREATE POLICY "Campaign owners can update their update media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'update-media'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.campaign_updates u ON u.campaign_id = c.id
    WHERE u.id::text = SPLIT_PART(name, '/', 2)
    AND c.recipient_id = auth.uid()
  )
);

CREATE POLICY "Campaign owners can delete their update media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'update-media'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.campaign_updates u ON u.campaign_id = c.id
    WHERE u.id::text = SPLIT_PART(name, '/', 2)
    AND c.recipient_id = auth.uid()
  )
);

-- Storage policies for receipt-documents bucket
CREATE POLICY "Authenticated users can view receipts for campaigns they donated to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipt-documents'
  AND auth.role() = 'authenticated'
  AND (
    -- Campaign owner can view
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE id::text = SPLIT_PART(name, '/', 1)
      AND recipient_id = auth.uid()
    )
    OR
    -- Donors can view receipts for campaigns they donated to
    EXISTS (
      SELECT 1 FROM public.donations d
      JOIN public.campaigns c ON c.id = d.campaign_id
      WHERE c.id::text = SPLIT_PART(name, '/', 1)
      AND d.donor_id = auth.uid()
    )
  )
);

CREATE POLICY "Campaign owners can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipt-documents'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE id::text = SPLIT_PART(name, '/', 1)
    AND recipient_id = auth.uid()
  )
);

CREATE POLICY "Campaign owners can update receipts"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'receipt-documents'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE id::text = SPLIT_PART(name, '/', 1)
    AND recipient_id = auth.uid()
  )
);

CREATE POLICY "Campaign owners can delete receipts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'receipt-documents'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE id::text = SPLIT_PART(name, '/', 1)
    AND recipient_id = auth.uid()
  )
);

-- Storage policies for user-avatars bucket
CREATE POLICY "Public can view user avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-avatars'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-avatars'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-avatars'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = SPLIT_PART(name, '/', 1)
);

-- Storage policies for verification-documents bucket
CREATE POLICY "Users can view their own verification documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-documents'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Users can upload verification documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification-documents'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Users cannot update verification documents"
ON storage.objects FOR UPDATE
USING (false);

CREATE POLICY "Users cannot delete verification documents"
ON storage.objects FOR DELETE
USING (false);

-- Create helper functions for storage operations
CREATE OR REPLACE FUNCTION get_storage_url(bucket text, path text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url text;
BEGIN
  -- Get the project URL from environment or settings
  SELECT current_setting('app.settings.supabase_url', true) INTO project_url;
  
  IF project_url IS NULL THEN
    project_url := 'https://your-project.supabase.co';
  END IF;
  
  RETURN project_url || '/storage/v1/object/public/' || bucket || '/' || path;
END;
$$;

-- Create function to clean up orphaned media
CREATE OR REPLACE FUNCTION cleanup_orphaned_media()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clean up campaign media not referenced in campaigns table
  DELETE FROM storage.objects
  WHERE bucket_id = 'campaign-media'
  AND created_at < NOW() - INTERVAL '24 hours'
  AND NOT EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE media_urls @> ARRAY[get_storage_url('campaign-media', name)]
  );
  
  -- Clean up update media not referenced in campaign_updates table
  DELETE FROM storage.objects
  WHERE bucket_id = 'update-media'
  AND created_at < NOW() - INTERVAL '24 hours'
  AND NOT EXISTS (
    SELECT 1 FROM public.campaign_updates
    WHERE media_urls @> ARRAY[get_storage_url('update-media', name)]
  );
  
  -- Clean up receipts not referenced
  DELETE FROM storage.objects
  WHERE bucket_id = 'receipt-documents'
  AND created_at < NOW() - INTERVAL '24 hours'
  AND NOT EXISTS (
    SELECT 1 FROM public.campaign_updates
    WHERE receipt_url = get_storage_url('receipt-documents', name)
  );
END;
$$;

-- Create scheduled job to clean up orphaned media (requires pg_cron extension)
-- Note: This needs to be run as superuser or configured separately
-- SELECT cron.schedule('cleanup-orphaned-media', '0 3 * * *', 'SELECT cleanup_orphaned_media();');

-- Add comments for documentation
COMMENT ON FUNCTION get_storage_url IS 'Generate public URL for storage objects';
COMMENT ON FUNCTION cleanup_orphaned_media IS 'Remove orphaned media files not referenced in database';