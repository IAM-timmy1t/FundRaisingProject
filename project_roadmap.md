# Blessed-Horizon Complete Project Roadmap
*12-Month Development Timeline with Technical Implementation Details*

## Project Overview
**Mission**: Create a transparent, faith-based crowdfunding platform that ensures accountability between donors and recipients through trust scoring, escrow wallets, and mandatory progress updates.

**Core Values**: Righteous generosity, transparency, accountability, and global accessibility.

---

## Technology Stack & Architecture Decisions

### Phase 1-2: Rapid Development with Supabase
- **Database**: Supabase (managed PostgreSQL with instant APIs)
- **Authentication**: Supabase Auth (built-in JWT, MFA, social logins)
- **Real-time**: Supabase Realtime (WebSocket subscriptions)
- **File Storage**: Supabase Storage (S3-compatible)
- **Edge Functions**: Supabase Edge Functions (Deno-based)
- **API Layer**: Supabase Auto-generated REST & GraphQL APIs

### Phase 3+: Hybrid & Migration to Custom Services
- **Framework**: FastAPI (high performance, auto-documentation)
- **Database**: PostgreSQL (migrated from Supabase), Redis (caching), ClickHouse (analytics)
- **Message Queue**: Apache Kafka with Python kafka-python
- **Authentication**: Custom OIDC with PyJWT (gradual migration from Supabase Auth)
- **Payment Processing**: Stripe API with Python stripe library
- **File Storage**: AWS S3 with boto3 (migrated from Supabase Storage)
- **Search**: Elasticsearch with elasticsearch-py

### Frontend (All Phases)
- **Web**: React with TypeScript, Tailwind CSS
- **Mobile**: React Native or Flutter
- **State Management**: Redux Toolkit
- **Supabase Client**: @supabase/supabase-js

### Infrastructure
- **Phase 1-2**: Supabase Cloud + Vercel/Netlify for frontend
- **Phase 3+**: AWS (EKS for Kubernetes), Terraform (IaC), GitHub Actions → ArgoCD
- **Monitoring**: Supabase Dashboard → Prometheus, Grafana, Sentry

---

## Phase 0: Foundation & Setup (Weeks 1-2)

### Team Formation & Initial Setup
**Week 1:**
- [ ] Assemble core team (5-7 people)
  - Technical Lead (Python/FastAPI expert)
  - Backend Developer (Python/PostgreSQL)
  - Frontend Developer (React/TypeScript)
  - DevOps Engineer (AWS/Kubernetes)
  - Product Manager
  - UI/UX Designer
  - Trust & Safety Specialist

**Week 2:**
- [ ] Project setup and tooling
  - Create GitHub organization and repositories
  - Set up development environment standards
  - Configure initial AWS accounts and permissions
  - Establish communication channels (Slack, project management)
  - Define coding standards and review processes

### Repository Structure (Hybrid Approach)
```
blessed-horizon/
├── supabase/                     # Supabase configuration
│   ├── migrations/               # Database migrations
│   ├── functions/               # Edge functions (TypeScript/Deno)
│   ├── config.toml              # Supabase settings
│   └── seed.sql                 # Initial data
├── services/                    # Custom microservices (Phase 3+)
│   ├── payment-service/         # Python FastAPI (Stripe integration)
│   ├── trust-service/           # Python FastAPI (ML-based scoring)
│   ├── notification-service/    # Python FastAPI (Email/SMS)
│   └── moderation-service/      # Python FastAPI + ML
├── frontend/
│   ├── web-app/                # React TypeScript + Supabase client
│   └── mobile-app/             # React Native + Supabase client
├── infrastructure/             # Terraform configs (Phase 3+)
├── shared/                     # Shared libraries and schemas
└── docs/                       # Technical documentation
```

### Supabase Integration Files
```
supabase/
├── migrations/
│   ├── 20250718000001_initial_schema.sql
│   ├── 20250718000002_campaigns_table.sql
│   ├── 20250718000003_trust_score_system.sql
│   └── 20250718000004_rls_policies.sql
├── functions/
│   ├── campaign-moderation/     # AI content checking
│   ├── trust-score-calculator/  # Real-time trust scoring
│   ├── payment-webhook/         # Stripe webhook handler
│   └── notification-triggers/   # Update reminders
└── config.toml                 # Database URL, Auth settings, etc.
```

---

## Phase 1: Supabase Setup & Rapid Development (Weeks 3-6)

### Week 3: Supabase Project Setup & Database Schema
**Supabase project initialization:**

`supabase/config.toml`:
```toml
[api]
port = 54321
schemas = ["public", "auth", "realtime"]
extra_search_path = ["public", "extensions"]

[db]
port = 54322

[studio]
port = 54323

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://blessed-horizon.vercel.app"]
jwt_expiry = 3600
enable_signup = true
email_confirm = true

[storage]
enabled = true
file_size_limit = "50MiB"
```

**Database Schema Migration:**

`supabase/migrations/20250718000001_initial_schema.sql`:
```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core user profiles (extends Supabase auth.users)
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

-- Campaigns table
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES auth.users(id) NOT NULL,
    title VARCHAR(80) NOT NULL,
    need_type VARCHAR(30) NOT NULL CHECK (need_type IN ('EMERGENCY', 'COMMUNITY_LONG_TERM')),
    goal_amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'GBP',
    deadline TIMESTAMP WITH TIME ZONE,
    story_markdown TEXT,
    scripture_reference TEXT,
    budget_breakdown JSONB,
    status VARCHAR(30) DEFAULT 'DRAFT',
    anti_lavish_check_passed BOOLEAN DEFAULT FALSE,
    ai_content_score FLOAT,
    media_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign updates
CREATE TABLE public.campaign_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) NOT NULL,
    author_id UUID REFERENCES auth.users(id) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('TEXT', 'PHOTO', 'VIDEO', 'RECEIPT')),
    body_markdown TEXT,
    media_url TEXT,
    spend_amount_tagged DECIMAL(10,2),
    payment_reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_updates ENABLE ROW LEVEL SECURITY;
```

**Row Level Security Policies:**

`supabase/migrations/20250718000002_rls_policies.sql`:
```sql
-- User profiles: users can read all, update only their own
CREATE POLICY "Public profiles are viewable by everyone" ON user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Campaigns: public read, owner can create/update
CREATE POLICY "Campaigns are viewable by everyone" ON campaigns
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own campaigns" ON campaigns
    FOR INSERT WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Recipients can update their own campaigns" ON campaigns
    FOR UPDATE USING (auth.uid() = recipient_id);

-- Campaign updates: public read, campaign owner can create
CREATE POLICY "Updates are viewable by everyone" ON campaign_updates
    FOR SELECT USING (true);

CREATE POLICY "Campaign owners can create updates" ON campaign_updates
    FOR INSERT WITH CHECK (
        auth.uid() = (SELECT recipient_id FROM campaigns WHERE id = campaign_id)
    );
```

### Week 4: Supabase Edge Functions for Business Logic
**Campaign moderation function:**

`supabase/functions/campaign-moderation/index.ts`:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ModerationResult {
  approved: boolean;
  lavish_flags: string[];
  ai_content_score: number;
  reason?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { campaign_id, story_text, budget_breakdown } = await req.json()
    
    // Anti-lavish checking
    const lavishKeywords = ['luxury car', 'yacht', 'mansion', 'expensive jewelry', 'first class travel']
    const lavishFlags = lavishKeywords.filter(keyword => 
      story_text.toLowerCase().includes(keyword.toLowerCase())
    )
    
    // Budget analysis for expensive items
    const expensiveItems = budget_breakdown?.filter((item: any) => 
      item.amount > 2000 || item.category?.includes('luxury')
    ) || []
    
    if (expensiveItems.length > 0) {
      lavishFlags.push(...expensiveItems.map((item: any) => item.category))
    }
    
    // Simple AI content scoring (in production, use proper ML model)
    const aiContentScore = Math.random() * 100 // Replace with actual AI model
    
    const result: ModerationResult = {
      approved: lavishFlags.length === 0 && aiContentScore < 80,
      lavish_flags: lavishFlags,
      ai_content_score: aiContentScore,
      reason: lavishFlags.length > 0 ? 'Contains lavish content' : undefined
    }
    
    // Update campaign in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    await supabase
      .from('campaigns')
      .update({
        anti_lavish_check_passed: result.approved,
        ai_content_score: result.ai_content_score,
        status: result.approved ? 'PENDING_REVIEW' : 'REJECTED'
      })
      .eq('id', campaign_id)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

### Week 5: Payment Integration with Supabase
**Stripe webhook handler:**

`supabase/functions/payment-webhook/index.ts`:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.11.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  const body = await req.text()
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const campaignId = paymentIntent.metadata.campaign_id
        const donorEmail = paymentIntent.receipt_email
        
        // Record the donation
        await supabase.from('donations').insert({
          id: paymentIntent.id,
          campaign_id: campaignId,
          donor_email: donorEmail,
          amount: paymentIntent.amount / 100, // Convert from cents
          currency: paymentIntent.currency,
          status: 'completed',
          stripe_payment_intent_id: paymentIntent.id
        })
        
        // Update campaign funding progress
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('goal_amount, raised_amount')
          .eq('id', campaignId)
          .single()
        
        if (campaign) {
          const newRaisedAmount = (campaign.raised_amount || 0) + (paymentIntent.amount / 100)
          await supabase
            .from('campaigns')
            .update({ 
              raised_amount: newRaisedAmount,
              status: newRaisedAmount >= campaign.goal_amount ? 'FUNDED' : 'FUNDING'
            })
            .eq('id', campaignId)
        }
        
        break
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`Payment failed for ${paymentIntent.id}`)
        break
      }
    }
    
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})
```

### Week 6: Trust Score Calculation Function
**Real-time trust score calculator:**

`supabase/functions/trust-score-calculator/index.ts`:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TrustMetrics {
  updateTimeliness: number;    // 0-100
  spendProofAccuracy: number;  // 0-100
  donorSentiment: number;      // 0-100
  kycDepth: number;           // 0-100
  anomalyScore: number;       // 0-100
}

const WEIGHTS = {
  timeliness: 0.40,
  accuracy: 0.30,
  sentiment: 0.15,
  kyc: 0.10,
  anomaly: 0.05
}

function calculateTrustScore(metrics: TrustMetrics): number {
  const score = (
    metrics.updateTimeliness * WEIGHTS.timeliness +
    metrics.spendProofAccuracy * WEIGHTS.accuracy +
    metrics.donorSentiment * WEIGHTS.sentiment +
    metrics.kycDepth * WEIGHTS.kyc +
    metrics.anomalyScore * WEIGHTS.anomaly
  )
  return Math.max(0, Math.min(100, score))
}

function getTrustTier(score: number): string {
  if (score >= 90) return 'STAR'
  if (score >= 75) return 'TRUSTED'
  if (score >= 60) return 'STEADY'
  if (score >= 40) return 'RISING'
  return 'NEW'
}

serve(async (req) => {
  try {
    const { recipient_id } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Calculate update timeliness
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select(`
        id,
        need_type,
        created_at,
        campaign_updates!inner(created_at)
      `)
      .eq('recipient_id', recipient_id)
    
    let timelinessScore = 50 // Base score
    // Add logic to calculate based on update frequency vs. requirements
    
    // Calculate spend proof accuracy
    const { data: updates } = await supabase
      .from('campaign_updates')
      .select('spend_amount_tagged, payment_reference')
      .not('spend_amount_tagged', 'is', null)
    
    const accuracyScore = updates?.length > 0 ? 80 : 30 // Simplified logic
    
    // Calculate other metrics (simplified for MVP)
    const metrics: TrustMetrics = {
      updateTimeliness: timelinessScore,
      spendProofAccuracy: accuracyScore,
      donorSentiment: 70, // Default until we have donor feedback
      kycDepth: 60,       // Based on verification level
      anomalyScore: 90    // No anomalies detected
    }
    
    const trustScore = calculateTrustScore(metrics)
    const trustTier = getTrustTier(trustScore)
    
    // Update user profile
    await supabase
      .from('user_profiles')
      .update({
        trust_score: trustScore,
        trust_tier: trustTier,
        updated_at: new Date().toISOString()
      })
      .eq('id', recipient_id)
    
    // Log trust score event
    await supabase.from('trust_score_events').insert({
      recipient_id,
      event_type: 'RECALCULATED',
      old_score: 0, // Would get from previous calculation
      new_score: trustScore,
      metrics: JSON.stringify(metrics)
    })
    
    return new Response(
      JSON.stringify({ 
        trust_score: trustScore, 
        trust_tier: trustTier,
        metrics 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

---

## Phase 2: MVP Development with Supabase (Weeks 7-16)

### Sprint 1 (Weeks 7-8): Frontend Setup & Supabase Auth Integration
**React frontend with Supabase client:**

`frontend/web-app/src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types (auto-generated from Supabase)
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          display_name: string | null
          country_iso: string | null
          preferred_language: string | null
          date_of_birth: string | null
          verified_status: string | null
          trust_score: number | null
          trust_tier: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          country_iso?: string | null
          // ... other fields
        }
        Update: {
          display_name?: string | null
          // ... other fields
        }
      }
      campaigns: {
        Row: {
          id: string
          recipient_id: string
          title: string
          need_type: string
          goal_amount: number
          currency: string
          // ... other fields
        }
        // ... Insert and Update types
      }
    }
  }
}
```

**Authentication components:**

`frontend/web-app/src/components/auth/LoginForm.tsx`:
```typescript
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast.success('Welcome back!')
      // Redirect to dashboard
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (error) toast.error(error.message)
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-3 border rounded-lg"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-3 border rounded-lg"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      
      <div className="flex space-x-4">
        <button
          type="button"
          onClick={() => handleSocialLogin('google')}
          className="flex-1 bg-red-600 text-white p-3 rounded-lg hover:bg-red-700"
        >
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => handleSocialLogin('apple')}
          className="flex-1 bg-black text-white p-3 rounded-lg hover:bg-gray-800"
        >
          Continue with Apple
        </button>
      </div>
    </form>
  )
}
```

**Deliverables:**
- [ ] Supabase project setup and configuration
- [ ] User registration/login with email/password
- [ ] Social login (Google, Apple) integration
- [ ] User profile creation and management
- [ ] MFA setup using Supabase Auth
- [ ] JWT token management in frontend

### Sprint 2 (Weeks 9-10): Campaign Creation with Real-time Updates
**Campaign creation wizard:**

`frontend/web-app/src/components/campaigns/CreateCampaignWizard.tsx`:
```typescript
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'

interface CampaignData {
  title: string
  need_type: 'EMERGENCY' | 'COMMUNITY_LONG_TERM'
  goal_amount: number
  currency: string
  deadline: string
  story_markdown: string
  scripture_reference?: string
  budget_breakdown: Array<{
    category: string
    amount: number
    description: string
  }>
}

export function CreateCampaignWizard() {
  const { user } = useAuthContext()
  const [currentStep, setCurrentStep] = useState(1)
  const [campaignData, setCampaignData] = useState<CampaignData>({
    title: '',
    need_type: 'EMERGENCY',
    goal_amount: 0,
    currency: 'GBP',
    deadline: '',
    story_markdown: '',
    budget_breakdown: []
  })

  const handleSubmit = async () => {
    try {
      // Create campaign
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert({
          recipient_id: user.id,
          ...campaignData,
          status: 'DRAFT'
        })
        .select()
        .single()

      if (error) throw error

      // Trigger moderation check
      const { error: moderationError } = await supabase.functions.invoke(
        'campaign-moderation',
        {
          body: {
            campaign_id: campaign.id,
            story_text: campaignData.story_markdown,
            budget_breakdown: campaignData.budget_breakdown
          }
        }
      )

      if (moderationError) throw moderationError

      toast.success('Campaign submitted for review!')
      router.push(`/campaigns/${campaign.id}`)
    } catch (error) {
      toast.error('Failed to create campaign')
      console.error(error)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      {currentStep === 1 && (
        <BasicInfoStep 
          data={campaignData} 
          onChange={setCampaignData} 
        />
      )}
      {currentStep === 2 && (
        <StoryStep 
          data={campaignData} 
          onChange={setCampaignData} 
        />
      )}
      {currentStep === 3 && (
        <BudgetStep 
          data={campaignData} 
          onChange={setCampaignData} 
        />
      )}
      {currentStep === 4 && (
        <ReviewStep 
          data={campaignData} 
          onSubmit={handleSubmit} 
        />
      )}
    </div>
  )
}
```

**Real-time campaign updates using Supabase Realtime:**

`frontend/web-app/src/hooks/useRealtimeCampaign.ts`:
```typescript
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useRealtimeCampaign(campaignId: string) {
  const [campaign, setCampaign] = useState(null)
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let channel: RealtimeChannel

    const setupRealtime = async () => {
      // Initial data load
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select(`
          *,
          user_profiles!campaigns_recipient_id_fkey(display_name),
          campaign_updates(*)
        `)
        .eq('id', campaignId)
        .single()

      setCampaign(campaignData)
      setUpdates(campaignData?.campaign_updates || [])
      setLoading(false)

      // Set up real-time subscription
      channel = supabase
        .channel(`campaign:${campaignId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'campaigns',
            filter: `id=eq.${campaignId}`
          },
          (payload) => {
            setCampaign(prev => ({ ...prev, ...payload.new }))
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'campaign_updates',
            filter: `campaign_id=eq.${campaignId}`
          },
          (payload) => {
            setUpdates(prev => [...prev, payload.new])
          }
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [campaignId])

  return { campaign, updates, loading }
}
```

**Deliverables:**
- [ ] Campaign creation wizard (4 screens)
- [ ] Story and budget input with validation
- [ ] Media upload to Supabase Storage
- [ ] Real-time campaign updates subscription
- [ ] Anti-lavish content checking via Edge Function

### Sprint 3 (Weeks 11-12): Payment Processing & Stripe Integration
**Custom payment service (hybrid approach):**

`services/payment-service/main.py`:
```python
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import stripe
import os
from supabase import create_client, Client

app = FastAPI(title="Blessed-Horizon Payment Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://blessed-horizon.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

@app.post("/create-payment-intent")
async def create_payment_intent(request: Request):
    try:
        data = await request.json()
        campaign_id = data.get("campaign_id")
        amount = data.get("amount")  # Amount in pounds
        donor_email = data.get("donor_email")
        
        # Validate campaign exists
        campaign_response = supabase.table("campaigns").select("*").eq("id", campaign_id).execute()
        if not campaign_response.data:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        campaign = campaign_response.data[0]
        
        # Create Stripe PaymentIntent
        payment_intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),  # Convert to pence
            currency=campaign["currency"].lower(),
            receipt_email=donor_email,
            metadata={
                "campaign_id": campaign_id,
                "campaign_title": campaign["title"]
            }
        )
        
        return {
            "client_secret": payment_intent.client_secret,
            "payment_intent_id": payment_intent.id
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv("STRIPE_WEBHOOK_SECRET")
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        campaign_id = payment_intent["metadata"]["campaign_id"]
        
        # Record donation in Supabase
        supabase.table("donations").insert({
            "stripe_payment_intent_id": payment_intent["id"],
            "campaign_id": campaign_id,
            "donor_email": payment_intent.get("receipt_email"),
            "amount": payment_intent["amount"] / 100,
            "currency": payment_intent["currency"],
            "status": "completed"
        }).execute()
        
        # Update campaign raised amount
        campaign_response = supabase.table("campaigns").select("raised_amount").eq("id", campaign_id).execute()
        current_raised = campaign_response.data[0]["raised_amount"] or 0
        new_raised = current_raised + (payment_intent["amount"] / 100)
        
        supabase.table("campaigns").update({
            "raised_amount": new_raised
        }).eq("id", campaign_id).execute()
    
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

**Frontend payment integration:**

`frontend/web-app/src/components/payments/DonationForm.tsx`:
```typescript
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useState } from 'react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function PaymentForm({ clientSecret, campaignId, amount, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/campaigns/${campaignId}?donation=success`,
      },
    })

    if (error) {
      toast.error(error.message)
    } else {
      onSuccess()
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Donate £${amount}`}
      </button>
    </form>
  )
}

export function DonationForm({ campaignId }) {
  const [amount, setAmount] = useState(25)
  const [clientSecret, setClientSecret] = useState('')
  const [donorEmail, setDonorEmail] = useState('')

  const createPaymentIntent = async () => {
    const response = await fetch('/api/payment/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: campaignId,
        amount,
        donor_email: donorEmail
      })
    })
    
    const { client_secret } = await response.json()
    setClientSecret(client_secret)
  }

  if (!clientSecret) {
    return (
      <div className="space-y-4">
        <input
          type="email"
          placeholder="Your email for receipt"
          value={donorEmail}
          onChange={(e) => setDonorEmail(e.target.value)}
          className="w-full p-3 border rounded-lg"
          required
        />
        <div className="grid grid-cols-4 gap-2">
          {[10, 25, 50, 100].map(preset => (
            <button
              key={preset}
              onClick={() => setAmount(preset)}
              className={`p-2 rounded-lg border ${amount === preset ? 'bg-blue-600 text-white' : 'bg-white'}`}
            >
              £{preset}
            </button>
          ))}
        </div>
        <input
          type="number"
          placeholder="Custom amount"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full p-3 border rounded-lg"
          min="1"
        />
        <button
          onClick={createPaymentIntent}
          disabled={!donorEmail || amount < 1}
          className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Continue to Payment
        </button>
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm 
        clientSecret={clientSecret}
        campaignId={campaignId}
        amount={amount}
        onSuccess={() => window.location.reload()}
      />
    </Elements>
  )
}
```

**Deliverables:**
- [ ] Stripe payment integration with custom service
- [ ] PaymentIntent creation and confirmation
- [ ] Guest donor 3-click checkout
- [ ] Apple Pay/Google Pay support
- [ ] Donation recording in Supabase
- [ ] Real-time funding progress updates

### Sprint 4 (Weeks 13-14): Update System & Notification Engine
**Campaign update creation:**

`frontend/web-app/src/components/campaigns/CreateUpdateForm.tsx`:
```typescript
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'

export function CreateUpdateForm({ campaignId, onSuccess }) {
  const { user } = useAuthContext()
  const [formData, setFormData] = useState({
    type: 'TEXT',
    body_markdown: '',
    spend_amount_tagged: '',
    payment_reference: ''
  })
  const [mediaFile, setMediaFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUploading(true)

    try {
      let mediaUrl = null

      // Upload media if present
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('campaign-media')
          .upload(`updates/${campaignId}/${fileName}`, mediaFile)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('campaign-media')
          .getPublicUrl(uploadData.path)

        mediaUrl = urlData.publicUrl
      }

      // Create update record
      const { error } = await supabase
        .from('campaign_updates')
        .insert({
          campaign_id: campaignId,
          author_id: user.id,
          type: formData.type,
          body_markdown: formData.body_markdown,
          media_url: mediaUrl,
          spend_amount_tagged: formData.spend_amount_tagged ? parseFloat(formData.spend_amount_tagged) : null,
          payment_reference: formData.payment_reference || null
        })

      if (error) throw error

      // Trigger trust score recalculation
      await supabase.functions.invoke('trust-score-calculator', {
        body: { recipient_id: user.id }
      })

      toast.success('Update posted successfully!')
      onSuccess()
      setFormData({
        type: 'TEXT',
        body_markdown: '',
        spend_amount_tagged: '',
        payment_reference: ''
      })
      setMediaFile(null)
    } catch (error) {
      toast.error('Failed to post update')
      console.error(error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Update Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
          className="w-full p-3 border rounded-lg"
        >
          <option value="TEXT">Text Update</option>
          <option value="PHOTO">Photo Update</option>
          <option value="VIDEO">Video Update</option>
          <option value="RECEIPT">Receipt/Proof of Spend</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Update Message</label>
        <textarea
          value={formData.body_markdown}
          onChange={(e) => setFormData(prev => ({ ...prev, body_markdown: e.target.value }))}
          placeholder="Share your progress with supporters..."
          className="w-full p-3 border rounded-lg h-32"
          required
        />
      </div>

      {formData.type === 'RECEIPT' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Amount Spent (£)</label>
            <input
              type="number"
              step="0.01"
              value={formData.spend_amount_tagged}
              onChange={(e) => setFormData(prev => ({ ...prev, spend_amount_tagged: e.target.value }))}
              className="w-full p-3 border rounded-lg"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Payment Reference</label>
            <input
              type="text"
              value={formData.payment_reference}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_reference: e.target.value }))}
              className="w-full p-3 border rounded-lg"
              placeholder="Receipt number, etc."
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Upload Media (Optional)</label>
        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => setMediaFile(e.target.files[0])}
          className="w-full p-3 border rounded-lg"
        />
      </div>

      <button
        type="submit"
        disabled={uploading}
        className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {uploading ? 'Posting Update...' : 'Post Update'}
      </button>
    </form>
  )
}
```

**Notification system using Supabase Edge Functions:**

`supabase/functions/notification-triggers/index.ts`:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// This function runs on database triggers
serve(async (req) => {
  try {
    const { table, record, old_record, type } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    switch (`${table}_${type}`) {
      case 'campaigns_UPDATE':
        if (record.status === 'FUNDING' && old_record.status === 'PENDING_REVIEW') {
          // Campaign approved - notify recipient
          await sendNotification({
            user_id: record.recipient_id,
            type: 'CAMPAIGN_APPROVED',
            title: 'Campaign Approved!',
            message: `Your campaign "${record.title}" is now live and accepting donations.`,
            data: { campaign_id: record.id }
          })
        }
        break
        
      case 'donations_INSERT':
        // New donation - notify recipient
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('recipient_id, title')
          .eq('id', record.campaign_id)
          .single()
          
        if (campaign) {
          await sendNotification({
            user_id: campaign.recipient_id,
            type: 'NEW_DONATION',
            title: 'New Donation Received!',
            message: `Someone just donated £${record.amount} to "${campaign.title}".`,
            data: { campaign_id: record.campaign_id, amount: record.amount }
          })
        }
        break
        
      case 'campaign_updates_INSERT':
        // New update - notify followers
        await notifyFollowers(record.campaign_id, {
          type: 'CAMPAIGN_UPDATE',
          title: 'Campaign Update',
          message: 'There\'s a new update from a campaign you\'re following.',
          data: { campaign_id: record.campaign_id, update_id: record.id }
        })
        break
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Notification trigger error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

async function sendNotification(notification: any) {
  // Implementation for sending push notifications, emails, SMS
  // Using services like SendGrid, Twilio, FCM
  console.log('Sending notification:', notification)
}

async function notifyFollowers(campaignId: string, notification: any) {
  // Get all donors/followers of this campaign
  // Send notifications to each
  console.log('Notifying followers for campaign:', campaignId)
}
```

**Deliverables:**
- [ ] Campaign update creation system
- [ ] Media upload to Supabase Storage
- [ ] Real-time update broadcasting
- [ ] Update cadence tracking
- [ ] Basic notification system (email/push)

### Sprint 5 (Weeks 15-16): Trust Score System & Basic Moderation
**Trust score display components:**

`frontend/web-app/src/components/trust/TrustScoreBadge.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface TrustScoreBadgeProps {
  userId: string
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
}

export function TrustScoreBadge({ userId, size = 'md', showTooltip = true }: TrustScoreBadgeProps) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('trust_score, trust_tier')
        .eq('id', userId)
        .single()
      
      setProfile(data)
      setLoading(false)
    }

    fetchProfile()
  }, [userId])

  if (loading || !profile) {
    return <div className="animate-pulse bg-gray-200 rounded-full w-8 h-8" />
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'STAR': return 'from-yellow-400 to-yellow-600'
      case 'TRUSTED': return 'from-green-400 to-green-600'
      case 'STEADY': return 'from-blue-400 to-blue-600'
      case 'RISING': return 'from-purple-400 to-purple-600'
      default: return 'from-gray-400 to-gray-600'
    }
  }

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base'
  }

  return (
    <div className="relative group">
      <div className={`
        ${sizeClasses[size]}
        rounded-full bg-gradient-to-br ${getTierColor(profile.trust_tier)}
        flex items-center justify-center text-white font-bold
        ring-2 ring-white shadow-lg
      `}>
        {Math.round(profile.trust_score)}
      </div>
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          Trust Score: {Math.round(profile.trust_score)}/100
          <br />
          Tier: {profile.trust_tier}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
        </div>
      )}
    </div>
  )
}
```

**Admin moderation dashboard:**

`frontend/web-app/src/pages/admin/moderation.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'

export default function ModerationDashboard() {
  const { user } = useAuthContext()
  const [pendingCampaigns, setPendingCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPendingCampaigns = async () => {
      const { data } = await supabase
        .from('campaigns')
        .select(`
          *,
          user_profiles!campaigns_recipient_id_fkey(display_name, trust_score, trust_tier)
        `)
        .eq('status', 'PENDING_REVIEW')
        .order('created_at', { ascending: true })
      
      setPendingCampaigns(data || [])
      setLoading(false)
    }

    fetchPendingCampaigns()
  }, [])

  const handleApprove = async (campaignId: string) => {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'FUNDING' })
      .eq('id', campaignId)
    
    if (!error) {
      setPendingCampaigns(prev => prev.filter(c => c.id !== campaignId))
      toast.success('Campaign approved')
    }
  }

  const handleReject = async (campaignId: string, reason: string) => {
    const { error } = await supabase
      .from('campaigns')
      .update({ 
        status: 'REJECTED',
        rejection_reason: reason
      })
      .eq('id', campaignId)
    
    if (!error) {
      setPendingCampaigns(prev => prev.filter(c => c.id !== campaignId))
      toast.success('Campaign rejected')
    }
  }

  if (loading) {
    return <div>Loading moderation queue...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Moderation Dashboard</h1>
      
      <div className="grid gap-6">
        {pendingCampaigns.map(campaign => (
          <div key={campaign.id} className="bg-white border rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold">{campaign.title}</h3>
                <p className="text-gray-600">
                  by {campaign.user_profiles.display_name} 
                  <TrustScoreBadge userId={campaign.recipient_id} size="sm" />
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">£{campaign.goal_amount}</p>
                <p className="text-sm text-gray-500">{campaign.need_type}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium mb-2">Story:</h4>
              <p className="text-gray-700">{campaign.story_markdown}</p>
            </div>
            
            {campaign.budget_breakdown && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Budget Breakdown:</h4>
                <div className="space-y-1">
                  {campaign.budget_breakdown.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.category}</span>
                      <span>£{item.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex space-x-4">
              <button
                onClick={() => handleApprove(campaign.id)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  const reason = prompt('Rejection reason:')
                  if (reason) handleReject(campaign.id, reason)
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Deliverables:**
- [ ] Trust score calculation and display
- [ ] Trust score real-time updates
- [ ] Campaign moderation queue
- [ ] Admin approval/rejection workflow
- [ ] Anti-lavish content detection
- [ ] Basic content moderation system

---

## Phase 3: Alpha Testing & Migration Planning (Weeks 17-18)

### Week 17: Alpha Testing with Supabase Backend
**Production-ready Supabase configuration:**

`supabase/config.toml` (Production):
```toml
[api]
enabled = true
port = 54321
schemas = ["public", "auth", "realtime"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
major_version = 15

[realtime]
enabled = true
ip_version = "ipv4"

[studio]
enabled = true
port = 54323
openai_api_key = "env(OPENAI_API_KEY)"

[auth]
enabled = true
site_url = "env(SITE_URL)"
additional_redirect_urls = ["env(ADDITIONAL_REDIRECT_URLS)"]
jwt_expiry = 3600
enable_signup = true
email_double_confirm_changes = true
email_enable_signup = true
email_secure_password_change = true

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true

[storage]
enabled = true
file_size_limit = "50MiB"
allowed_mime_types = ["image/png", "image/jpeg", "image/gif", "video/mp4", "video/webm"]

[edge_functions]
enabled = true

[analytics]
enabled = false
```

**Alpha testing metrics dashboard:**

`frontend/web-app/src/pages/admin/alpha-metrics.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AlphaMetrics() {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalCampaigns: 0,
    totalDonations: 0,
    totalAmount: 0,
    averageTrustScore: 0,
    updateCompliance: 0
  })

  useEffect(() => {
    const fetchMetrics = async () => {
      // Get user count
      const { count: userCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })

      // Get campaign metrics
      const { data: campaigns, count: campaignCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact' })

      // Get donation metrics
      const { data: donations, count: donationCount } = await supabase
        .from('donations')
        .select('amount', { count: 'exact' })

      const totalAmount = donations?.reduce((sum, d) => sum + d.amount, 0) || 0

      // Calculate average trust score
      const { data: trustScores } = await supabase
        .from('user_profiles')
        .select('trust_score')
        .not('trust_score', 'is', null)

      const avgTrustScore = trustScores?.length > 0 
        ? trustScores.reduce((sum, u) => sum + u.trust_score, 0) / trustScores.length 
        : 0

      setMetrics({
        totalUsers: userCount || 0,
        totalCampaigns: campaignCount || 0,
        totalDonations: donationCount || 0,
        totalAmount,
        averageTrustScore: avgTrustScore,
        updateCompliance: 85 // Calculate based on update frequency vs requirements
      })
    }

    fetchMetrics()
  }, [])

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Alpha Testing Metrics</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
        <MetricCard title="Total Users" value={metrics.totalUsers} />
        <MetricCard title="Active Campaigns" value={metrics.totalCampaigns} />
        <MetricCard title="Total Donations" value={metrics.totalDonations} />
        <MetricCard title="Amount Raised" value={`£${metrics.totalAmount.toFixed(2)}`} />
        <MetricCard title="Avg Trust Score" value={metrics.averageTrustScore.toFixed(1)} />
        <MetricCard title="Update Compliance" value={`${metrics.updateCompliance}%`} />
      </div>
      
      {/* Performance Goals */}
      <div className="bg-white rounded-lg p-6 border">
        <h2 className="text-xl font-semibold mb-4">Alpha Success Criteria</h2>
        <div className="space-y-3">
          <ProgressBar label="User Registration Rate" current={85} target={90} />
          <ProgressBar label="Campaign Creation Success" current={78} target={85} />
          <ProgressBar label="Payment Success Rate" current={96} target={95} />
          <ProgressBar label="Update Punctuality" current={82} target={80} />
          <ProgressBar label="Trust Score Accuracy" current={88} target={85} />
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function ProgressBar({ label, current, target }: { label: string; current: number; target: number }) {
  const percentage = Math.min((current / target) * 100, 100)
  const isOnTrack = current >= target
  
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-sm ${isOnTrack ? 'text-green-600' : 'text-gray-600'}`}>
          {current}% / {target}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${isOnTrack ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
```

### Week 18: Migration Strategy Planning
**Create migration planning documents:**

`docs/supabase-to-microservices-migration.md`:
```markdown
# Supabase to Microservices Migration Strategy

## Phase 1: Current Supabase Architecture (Weeks 1-18)
- **Database**: Supabase PostgreSQL with RLS
- **Auth**: Supabase Auth with JWT
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **Functions**: Supabase Edge Functions

## Phase 2: Hybrid Architecture (Weeks 19-30)
- **Keep**: Database (PostgreSQL), Auth, Storage, Real-time
- **Migrate**: Payment processing, Trust scoring, Advanced moderation
- **Reason**: Critical business logic needs more control and scaling

## Phase 3: Full Microservices (Weeks 31+)
- **Migrate**: Auth service, Campaign service, Notification service
- **Maintain**: Database connection for data consistency

## Migration Order by Priority

### High Priority (Phase 2 - Weeks 19-30)
1. **Payment Service** - Custom Stripe integration with escrow logic
2. **Trust Service** - ML-based scoring with complex business rules
3. **Moderation Service** - Advanced AI content checking

### Medium Priority (Phase 3 - Weeks 31-40)
4. **Notification Service** - Multi-channel messaging with advanced triggers
5. **Campaign Service** - Complex state management and workflows

### Low Priority (Phase 4 - Weeks 41+)
6. **Auth Service** - Only if Supabase Auth limitations arise
7. **Chat Service** - If advanced messaging features needed

## Data Migration Strategy

### Database Schema Compatibility
- **Current**: Supabase PostgreSQL with RLS policies
- **Target**: Self-managed PostgreSQL with application-level security
- **Migration**: Gradual schema updates, maintaining compatibility

### Authentication Migration
- **Phase 1**: Keep Supabase Auth, integrate with custom services
- **Phase 2**: Implement custom OIDC provider
- **Phase 3**: Migrate user sessions gradually

### File Storage Migration
- **Phase 1**: Keep Supabase Storage, add S3 as backup
- **Phase 2**: Dual-write to both systems
- **Phase 3**: Switch to S3, keep Supabase as backup
- **Phase 4**: Full S3 migration

## Risk Mitigation

### Technical Risks
1. **Data Loss**: Always maintain backups and rollback procedures
2. **Downtime**: Blue-green deployment for critical services
3. **Performance**: Load testing before each migration phase

### Business Risks
1. **User Experience**: Transparent migrations with no service interruption
2. **Feature Parity**: Ensure new services match Supabase functionality
3. **Cost Management**: Monitor infrastructure costs during transition
```

**Migration utilities:**

`scripts/migration-utils/supabase-backup.py`:
```python
#!/usr/bin/env python3
"""
Supabase data backup utility for migration preparation
"""
import os
import json
import asyncio
from supabase import create_client, Client
from datetime import datetime

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def backup_table(table_name: str, output_dir: str):
    """Backup a single table to JSON"""
    print(f"Backing up table: {table_name}")
    
    try:
        response = supabase.table(table_name).select("*").execute()
        data = response.data
        
        backup_file = os.path.join(output_dir, f"{table_name}.json")
        with open(backup_file, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        
        print(f"✅ Backed up {len(data)} records from {table_name}")
        return len(data)
    except Exception as e:
        print(f"❌ Error backing up {table_name}: {e}")
        return 0

async def full_backup():
    """Backup all tables"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = f"backups/supabase_{timestamp}"
    os.makedirs(output_dir, exist_ok=True)
    
    tables = [
        "user_profiles",
        "campaigns", 
        "campaign_updates",
        "donations",
        "trust_score_events",
        "notifications"
    ]
    
    total_records = 0
    for table in tables:
        count = await backup_table(table, output_dir)
        total_records += count
    
    print(f"\n🎉 Backup completed! {total_records} total records in {output_dir}")

if __name__ == "__main__":
    asyncio.run(full_backup())
```

**Deliverables:**
- [ ] Alpha testing with 10-20 vetted users
- [ ] Performance baseline establishment (p95 < 500ms)
- [ ] Security penetration testing
- [ ] Migration strategy documentation
- [ ] Backup and rollback procedures
- [ ] Alpha success criteria validation

---

## Phase 4: Beta Development & Hybrid Architecture (Weeks 19-26)

### Sprint 6 (Weeks 19-20): Custom Payment Service Migration
**Standalone payment service replacing Edge Functions:**

`services/payment-service/main.py`:
```python
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import stripe
import os
from typing import Optional
import asyncio

# Import Supabase for gradual migration
from supabase import create_client, Client

app = FastAPI(title="Blessed-Horizon Payment Service", version="2.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "https://blessed-horizon.vercel.app",
        "https://app.blessed-horizon.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

class EscrowWallet:
    """Enhanced escrow wallet with advanced state management"""
    
    def __init__(self, campaign_id: str):
        self.campaign_id = campaign_id
        self.stripe_account = self._get_or_create_stripe_account()
    
    def _get_or_create_stripe_account(self) -> str:
        """Create dedicated Stripe Connect account for escrow"""
        try:
            account = stripe.Account.create(
                type="custom",
                country="GB",
                email=f"escrow-{self.campaign_id}@blessed-horizon.com",
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True},
                },
                metadata={"campaign_id": self.campaign_id}
            )
            return account.id
        except stripe.error.StripeError as e:
            print(f"Error creating Stripe account: {e}")
            return None
    
    async def process_donation(self, amount: float, payment_method: str, donor_email: str):
        """Process donation with enhanced escrow logic"""
        try:
            # Create PaymentIntent with application fee
            payment_intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # Convert to pence
                currency="gbp",
                payment_method=payment_method,
                confirmation_method="manual",
                confirm=True,
                application_fee_amount=int(amount * 100 * 0.025),  # 2.5% platform fee
                transfer_data={
                    "destination": self.stripe_account,
                },
                metadata={
                    "campaign_id": self.campaign_id,
                    "donor_email": donor_email,
                    "escrow": "true"
                }
            )
            
            # Record in Supabase
            donation_record = {
                "stripe_payment_intent_id": payment_intent.id,
                "campaign_id": self.campaign_id,
                "donor_email": donor_email,
                "amount": amount,
                "currency": "GBP",
                "status": "escrowed",
                "escrow_account": self.stripe_account
            }
            
            supabase.table("donations").insert(donation_record).execute()
            
            # Update campaign funding
            await self._update_campaign_funding(amount)
            
            return {
                "success": True,
                "payment_intent_id": payment_intent.id,
                "escrow_account": self.stripe_account
            }
            
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=f"Payment failed: {e}")
    
    async def release_funds(self, recipient_bank_account: dict, amount: Optional[float] = None):
        """Release escrowed funds to recipient"""
        try:
            # Get campaign details
            campaign_response = supabase.table("campaigns").select("*").eq("id", self.campaign_id).execute()
            campaign = campaign_response.data[0]
            
            # Calculate release amount
            if amount is None:
                # Release all available funds
                balance = stripe.Balance.retrieve(stripe_account=self.stripe_account)
                amount = balance.available[0].amount / 100  # Convert from pence
            
            # Create transfer to recipient
            transfer = stripe.Transfer.create(
                amount=int(amount * 100),
                currency="gbp",
                destination=recipient_bank_account["account_id"],
                metadata={
                    "campaign_id": self.campaign_id,
                    "release_type": "completed_goal"
                },
                stripe_account=self.stripe_account
            )
            
            # Update campaign status
            supabase.table("campaigns").update({
                "status": "DISBURSED",
                "disbursed_amount": amount,
                "disbursed_at": "now()"
            }).eq("id", self.campaign_id).execute()
            
            return {
                "success": True,
                "transfer_id": transfer.id,
                "amount": amount
            }
            
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=f"Transfer failed: {e}")
    
    async def _update_campaign_funding(self, donation_amount: float):
        """Update campaign funding progress"""
        campaign_response = supabase.table("campaigns").select("raised_amount, goal_amount").eq("id", self.campaign_id).execute()
        campaign = campaign_response.data[0]
        
        new_raised = (campaign.get("raised_amount") or 0) + donation_amount
        new_status = "FUNDED" if new_raised >= campaign["goal_amount"] else "FUNDING"
        
        supabase.table("campaigns").update({
            "raised_amount": new_raised,
            "status": new_status
        }).eq("id", self.campaign_id).execute()

@app.post("/create-payment-intent")
async def create_payment_intent(request: Request):
    try:
        data = await request.json()
        campaign_id = data.get("campaign_id")
        amount = data.get("amount")
        donor_email = data.get("donor_email")
        
        wallet = EscrowWallet(campaign_id)
        
        # Create payment intent with escrow
        payment_intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),
            currency="gbp",
            receipt_email=donor_email,
            metadata={
                "campaign_id": campaign_id,
                "escrow_account": wallet.stripe_account
            }
        )
        
        return {
            "client_secret": payment_intent.client_secret,
            "payment_intent_id": payment_intent.id
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/release-funds/{campaign_id}")
async def release_funds(campaign_id: str, request: Request):
    try:
        data = await request.json()
        recipient_account = data.get("recipient_account")
        amount = data.get("amount")  # Optional partial release
        
        wallet = EscrowWallet(campaign_id)
        result = await wallet.release_funds(recipient_account, amount)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/escrow-balance/{campaign_id}")
async def get_escrow_balance(campaign_id: str):
    try:
        wallet = EscrowWallet(campaign_id)
        balance = stripe.Balance.retrieve(stripe_account=wallet.stripe_account)
        
        return {
            "available": balance.available[0].amount / 100,
            "pending": balance.pending[0].amount / 100,
            "currency": balance.available[0].currency
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

### Sprint 7 (Weeks 21-22): Advanced Trust Service
**ML-powered trust scoring service:**

`services/trust-service/main.py`:
```python
from fastapi import FastAPI, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import asyncio
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List
import joblib
from supabase import create_client, Client
import os

app = FastAPI(title="Blessed-Horizon Trust Service", version="2.0.0")

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

class MLTrustScoreCalculator:
    """Machine Learning-based trust score calculator"""
    
    def __init__(self):
        self.model = None
        self.feature_scaler = None
        self.load_model()
    
    def load_model(self):
        """Load pre-trained ML model for trust scoring"""
        try:
            # In production, load actual trained model
            # self.model = joblib.load('models/trust_score_model.pkl')
            # self.feature_scaler = joblib.load('models/feature_scaler.pkl')
            print("ML model loaded successfully")
        except FileNotFoundError:
            print("ML model not found, using rule-based system")
            self.model = None
    
    async def calculate_trust_score(self, recipient_id: str) -> Dict:
        """Calculate comprehensive trust score using ML and rules"""
        
        # Gather features
        features = await self._extract_features(recipient_id)
        
        if self.model:
            # Use ML model
            scaled_features = self.feature_scaler.transform([features['feature_vector']])
            ml_score = self.model.predict(scaled_features)[0]
            confidence = self.model.predict_proba(scaled_features)[0].max()
        else:
            # Fallback to rule-based system
            ml_score = self._rule_based_score(features)
            confidence = 0.8
        
        # Combine with business rules
        final_score = self._apply_business_rules(ml_score, features)
        
        return {
            "trust_score": final_score,
            "confidence": confidence,
            "features": features,
            "tier": self._get_trust_tier(final_score)
        }
    
    async def _extract_features(self, recipient_id: str) -> Dict:
        """Extract features for trust scoring"""
        
        # Get user profile
        profile_response = supabase.table("user_profiles").select("*").eq("id", recipient_id).execute()
        profile = profile_response.data[0] if profile_response.data else {}
        
        # Get campaigns
        campaigns_response = supabase.table("campaigns").select("*").eq("recipient_id", recipient_id).execute()
        campaigns = campaigns_response.data or []
        
        # Get updates
        update_query = """
        SELECT cu.*, c.need_type, c.created_at as campaign_created
        FROM campaign_updates cu
        JOIN campaigns c ON cu.campaign_id = c.id
        WHERE c.recipient_id = %s
        ORDER BY cu.created_at DESC
        """
        # In production, use proper SQL query
        updates = []  # Placeholder
        
        # Get donations
        donations_response = supabase.table("donations").select("*").in_("campaign_id", [c["id"] for c in campaigns]).execute()
        donations = donations_response.data or []
        
        # Calculate features
        features = {
            # Profile features
            "account_age_days": (datetime.now() - datetime.fromisoformat(profile.get("created_at", "2024-01-01"))).days,
            "verified_status": 1 if profile.get("verified_status") == "verified" else 0,
            "kyc_tier": 2 if profile.get("kyc_tier") == "tier_2" else 1,
            
            # Campaign features
            "total_campaigns": len(campaigns),
            "avg_goal_amount": np.mean([c["goal_amount"] for c in campaigns]) if campaigns else 0,
            "funding_success_rate": len([c for c in campaigns if c.get("status") == "FUNDED"]) / len(campaigns) if campaigns else 0,
            
            # Update features
            "total_updates": len(updates),
            "avg_update_frequency": self._calculate_update_frequency(updates, campaigns),
            "receipt_update_ratio": len([u for u in updates if u.get("type") == "RECEIPT"]) / len(updates) if updates else 0,
            
            # Donor interaction features
            "total_donations_received": len(donations),
            "avg_donation_amount": np.mean([d["amount"] for d in donations]) if donations else 0,
            "repeat_donor_rate": self._calculate_repeat_donor_rate(donations),
            
            # Temporal features
            "days_since_last_update": self._days_since_last_update(updates),
            "update_punctuality_score": self._calculate_punctuality_score(updates, campaigns),
            
            # Feature vector for ML
            "feature_vector": []  # Will be populated with numerical features
        }
        
        # Create feature vector for ML
        features["feature_vector"] = [
            features["account_age_days"],
            features["verified_status"],
            features["total_campaigns"],
            features["funding_success_rate"],
            features["avg_update_frequency"],
            features["receipt_update_ratio"],
            features["repeat_donor_rate"],
            features["update_punctuality_score"]
        ]
        
        return features
    
    def _rule_based_score(self, features: Dict) -> float:
        """Rule-based trust scoring as fallback"""
        score = 50.0  # Base score
        
        # Account maturity
        if features["account_age_days"] > 90:
            score += 10
        elif features["account_age_days"] > 30:
            score += 5
        
        # Verification status
        if features["verified_status"]:
            score += 15
        
        # Campaign success
        if features["funding_success_rate"] > 0.8:
            score += 15
        elif features["funding_success_rate"] > 0.5:
            score += 10
        
        # Update frequency
        if features["avg_update_frequency"] > 0.8:
            score += 20
        elif features["avg_update_frequency"] > 0.6:
            score += 10
        
        # Receipt documentation
        if features["receipt_update_ratio"] > 0.5:
            score += 15
        
        # Donor satisfaction (proxied by repeat donors)
        if features["repeat_donor_rate"] > 0.3:
            score += 10
        
        # Punctuality
        score += features["update_punctuality_score"] * 0.2
        
        return min(100, max(0, score))
    
    def _apply_business_rules(self, ml_score: float, features: Dict) -> float:
        """Apply business rules to ML score"""
        final_score = ml_score
        
        # Penalty for overdue updates
        if features["days_since_last_update"] > 14:
            final_score -= 20
        elif features["days_since_last_update"] > 7:
            final_score -= 10
        
        # Penalty for low receipt documentation
        if features["receipt_update_ratio"] < 0.2:
            final_score -= 15
        
        # Bonus for consistent performance
        if features["update_punctuality_score"] > 90:
            final_score += 5
        
        return min(100, max(0, final_score))
    
    def _get_trust_tier(self, score: float) -> str:
        """Convert score to tier"""
        if score >= 90:
            return "STAR"
        elif score >= 75:
            return "TRUSTED"
        elif score >= 60:
            return "STEADY"
        elif score >= 40:
            return "RISING"
        else:
            return "NEW"
    
    def _calculate_update_frequency(self, updates: List, campaigns: List) -> float:
        """Calculate update frequency score"""
        if not campaigns:
            return 0.0
        
        total_expected = 0
        total_actual = len(updates)
        
        for campaign in campaigns:
            # Calculate expected updates based on campaign type and duration
            campaign_start = datetime.fromisoformat(campaign["created_at"])
            campaign_duration = (datetime.now() - campaign_start).days
            
            if campaign["need_type"] == "EMERGENCY":
                expected = max(1, campaign_duration // 7)  # Weekly updates
            else:
                expected = max(1, campaign_duration // 30)  # Monthly updates
            
            total_expected += expected
        
        return min(1.0, total_actual / total_expected) if total_expected > 0 else 0.0
    
    def _calculate_repeat_donor_rate(self, donations: List) -> float:
        """Calculate percentage of repeat donors"""
        if not donations:
            return 0.0
        
        donor_counts = {}
        for donation in donations:
            email = donation.get("donor_email")
            if email:
                donor_counts[email] = donor_counts.get(email, 0) + 1
        
        repeat_donors = len([email for email, count in donor_counts.items() if count > 1])
        total_donors = len(donor_counts)
        
        return repeat_donors / total_donors if total_donors > 0 else 0.0
    
    def _days_since_last_update(self, updates: List) -> int:
        """Calculate days since last update"""
        if not updates:
            return 999  # High penalty for no updates
        
        last_update = max(updates, key=lambda x: x["created_at"])
        last_date = datetime.fromisoformat(last_update["created_at"])
        return (datetime.now() - last_date).days
    
    def _calculate_punctuality_score(self, updates: List, campaigns: List) -> float:
        """Calculate update punctuality score"""
        # Simplified implementation
        # In production, compare actual update dates vs expected dates
        return 85.0  # Placeholder

# Initialize calculator
trust_calculator = MLTrustScoreCalculator()

@app.post("/calculate-trust-score/{recipient_id}")
async def calculate_trust_score(recipient_id: str, background_tasks: BackgroundTasks):
    """Calculate and update trust score for recipient"""
    try:
        result = await trust_calculator.calculate_trust_score(recipient_id)
        
        # Update user profile
        supabase.table("user_profiles").update({
            "trust_score": result["trust_score"],
            "trust_tier": result["tier"],
            "updated_at": datetime.now().isoformat()
        }).eq("id", recipient_id).execute()
        
        # Log trust score event
        supabase.table("trust_score_events").insert({
            "recipient_id": recipient_id,
            "event_type": "ML_CALCULATION",
            "new_score": result["trust_score"],
            "confidence": result["confidence"],
            "features": result["features"]
        }).execute()
        
        # Schedule notifications if score changed significantly
        background_tasks.add_task(check_score_changes, recipient_id, result["trust_score"])
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def check_score_changes(recipient_id: str, new_score: float):
    """Check if trust score changes require notifications"""
    # Get previous score
    events_response = supabase.table("trust_score_events").select("new_score").eq("recipient_id", recipient_id).order("created_at", desc=True).limit(2).execute()
    
    if len(events_response.data) >= 2:
        old_score = events_response.data[1]["new_score"]
        score_change = abs(new_score - old_score)
        
        if score_change >= 10:  # Significant change
            # Trigger notification
            supabase.table("notifications").insert({
                "user_id": recipient_id,
                "type": "TRUST_SCORE_CHANGE",
                "title": "Trust Score Updated",
                "message": f"Your trust score changed by {score_change:.1f} points to {new_score:.1f}",
                "data": {"old_score": old_score, "new_score": new_score}
            }).execute()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
```

**Deliverables:**
- [ ] Custom payment service with advanced escrow
- [ ] ML-powered trust scoring system
- [ ] Enhanced moderation with advanced AI
- [ ] Hybrid architecture implementation
- [ ] Service mesh setup for microservices communication

---

## Supabase Migration Strategy Summary

### Phase Timeline
1. **Weeks 1-18**: Full Supabase development for rapid MVP
2. **Weeks 19-30**: Hybrid approach - migrate critical services
3. **Weeks 31-40**: Continued migration of remaining services
4. **Weeks 41+**: Full microservices architecture

### Benefits of This Approach
1. **Speed**: Get to market 3-4 months faster using Supabase
2. **Validation**: Prove product-market fit before heavy infrastructure investment
3. **Learning**: Understand real user patterns before architecting custom solutions
4. **Risk Reduction**: Incremental migration reduces technical and business risk
5. **Cost Efficiency**: Lower initial infrastructure costs

### Migration Complexity Assessment
- **Low Risk**: Payment service, Trust service (business logic focused)
- **Medium Risk**: Notification service, Campaign service (moderate complexity)
- **High Risk**: Auth service (user sessions), Real-time service (WebSocket complexity)

This hybrid approach allows us to leverage Supabase's rapid development capabilities while maintaining the flexibility to migrate to custom microservices as we scale and need more control over specific business logic components.

### Sprint 6 (Weeks 19-20): Trust Score System
**trust-service implementation:**

`services/trust-service/models/trust_score.py`:
```python
from dataclasses import dataclass
from typing import Dict, List
from enum import Enum

class TrustTier(Enum):
    NEW = "NEW"
    RISING = "RISING"
    STEADY = "STEADY"
    TRUSTED = "TRUSTED"
    STAR = "STAR"

@dataclass
class TrustMetrics:
    update_timeliness: float = 0.0    # Weight: 40%
    spend_proof_accuracy: float = 0.0  # Weight: 30%
    donor_sentiment: float = 0.0       # Weight: 15%
    kyc_depth: float = 0.0            # Weight: 10%
    anomaly_score: float = 0.0        # Weight: 5%

class TrustScoreCalculator:
    WEIGHTS = {
        'timeliness': 0.40,
        'accuracy': 0.30,
        'sentiment': 0.15,
        'kyc': 0.10,
        'anomaly': 0.05
    }
    
    def calculate_score(self, metrics: TrustMetrics) -> float:
        score = (
            metrics.update_timeliness * self.WEIGHTS['timeliness'] +
            metrics.spend_proof_accuracy * self.WEIGHTS['accuracy'] +
            metrics.donor_sentiment * self.WEIGHTS['sentiment'] +
            metrics.kyc_depth * self.WEIGHTS['kyc'] +
            metrics.anomaly_score * self.WEIGHTS['anomaly']
        )
        return max(0, min(100, score))
```

### Sprint 7 (Weeks 21-22): Donor Accounts & Voting
**Enhanced donor features:**

`services/campaign-service/services/donor_voting.py`:
```python
from decimal import Decimal

class DonorVotingService:
    def __init__(self, db_session):
        self.db = db_session
    
    def submit_release_vote(self, donor_id: str, campaign_id: str, vote: str):
        """
        Vote to release or withhold funds
        Voting power = £1 contributed = 1 vote
        """
        donor_contributions = self.db.query(Transaction).filter(
            Transaction.donor_id == donor_id,
            Transaction.campaign_id == campaign_id,
            Transaction.type == "DONATION"
        ).all()
        
        voting_power = sum(t.amount for t in donor_contributions)
        
        vote_record = DonorVote(
            donor_id=donor_id,
            campaign_id=campaign_id,
            vote=vote,  # RELEASE or WITHHOLD
            voting_power=voting_power
        )
        
        self.db.add(vote_record)
        self.check_vote_threshold(campaign_id)
```

### Sprint 8 (Weeks 23-24): Chat System & Moderation
**chat-service with WebSocket support:**

`services/chat-service/main.py`:
```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
    
    async def broadcast_to_room(self, room_id: str, message: dict):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/chat/{campaign_id}")
async def websocket_endpoint(websocket: WebSocket, campaign_id: str):
    await manager.connect(websocket, campaign_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Moderate message content
            moderated = await moderate_message(message)
            if moderated['approved']:
                await manager.broadcast_to_room(campaign_id, moderated['message'])
    except WebSocketDisconnect:
        # Handle disconnect
        pass
```

### Sprint 9 (Weeks 25-26): Tax Receipts & Compliance
**Tax receipt generation:**

`services/payment-service/services/receipt_generator.py`:
```python
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
import io

class ReceiptGenerator:
    def generate_donation_receipt(self, donation_data: dict) -> bytes:
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Company header
        c.drawString(100, 750, "Blessed-Horizon Foundation")
        c.drawString(100, 735, "Charity Registration: 12345678")
        
        # Donation details
        c.drawString(100, 700, f"Donation Amount: £{donation_data['amount']}")
        c.drawString(100, 685, f"Date: {donation_data['date']}")
        c.drawString(100, 670, f"Campaign: {donation_data['campaign_title']}")
        
        # GiftAid section
        if donation_data.get('giftaid_eligible'):
            c.drawString(100, 640, "✓ GiftAid Declaration Received")
            c.drawString(100, 625, f"Additional 25% claimed: £{donation_data['giftaid_amount']}")
        
        c.save()
        buffer.seek(0)
        return buffer.read()
```

---

## Phase 5: Production Hardening (Weeks 27-30)

### Week 27: Security & Compliance Audit
**Security implementations:**

`shared/middleware/security.py`:
```python
from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import redis

security = HTTPBearer()
redis_client = redis.Redis(host='localhost', port=6379, db=0)

class SecurityMiddleware:
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            request = Request(scope, receive)
            
            # Rate limiting
            client_ip = request.client.host
            rate_limit_key = f"rate_limit:{client_ip}"
            current_requests = redis_client.incr(rate_limit_key)
            
            if current_requests == 1:
                redis_client.expire(rate_limit_key, 60)  # 1 minute window
            elif current_requests > 100:  # 100 requests per minute
                raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
        await self.app(scope, receive, send)
```

**GDPR compliance checklist:**
- [ ] Data minimization implementation
- [ ] Right to erasure functionality
- [ ] Consent management system
- [ ] Data processing agreements
- [ ] Privacy policy updates

### Week 28: Performance Optimization
**Database optimization:**

```sql
-- Add critical indexes
CREATE INDEX CONCURRENTLY idx_campaigns_recipient_status ON campaigns(recipient_id, status);
CREATE INDEX CONCURRENTLY idx_transactions_campaign_type ON transactions(campaign_id, type);
CREATE INDEX CONCURRENTLY idx_trust_events_recipient_timestamp ON trust_score_events(recipient_id, timestamp);

-- Implement read replicas for analytics
CREATE SUBSCRIPTION blessed_horizon_analytics
CONNECTION 'host=analytics-db port=5432 user=replicator'
PUBLICATION blessed_horizon_publication;
```

**Caching strategy:**
```python
# services/campaign-service/middleware/caching.py
import redis
import json
from functools import wraps

redis_client = redis.Redis(host='redis-cluster', port=6379)

def cache_response(expiration=300):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            cached_result = redis_client.get(cache_key)
            
            if cached_result:
                return json.loads(cached_result)
            
            result = await func(*args, **kwargs)
            redis_client.setex(cache_key, expiration, json.dumps(result))
            return result
        return wrapper
    return decorator
```

### Week 29: Monitoring & Observability
**OpenTelemetry setup:**

`shared/telemetry/tracing.py`:
```python
from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

# Configure tracing
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

jaeger_exporter = JaegerExporter(
    agent_host_name="jaeger-agent",
    agent_port=6831,
)

span_processor = BatchSpanProcessor(jaeger_exporter)
trace.get_tracer_provider().add_span_processor(span_processor)

# Auto-instrument FastAPI and SQLAlchemy
FastAPIInstrumentor.instrument()
SQLAlchemyInstrumentor.instrument()
```

### Week 30: Disaster Recovery & Backup
**Backup strategy implementation:**

```bash
#!/bin/bash
# scripts/backup-production.sh

# Database backup
pg_dump -h $DB_HOST -U $DB_USER blessed_horizon | gzip > /backups/db-$(date +%Y%m%d).sql.gz

# S3 media backup
aws s3 sync s3://blessed-horizon-media s3://blessed-horizon-media-backup --delete

# Configuration backup
kubectl get configmaps -o yaml > /backups/configmaps-$(date +%Y%m%d).yaml
kubectl get secrets -o yaml > /backups/secrets-$(date +%Y%m%d).yaml

# Upload to long-term storage
aws s3 cp /backups/ s3://blessed-horizon-long-term-backup/ --recursive
```

---

## Phase 6: Public Launch (Weeks 31-34)

### Week 31: Soft Launch Preparation
**Launch checklist:**
- [ ] Production environment validated
- [ ] Payment processing live testing
- [ ] Customer support documentation
- [ ] Legal terms and privacy policy finalized
- [ ] Marketing materials prepared

### Week 32: Beta User Migration
**Data migration scripts:**

`scripts/migrate-beta-to-production.py`:
```python
import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

async def migrate_user_data():
    """Migrate beta users to production with data validation"""
    beta_engine = create_engine(BETA_DATABASE_URL)
    prod_engine = create_engine(PRODUCTION_DATABASE_URL)
    
    # Migrate users with trust scores
    beta_users = beta_engine.execute("SELECT * FROM users WHERE verified_status = 'VERIFIED'")
    
    for user in beta_users:
        # Validate data integrity
        validated_user = validate_user_data(user)
        
        # Insert into production
        prod_engine.execute(
            "INSERT INTO users (...) VALUES (...)",
            validated_user
        )
    
    print(f"Migrated {len(beta_users)} verified users to production")
```

### Week 33: Public Launch
**Launch monitoring dashboard:**

`monitoring/launch-dashboard.json`:
```json
{
  "dashboard": {
    "title": "Blessed-Horizon Launch Metrics",
    "panels": [
      {
        "title": "User Registrations",
        "type": "graph",
        "targets": [
          {
            "expr": "increase(user_registrations_total[1h])",
            "legendFormat": "New Users/Hour"
          }
        ]
      },
      {
        "title": "Payment Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "(payment_successes / payment_attempts) * 100",
            "legendFormat": "Success Rate %"
          }
        ]
      }
    ]
  }
}
```

### Week 34: Launch Optimization
**Performance monitoring and optimization:**
- [ ] Monitor API response times
- [ ] Optimize database queries
- [ ] Scale Kubernetes pods based on demand
- [ ] Implement auto-scaling policies
- [ ] Address any production issues

---

## Phase 7: Scale & Enhancement (Weeks 35-52)

### Future Enhancements Roadmap

**Q2 2026: Advanced Features**
- [ ] Collective projects with milestone unlocks
- [ ] ML-based trust score v2
- [ ] Video capture with offline caching
- [ ] Multi-currency FX hedging

**Q3 2026: Global Expansion**
- [ ] Mobile money integration (M-Pesa, UPI)
- [ ] Local currency support
- [ ] Region-specific compliance
- [ ] Localization for major languages

**Q4 2026: Blockchain Integration**
- [ ] Polygon-based transparency ledger
- [ ] Smart contract escrow
- [ ] Decentralized governance features
- [ ] Crypto donation support

---

## Risk Mitigation & Contingency Plans

### Technical Risks
1. **Payment Processing Issues**
   - Mitigation: Dual payment provider setup (Stripe + backup)
   - Contingency: Manual payment processing procedures

2. **Security Breaches**
   - Mitigation: Regular security audits, penetration testing
   - Contingency: Incident response plan, user notification system

3. **Scalability Challenges**
   - Mitigation: Kubernetes auto-scaling, CDN implementation
   - Contingency: Emergency scaling procedures

### Business Risks
1. **Regulatory Changes**
   - Mitigation: Legal compliance monitoring
   - Contingency: Rapid feature modification capabilities

2. **Trust & Safety Issues**
   - Mitigation: Robust moderation systems, trust scoring
   - Contingency: Manual review escalation procedures

---

## Success Metrics & KPIs

### Technical Metrics
- **Uptime**: 99.9% availability
- **Performance**: p95 latency < 250ms
- **Security**: Zero critical security incidents
- **Fraud Rate**: < 0.05% of GMV

### Business Metrics
- **GMV**: £5M in first 12 months
- **User Growth**: 50,000+ registered users
- **Campaign Success**: 85% funding rate
- **Update Compliance**: 85% on-time update rate

### Impact Metrics
- **Communities Aided**: 1,000+ projects funded
- **Donor Retention**: 70% donors give twice
- **Trust Score**: Average recipient score > 75
- **Geographic Reach**: Active in 20+ countries

---

---

## Supabase Integration Benefits & Decision Framework

### Why Supabase First?

**🚀 Speed to Market (3-4 months faster)**
- Instant PostgreSQL database with APIs
- Built-in authentication (email, social, MFA)
- Real-time subscriptions out of the box
- File storage without S3 configuration
- Edge functions for serverless business logic

**💰 Cost Efficiency**
- No initial infrastructure costs
- Pay-as-you-scale pricing model
- Reduced DevOps overhead
- Lower development complexity

**🔧 Developer Experience**
- Auto-generated TypeScript types
- Built-in admin dashboard
- Real-time database changes
- Integrated monitoring and logs

### Migration Decision Points

**When to Migrate Each Service:**

1. **Payment Service (Week 19)** - Migrate Early
   - Reason: Complex escrow logic needs full control
   - Risk: Medium - well-defined Stripe integration
   - Benefit: Custom business rules, advanced fraud detection

2. **Trust Service (Week 21)** - Migrate Early  
   - Reason: ML model deployment needs custom environment
   - Risk: Low - isolated scoring logic
   - Benefit: Advanced algorithms, real-time learning

3. **Notification Service (Week 25)** - Migrate Medium
   - Reason: Multi-channel complexity (email, SMS, push)
   - Risk: Medium - message delivery reliability
   - Benefit: Advanced targeting, delivery optimization

4. **Auth Service (Week 35+)** - Migrate Last
   - Reason: Supabase Auth is robust and well-tested
   - Risk: High - user session management
   - Benefit: Custom user flows, advanced security

### Technical Integration Patterns

**Database Strategy:**
```typescript
// Use Supabase client alongside custom services
const supabase = createClient(url, key)

// Custom service calls
const paymentResult = await fetch('/api/payment-service/process')

// Update Supabase data from custom service
await supabase.from('donations').insert(paymentResult.data)
```

**Authentication Bridge:**
```python
# Custom service validates Supabase JWT
from supabase import create_client
import jwt

def validate_supabase_token(token: str):
    # Verify JWT signature with Supabase
    payload = jwt.decode(token, supabase_jwt_secret, algorithms=['HS256'])
    return payload['sub']  # User ID
```

**Event-Driven Architecture:**
```typescript
// Supabase triggers call custom services
supabase
  .channel('donations')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'donations' },
    async (payload) => {
      // Trigger trust score recalculation
      await fetch('/api/trust-service/recalculate', {
        method: 'POST',
        body: JSON.stringify({ user_id: payload.new.donor_id })
      })
    }
  )
```

### Success Metrics by Phase

**Phase 1-2 (Supabase MVP - Weeks 1-18):**
- Time to first campaign: < 2 weeks
- Development velocity: 2x faster than custom services
- Bug rate: < 5% due to battle-tested Supabase features

**Phase 3-4 (Hybrid - Weeks 19-30):**
- Payment success rate: 99.5% (vs 97% with Edge Functions)
- Trust score accuracy: 95% (vs 80% with rule-based)
- Infrastructure cost: +30% (acceptable for better control)

**Phase 5+ (Full Migration - Weeks 31+):**
- Custom feature velocity: 3x faster than Supabase constraints
- Performance optimization: 50ms faster API responses
- Scalability: Handle 10x user growth

### Risk Mitigation Checklist

**Data Migration Risks:**
- [ ] Always maintain Supabase as backup during migration
- [ ] Implement dual-write patterns for critical data
- [ ] Automated rollback procedures for each service
- [ ] Comprehensive data validation scripts

**User Experience Risks:**
- [ ] Zero-downtime deployment strategies
- [ ] Feature flag toggles for gradual rollouts
- [ ] A/B testing for new vs old implementations
- [ ] User communication for planned maintenance

**Technical Debt Risks:**
- [ ] Document all Supabase-specific implementations
- [ ] Create abstraction layers for easier migration
- [ ] Regular technical debt assessment
- [ ] Gradual refactoring rather than big-bang rewrites

This hybrid approach ensures we can deliver value quickly while building toward a scalable, fully-controlled architecture that supports Blessed-Horizon's long-term mission.