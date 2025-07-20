# Supabase Configuration for Blessed-Horizon

## Overview
This directory contains the Supabase configuration for the Blessed-Horizon faith-based crowdfunding platform.

## Initial Setup

### 1. Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project called "blessed-horizon"
3. Save your project credentials

### 2. Update Environment Variables
Update the `.env.local` file with your actual Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 3. Install Supabase CLI (Optional for local development)
```bash
npm install -g supabase
```

### 4. Link to your Supabase project
```bash
supabase link --project-ref your-project-ref
```

### 5. Run Database Migrations
```bash
# Push migrations to your Supabase project
supabase db push

# Or run migrations locally
supabase db reset
```

## Database Schema

The database includes the following main tables:

### Core Tables
- **user_profiles** - Extended user information including trust scores
- **campaigns** - Crowdfunding campaigns with all details
- **donations** - Payment records and donor information
- **campaign_updates** - Progress updates from recipients
- **trust_score_events** - Trust score calculation history

### Supporting Tables
- **campaign_milestones** - Campaign funding milestones
- **notifications** - User notification system
- **messages** - Donor-recipient communication
- **moderation_queue** - Campaign review system
- **media_files** - File upload tracking

## Storage Buckets

The following storage buckets are configured:
- **campaign-images** - Public images for campaigns
- **campaign-videos** - Public videos for campaigns
- **update-media** - Media for campaign updates
- **receipts** - Private receipt uploads
- **avatars** - User profile pictures

## Authentication

Configured authentication providers:
- Email/Password
- Google OAuth
- Apple OAuth

## Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only modify their own data
- Public campaigns are viewable by everyone
- Private data is properly protected
- Donors can view their donation history

## Edge Functions

Edge functions will be added in the `functions/` directory for:
- Payment webhook handling
- Trust score calculations
- Content moderation
- Email notifications

## Local Development

To run Supabase locally:
```bash
supabase start
```

This will start:
- PostgreSQL database (port 54322)
- Auth server (port 54321)
- Storage server
- Realtime server
- Studio UI (port 54323)

## Testing

Test database connections:
```javascript
const { data, error } = await supabase.auth.getSession()
console.log('Session:', data)
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Add your local URL to Supabase Auth settings
   - Check API keys are correct

2. **Database Connection Failed**
   - Ensure migrations have run
   - Check RLS policies aren't too restrictive
   - Verify environment variables are loaded

3. **Storage Upload Errors**
   - Check bucket policies
   - Ensure file size limits aren't exceeded
   - Verify MIME types are allowed

## Next Steps

1. Complete environment variable configuration
2. Run database migrations
3. Configure authentication providers in Supabase dashboard
4. Test basic CRUD operations
5. Set up Edge Functions for business logic
