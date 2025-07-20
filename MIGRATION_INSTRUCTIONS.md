# Supabase Database Migration Instructions

Since the Supabase CLI login seems to be having issues, here are alternative methods to apply the database migrations:

## Method 1: Supabase Dashboard (Recommended)

1. **Open your Supabase project:**
   - Go to: https://app.supabase.com/project/yjskofrahipwryyhsxrc
   - Navigate to the SQL Editor section

2. **Apply the combined migration:**
   - Open the file: `supabase/combined-migrations.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press Ctrl+Enter

3. **Create storage buckets manually:**
   - Go to Storage section in Supabase Dashboard
   - Create these buckets with the specified settings:
     - `campaign-images` (public, 5MB limit, image types)
     - `campaign-videos` (public, 50MB limit, video types)
     - `update-media` (public, 10MB limit, image/video types)
     - `receipts` (private, 5MB limit, image/pdf types)
     - `avatars` (public, 1MB limit, image types)

## Method 2: Using Supabase CLI (If Login Works)

If you can get the Supabase CLI to work:

```bash
# 1. Login to Supabase
supabase login

# 2. Link your project
supabase link --project-ref yjskofrahipwryyhsxrc

# 3. Push the migrations
supabase db push

# 4. Reset the database (if needed)
supabase db reset
```

## Method 3: Using Service Role Key Directly

If you have `psql` installed:

```bash
# Connect using the service role key
psql "postgresql://postgres.yjskofrahipwryyhsxrc:sbp_e4feab0767ed3c9c635d8fb6179c5800cdb074ca@aws-0-eu-west-2.pooler.supabase.com:5432/postgres"

# Then run each migration file
\i supabase/migrations/001_initial_schema.sql
\i supabase/migrations/002_rls_policies.sql
```

## Verification Steps

After applying migrations, verify everything worked:

1. **Check Tables Created:**
   - In SQL Editor, run: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
   - Should see: user_profiles, campaigns, donations, etc.

2. **Check Types Created:**
   - Run: `SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace;`
   - Should see: campaign_status, trust_tier, etc.

3. **Check RLS Enabled:**
   - Run: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
   - All tables should show rowsecurity = true

4. **Test Basic Operations:**
   ```sql
   -- Test user profile creation
   INSERT INTO public.user_profiles (id, display_name, country_iso) 
   VALUES (auth.uid(), 'Test User', 'US');
   
   -- Test campaign query
   SELECT * FROM public.campaigns WHERE status = 'FUNDING';
   ```

## Troubleshooting

### If migrations fail:

1. **Check for existing objects:**
   ```sql
   -- Drop all tables if they exist
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```

2. **Apply migrations one by one:**
   - First run 001_initial_schema.sql
   - Then run 002_rls_policies.sql
   - Finally configure storage buckets

3. **Common errors:**
   - "type already exists" - Drop the type first
   - "permission denied" - Make sure you're using service role key
   - "relation does not exist" - Check migration order

## Next Steps

Once migrations are complete:
1. Update PROJECT_STATUS.md to mark Task #3 as complete
2. Test authentication and database connections
3. Proceed with Task #5: Enhanced Authentication System
