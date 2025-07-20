-- Enable Realtime for campaign_updates table
ALTER PUBLICATION supabase_realtime ADD TABLE campaign_updates;

-- Enable Realtime for donations table
ALTER PUBLICATION supabase_realtime ADD TABLE donations;

-- Create update reactions table
CREATE TABLE IF NOT EXISTS update_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  update_id UUID REFERENCES campaign_updates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(50) DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(update_id, user_id, reaction_type)
);

-- Create update comments table
CREATE TABLE IF NOT EXISTS update_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  update_id UUID REFERENCES campaign_updates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create update views tracking table
CREATE TABLE IF NOT EXISTS update_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  update_id UUID REFERENCES campaign_updates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(update_id, user_id)
);

-- Add view_count, like_count, comment_count columns to campaign_updates
ALTER TABLE campaign_updates 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- Enable Realtime for interaction tables
ALTER PUBLICATION supabase_realtime ADD TABLE update_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE update_comments;

-- Create function to increment update views atomically
CREATE OR REPLACE FUNCTION increment_update_views(
  update_id UUID,
  viewer_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  -- Track individual view if viewer_id provided
  IF viewer_id IS NOT NULL THEN
    INSERT INTO update_views (update_id, user_id)
    VALUES (increment_update_views.update_id, viewer_id)
    ON CONFLICT (update_id, user_id) DO NOTHING;
  END IF;

  -- Increment view count
  UPDATE campaign_updates
  SET view_count = view_count + 1
  WHERE id = increment_update_views.update_id
  RETURNING view_count INTO new_count;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update like_count
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE campaign_updates
    SET like_count = like_count + 1
    WHERE id = NEW.update_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE campaign_updates
    SET like_count = like_count - 1
    WHERE id = OLD.update_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_like_count_trigger
AFTER INSERT OR DELETE ON update_reactions
FOR EACH ROW
EXECUTE FUNCTION update_like_count();

-- Create trigger to update comment_count
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE campaign_updates
    SET comment_count = comment_count + 1
    WHERE id = NEW.update_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE campaign_updates
    SET comment_count = comment_count - 1
    WHERE id = OLD.update_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comment_count_trigger
AFTER INSERT OR DELETE ON update_comments
FOR EACH ROW
EXECUTE FUNCTION update_comment_count();

-- Create RLS policies for new tables
ALTER TABLE update_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_views ENABLE ROW LEVEL SECURITY;

-- Reactions policies
CREATE POLICY "Users can view all reactions"
  ON update_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own reactions"
  ON update_reactions FOR ALL
  USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Users can view all comments"
  ON update_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments when authenticated"
  ON update_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON update_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON update_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Views policies
CREATE POLICY "Users can view all views"
  ON update_views FOR SELECT
  USING (true);

CREATE POLICY "Users can track their own views"
  ON update_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_update_reactions_update_id ON update_reactions(update_id);
CREATE INDEX IF NOT EXISTS idx_update_comments_update_id ON update_comments(update_id);
CREATE INDEX IF NOT EXISTS idx_update_views_update_id ON update_views(update_id);