-- Real-time Update Tracking Functions
-- Required for tracking views, reactions, and presence

-- Create update reactions table
CREATE TABLE IF NOT EXISTS public.update_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    update_id UUID NOT NULL REFERENCES public.campaign_updates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'pray', 'support')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(update_id, user_id, reaction_type)
);

-- Create update comments table
CREATE TABLE IF NOT EXISTS public.update_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    update_id UUID NOT NULL REFERENCES public.campaign_updates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create update views tracking table
CREATE TABLE IF NOT EXISTS public.update_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    update_id UUID NOT NULL REFERENCES public.campaign_updates(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    ip_address INET,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(update_id, viewer_id)
);

-- Add donor_reactions column to campaign_updates if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaign_updates' 
                   AND column_name = 'donor_reactions') THEN
        ALTER TABLE public.campaign_updates 
        ADD COLUMN donor_reactions JSONB DEFAULT '{"likes": 0, "comments": 0, "views": 0}'::jsonb;
    END IF;
END $$;

-- Function to increment update views atomically
CREATE OR REPLACE FUNCTION public.increment_update_views(
    update_id UUID,
    viewer_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    view_count INTEGER;
BEGIN
    -- Insert or update view record
    INSERT INTO public.update_views (update_id, viewer_id)
    VALUES (update_id, viewer_id)
    ON CONFLICT (update_id, viewer_id) 
    DO UPDATE SET viewed_at = NOW();

    -- Get total view count
    SELECT COUNT(*)::INTEGER INTO view_count 
    FROM public.update_views 
    WHERE update_views.update_id = increment_update_views.update_id;

    -- Update the donor_reactions JSONB
    UPDATE public.campaign_updates
    SET donor_reactions = jsonb_set(
        COALESCE(donor_reactions, '{}'::jsonb),
        '{views}',
        to_jsonb(view_count)
    )
    WHERE id = increment_update_views.update_id;

    RETURN view_count;
END;
$$;

-- Function to toggle update reaction
CREATE OR REPLACE FUNCTION public.toggle_update_reaction(
    p_update_id UUID,
    p_user_id UUID,
    p_reaction_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exists BOOLEAN;
    v_likes_count INTEGER;
    v_result JSONB;
BEGIN
    -- Check if reaction exists
    SELECT EXISTS (
        SELECT 1 FROM public.update_reactions 
        WHERE update_id = p_update_id 
        AND user_id = p_user_id 
        AND reaction_type = p_reaction_type
    ) INTO v_exists;

    IF v_exists THEN
        -- Remove reaction
        DELETE FROM public.update_reactions
        WHERE update_id = p_update_id 
        AND user_id = p_user_id 
        AND reaction_type = p_reaction_type;
    ELSE
        -- Add reaction
        INSERT INTO public.update_reactions (update_id, user_id, reaction_type)
        VALUES (p_update_id, p_user_id, p_reaction_type);
    END IF;

    -- Count total likes (all reaction types)
    SELECT COUNT(*)::INTEGER INTO v_likes_count
    FROM public.update_reactions
    WHERE update_id = p_update_id;

    -- Update donor_reactions count
    UPDATE public.campaign_updates
    SET donor_reactions = jsonb_set(
        COALESCE(donor_reactions, '{}'::jsonb),
        '{likes}',
        to_jsonb(v_likes_count)
    )
    WHERE id = p_update_id;

    -- Return result
    v_result := jsonb_build_object(
        'reacted', NOT v_exists,
        'reaction_type', p_reaction_type,
        'total_likes', v_likes_count
    );

    RETURN v_result;
END;
$$;

-- Function to add update comment
CREATE OR REPLACE FUNCTION public.add_update_comment(
    p_update_id UUID,
    p_user_id UUID,
    p_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_comment_id UUID;
    v_comment_count INTEGER;
BEGIN
    -- Insert comment
    INSERT INTO public.update_comments (update_id, user_id, content)
    VALUES (p_update_id, p_user_id, p_content)
    RETURNING id INTO v_comment_id;

    -- Count total comments
    SELECT COUNT(*)::INTEGER INTO v_comment_count
    FROM public.update_comments
    WHERE update_id = p_update_id
    AND is_deleted = FALSE;

    -- Update donor_reactions count
    UPDATE public.campaign_updates
    SET donor_reactions = jsonb_set(
        COALESCE(donor_reactions, '{}'::jsonb),
        '{comments}',
        to_jsonb(v_comment_count)
    )
    WHERE id = p_update_id;

    RETURN v_comment_id;
END;
$$;

-- Function to get update reactions for a user
CREATE OR REPLACE FUNCTION public.get_user_update_reactions(
    p_update_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reactions TEXT[];
BEGIN
    SELECT ARRAY_AGG(reaction_type) INTO v_reactions
    FROM public.update_reactions
    WHERE update_id = p_update_id
    AND user_id = p_user_id;

    RETURN jsonb_build_object(
        'reactions', COALESCE(v_reactions, ARRAY[]::TEXT[]),
        'has_liked', 'like' = ANY(COALESCE(v_reactions, ARRAY[]::TEXT[])),
        'has_loved', 'love' = ANY(COALESCE(v_reactions, ARRAY[]::TEXT[])),
        'has_prayed', 'pray' = ANY(COALESCE(v_reactions, ARRAY[]::TEXT[])),
        'has_supported', 'support' = ANY(COALESCE(v_reactions, ARRAY[]::TEXT[]))
    );
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_update_reactions_update_id ON public.update_reactions(update_id);
CREATE INDEX IF NOT EXISTS idx_update_reactions_user_id ON public.update_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_update_comments_update_id ON public.update_comments(update_id);
CREATE INDEX IF NOT EXISTS idx_update_views_update_id ON public.update_views(update_id);

-- RLS Policies for new tables
ALTER TABLE public.update_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_views ENABLE ROW LEVEL SECURITY;

-- Anyone can view reactions
CREATE POLICY "Anyone can view reactions" ON public.update_reactions
    FOR SELECT USING (true);

-- Authenticated users can manage their own reactions
CREATE POLICY "Users can manage own reactions" ON public.update_reactions
    FOR ALL USING (auth.uid() = user_id);

-- Anyone can view comments
CREATE POLICY "Anyone can view comments" ON public.update_comments
    FOR SELECT USING (true);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments" ON public.update_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON public.update_comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Anyone can view update views
CREATE POLICY "Anyone can view update views" ON public.update_views
    FOR SELECT USING (true);

-- System can create views
CREATE POLICY "System can create views" ON public.update_views
    FOR INSERT WITH CHECK (true);

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.update_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.update_comments;

-- Grant necessary permissions
GRANT ALL ON public.update_reactions TO authenticated;
GRANT ALL ON public.update_comments TO authenticated;
GRANT ALL ON public.update_views TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_update_views TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.toggle_update_reaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_update_comment TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_update_reactions TO authenticated;
