# Blessed-Horizon Quick Start Guide

## Step 1: Project Rebranding (Task #1)

### Files to Update:
1. `index.html` - Change title to "Blessed-Horizon"
2. `package.json` - Update project name
3. `src/App.jsx` - Update any branded text
4. `src/i18n.js` - Update translation keys
5. Search entire codebase for "Hostinger Horizons" references

### Commands:
```bash
# Search for all occurrences
grep -r "Hostinger Horizons" .
grep -r "hostinger" . --ignore-case
```

## Step 2: Supabase Setup (Task #2)

### 1. Create Supabase Project
- Go to https://supabase.com
- Create new project "blessed-horizon"
- Save credentials to `.env.local`:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Update Supabase Client
Update `src/lib/customSupabaseClient.js`:
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
```

### 3. Enable Authentication Providers
In Supabase dashboard:
- Enable Email/Password auth
- Enable Google OAuth
- Enable Apple OAuth
- Set up redirect URLs

## Step 3: Database Schema (Task #3)

### Create Migration Files:
Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User profiles (extends auth.users)
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    display_name VARCHAR(100),
    country_iso CHAR(2),
    preferred_language CHAR(2) DEFAULT 'en',
    date_of_birth DATE,
    verified_status VARCHAR(20) DEFAULT 'unverified',
    risk_score INTEGER DEFAULT 0,
    trust_score FLOAT DEFAULT 50.0,
    trust_tier VARCHAR(20) DEFAULT 'NEW',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaigns
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES auth.users(id) NOT NULL,
    title VARCHAR(80) NOT NULL,
    need_type VARCHAR(30) NOT NULL,
    goal_amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) DEFAULT 'GBP',
    deadline TIMESTAMP WITH TIME ZONE,
    story_markdown TEXT,
    scripture_reference TEXT,
    budget_breakdown JSONB,
    status VARCHAR(30) DEFAULT 'DRAFT',
    raised_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add more tables as needed...
```

### Run Migrations:
```bash
npx supabase db push
```

## Step 4: RLS Policies (Task #4)

Create `supabase/migrations/002_rls_policies.sql`:

```sql
-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- User profile policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON user_profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update own profile" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = id);

-- Campaign policies
CREATE POLICY "Campaigns are viewable by everyone" 
ON campaigns FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own campaigns" 
ON campaigns FOR INSERT 
WITH CHECK (auth.uid() = recipient_id);
```

## Step 5: Create First Components

### Campaign Model (`src/models/Campaign.js`):
```javascript
export const CampaignStatus = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  FUNDING: 'FUNDING',
  FUNDED: 'FUNDED',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED'
}

export const NeedType = {
  EMERGENCY: 'EMERGENCY',
  COMMUNITY_LONG_TERM: 'COMMUNITY_LONG_TERM'
}
```

### Campaign Service (`src/services/campaignService.js`):
```javascript
import { supabase } from '@/lib/customSupabaseClient'

export const campaignService = {
  async create(campaignData) {
    const { data, error } = await supabase
      .from('campaigns')
      .insert(campaignData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getAll() {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*, user_profiles(*)')
      .eq('status', 'FUNDING')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }
}
```

## Testing Your Setup

### 1. Test Database Connection:
```javascript
// In browser console
const { data, error } = await supabase.auth.getSession()
console.log('Session:', data)
```

### 2. Test Table Access:
```javascript
const { data, error } = await supabase.from('campaigns').select('*')
console.log('Campaigns:', data)
```

### 3. Run Development Server:
```bash
npm run dev
```

## Common Issues and Solutions

### CORS Errors:
- Add your local URL to Supabase allowed URLs
- Check API keys are correct

### Database Errors:
- Ensure migrations ran successfully
- Check RLS policies aren't too restrictive
- Verify foreign key relationships

### Build Errors:
- Clear node_modules and reinstall
- Check for TypeScript errors
- Ensure all imports are correct

## Next Tasks Priority:
1. Complete rebranding (Task #1)
2. Set up Supabase (Task #2)
3. Implement core database tables (Task #3)
4. Add RLS policies (Task #4)
5. Create campaign CRUD operations (Task #7)
6. Build campaign creation UI (Task #8)

Remember to commit your changes frequently and test each feature as you build it!
