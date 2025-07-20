-- Storage bucket configuration for Blessed-Horizon
-- This migration sets up storage buckets for campaign media

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES 
    ('campaign-images', 'campaign-images', true, true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('campaign-videos', 'campaign-videos', true, false, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime']),
    ('update-media', 'update-media', true, true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']),
    ('receipts', 'receipts', false, true, 5242880, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
    ('avatars', 'avatars', true, true, 1048576, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Storage policies for campaign-images bucket
CREATE POLICY "Anyone can view campaign images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'campaign-images');

CREATE POLICY "Authenticated users can upload campaign images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'campaign-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own campaign images"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'campaign-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own campaign images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'campaign-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for campaign-videos bucket
CREATE POLICY "Anyone can view campaign videos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'campaign-videos');

CREATE POLICY "Authenticated users can upload campaign videos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'campaign-videos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own campaign videos"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'campaign-videos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own campaign videos"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'campaign-videos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for update-media bucket
CREATE POLICY "Anyone can view update media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'update-media');

CREATE POLICY "Campaign owners can upload update media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'update-media' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Campaign owners can update their update media"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'update-media' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Campaign owners can delete their update media"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'update-media' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for receipts bucket (private)
CREATE POLICY "Campaign owners and donors can view receipts"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'receipts'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR EXISTS (
                SELECT 1 FROM public.donations d
                JOIN public.campaigns c ON c.id = d.campaign_id
                WHERE d.donor_id = auth.uid() 
                AND c.id::text = (storage.foldername(name))[2]
            )
        )
    );

CREATE POLICY "Campaign owners can upload receipts"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'receipts' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for avatars bucket
CREATE POLICY "Anyone can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
