// Trust Score Calculator Edge Function for Blessed-Horizon
// Calculates and updates user trust scores based on weighted metrics
// Deno runtime for Supabase Edge Functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Trust score calculation weights (totaling 100%)
const TRUST_WEIGHTS = {
  updateTimeliness: 0.40,    // 40% - Most important factor
  spendProofAccuracy: 0.30,  // 30% - Financial transparency
  donorSentiment: 0.15,      // 15% - Community feedback
  kycDepth: 0.10,           // 10% - Verification level
  anomalyScore: 0.05        // 5% - Behavioral anomalies
}

// Trust tier thresholds
const TRUST_TIERS = {
  NEW: { min: 0, max: 25 },
  RISING: { min: 25, max: 50 },
  STEADY: { min: 50, max: 75 },
  TRUSTED: { min: 75, max: 90 },
  STAR: { min: 90, max: 100 }
}

interface TrustMetrics {
  updateTimeliness: number
  spendProofAccuracy: number
  donorSentiment: number
  kycDepth: number
  anomalyScore: number
}

interface TrustCalculationResult {
  trustScore: number
  trustTier: string
  metrics: TrustMetrics
  confidence: number
  recommendations: string[]
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const { recipient_id, trigger_event } = await req.json()

    if (!recipient_id) {
      return new Response('Missing recipient_id', { status: 400 })
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Calculating trust score for user: ${recipient_id}, trigger: ${trigger_event}`)

    // Calculate trust metrics
    const metrics = await calculateTrustMetrics(supabase, recipient_id)
    
    // Calculate weighted trust score
    const trustScore = calculateWeightedScore(metrics)
    
    // Determine trust tier
    const trustTier = getTrustTier(trustScore)
    
    // Calculate confidence level
    const confidence = calculateConfidence(metrics, recipient_id, supabase)
    
    // Generate recommendations
    const recommendations = generateRecommendations(metrics, trustScore)

    // Update user profile with new trust score
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        trust_score: Math.round(trustScore * 100) / 100,
        trust_tier: trustTier,
        trust_score_last_updated: new Date().toISOString()
      })
      .eq('id', recipient_id)

    if (updateError) {
      console.error('Error updating user profile:', updateError)
      throw updateError
    }

    // Log trust score event
    const { error: eventError } = await supabase
      .from('trust_score_events')
      .insert({
        user_id: recipient_id,
        event_type: trigger_event || 'CALCULATION',
        old_score: null, // Could fetch previous score if needed
        new_score: trustScore,
        metrics_snapshot: metrics,
        confidence_level: confidence,
        created_at: new Date().toISOString()
      })

    if (eventError) {
      console.error('Error logging trust event:', eventError)
      // Don't throw - this is non-critical
    }

    const result: TrustCalculationResult = {
      trustScore,
      trustTier,
      metrics,
      confidence,
      recommendations
    }

    console.log(`Trust score calculated: ${trustScore} (${trustTier}) for user ${recipient_id}`)

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Trust score calculation error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})

async function calculateTrustMetrics(supabase: any, recipientId: string): Promise<TrustMetrics> {
  // Get user profile and campaigns
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('verification_status, created_at')
    .eq('id', recipientId)
    .single()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select(`
      id,
      need_type,
      created_at,
      status,
      next_update_due,
      overdue_updates_count,
      campaign_updates!inner(
        id,
        created_at,
        spend_amount_tagged,
        payment_reference,
        update_type
      )
    `)
    .eq('recipient_id', recipientId)

  // Calculate each metric
  const updateTimeliness = await calculateUpdateTimeliness(supabase, campaigns)
  const spendProofAccuracy = await calculateSpendProofAccuracy(supabase, campaigns)
  const donorSentiment = await calculateDonorSentiment(supabase, recipientId)
  const kycDepth = calculateKycDepth(profile)
  const anomalyScore = await calculateAnomalyScore(supabase, recipientId, campaigns)

  return {
    updateTimeliness,
    spendProofAccuracy,
    donorSentiment,
    kycDepth,
    anomalyScore
  }
}

async function calculateUpdateTimeliness(supabase: any, campaigns: any[]): Promise<number> {
  if (!campaigns || campaigns.length === 0) return 50 // Neutral score for new users

  let totalScore = 0
  let campaignCount = 0

  for (const campaign of campaigns) {
    if (campaign.status !== 'FUNDING' && campaign.status !== 'FUNDED') continue

    campaignCount++
    
    // Calculate expected update frequency based on campaign type
    const expectedDays = campaign.need_type === 'EMERGENCY' ? 7 : 14
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(campaign.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    const expectedUpdates = Math.max(1, Math.floor(daysSinceCreation / expectedDays))
    const actualUpdates = campaign.campaign_updates?.length || 0
    
    // Calculate timeliness score for this campaign
    let campaignScore = 50 // Base score
    
    if (actualUpdates >= expectedUpdates) {
      // Check if updates are recent
      const latestUpdate = campaign.campaign_updates?.[0]?.created_at
      if (latestUpdate) {
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(latestUpdate).getTime()) / (1000 * 60 * 60 * 24)
        )
        
        if (daysSinceUpdate <= expectedDays) {
          campaignScore = 90 // Excellent
        } else if (daysSinceUpdate <= expectedDays * 1.5) {
          campaignScore = 75 // Good
        } else {
          campaignScore = 60 // Acceptable
        }
      }
    } else {
      // Penalize for missing updates
      const missedUpdates = expectedUpdates - actualUpdates
      campaignScore = Math.max(10, 50 - (missedUpdates * 15))
    }
    
    // Factor in overdue updates
    if (campaign.overdue_updates_count > 0) {
      campaignScore = Math.max(10, campaignScore - (campaign.overdue_updates_count * 20))
    }
    
    totalScore += campaignScore
  }

  return campaignCount > 0 ? totalScore / campaignCount : 50
}

async function calculateSpendProofAccuracy(supabase: any, campaigns: any[]): Promise<number> {
  if (!campaigns || campaigns.length === 0) return 30 // Lower score for new users

  let totalSpendTagged = 0
  let totalSpendWithProof = 0
  let updateCount = 0

  for (const campaign of campaigns) {
    if (!campaign.campaign_updates) continue

    for (const update of campaign.campaign_updates) {
      if (update.spend_amount_tagged && update.spend_amount_tagged > 0) {
        updateCount++
        totalSpendTagged += update.spend_amount_tagged
        
        // Check if proof is provided
        if (update.payment_reference || update.update_type === 'RECEIPT') {
          totalSpendWithProof += update.spend_amount_tagged
        }
      }
    }
  }

  if (updateCount === 0) return 30 // No spending updates yet

  // Calculate accuracy percentage
  const accuracyPercentage = totalSpendTagged > 0 
    ? (totalSpendWithProof / totalSpendTagged) * 100 
    : 0

  // Convert to score (0-100)
  return Math.min(100, Math.max(0, accuracyPercentage))
}

async function calculateDonorSentiment(supabase: any, recipientId: string): Promise<number> {
  // Get donations and comments for sentiment analysis
  const { data: donations } = await supabase
    .from('donations')
    .select('donor_feedback_rating, donor_feedback_text')
    .eq('recipient_id', recipientId)
    .not('donor_feedback_rating', 'is', null)

  const { data: comments } = await supabase
    .from('campaign_comments')
    .select('sentiment_score, content')
    .in('campaign_id', 
      await supabase
        .from('campaigns')
        .select('id')
        .eq('recipient_id', recipientId)
        .then((res: any) => res.data?.map((c: any) => c.id) || [])
    )

  let totalSentiment = 0
  let sentimentCount = 0

  // Process donation feedback
  if (donations) {
    for (const donation of donations) {
      if (donation.donor_feedback_rating) {
        totalSentiment += donation.donor_feedback_rating * 20 // Convert 1-5 to 20-100
        sentimentCount++
      }
    }
  }

  // Process comment sentiment (if available)
  if (comments) {
    for (const comment of comments) {
      if (comment.sentiment_score) {
        totalSentiment += comment.sentiment_score
        sentimentCount++
      }
    }
  }

  // Return average sentiment or neutral score
  return sentimentCount > 0 ? totalSentiment / sentimentCount : 70
}

function calculateKycDepth(profile: any): number {
  if (!profile) return 0

  const verificationLevels = {
    'unverified': 0,
    'email_verified': 20,
    'phone_verified': 40,
    'id_verified': 70,
    'kyc_full': 100
  }

  return verificationLevels[profile.verification_status] || 0
}

async function calculateAnomalyScore(supabase: any, recipientId: string, campaigns: any[]): Promise<number> {
  // Start with perfect score
  let anomalyScore = 100

  // Check for suspicious patterns
  const { data: recentEvents } = await supabase
    .from('trust_score_events')
    .select('event_type, created_at')
    .eq('user_id', recipientId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

  // Penalize for negative events
  if (recentEvents) {
    const negativeEvents = recentEvents.filter((e: any) => 
      ['FUNDS_MISUSED', 'NEGATIVE_REVIEW', 'LATE_UPDATE'].includes(e.event_type)
    )
    anomalyScore -= negativeEvents.length * 15
  }

  // Check for unusual campaign patterns
  if (campaigns && campaigns.length > 0) {
    const activeCampaigns = campaigns.filter((c: any) => c.status === 'FUNDING')
    
    // Penalize for too many active campaigns
    if (activeCampaigns.length > 3) {
      anomalyScore -= (activeCampaigns.length - 3) * 10
    }
    
    // Check for rapid campaign creation
    const recentCampaigns = campaigns.filter((c: any) => 
      new Date(c.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    )
    if (recentCampaigns.length > 2) {
      anomalyScore -= 20
    }
  }

  return Math.max(0, Math.min(100, anomalyScore))
}

function calculateWeightedScore(metrics: TrustMetrics): number {
  const weightedScore = 
    (metrics.updateTimeliness * TRUST_WEIGHTS.updateTimeliness) +
    (metrics.spendProofAccuracy * TRUST_WEIGHTS.spendProofAccuracy) +
    (metrics.donorSentiment * TRUST_WEIGHTS.donorSentiment) +
    (metrics.kycDepth * TRUST_WEIGHTS.kycDepth) +
    (metrics.anomalyScore * TRUST_WEIGHTS.anomalyScore)

  return Math.max(0, Math.min(100, weightedScore))
}

function getTrustTier(score: number): string {
  for (const [tier, range] of Object.entries(TRUST_TIERS)) {
    if (score >= range.min && score <= range.max) {
      return tier
    }
  }
  return 'NEW' // Fallback
}

async function calculateConfidence(metrics: TrustMetrics, recipientId: string, supabase: any): Promise<number> {
  // Get data points count for confidence calculation
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id')
    .eq('recipient_id', recipientId)

  const { data: updates } = await supabase
    .from('campaign_updates')
    .select('id')
    .in('campaign_id', campaigns?.map((c: any) => c.id) || [])

  const { data: donations } = await supabase
    .from('donations')
    .select('id')
    .in('campaign_id', campaigns?.map((c: any) => c.id) || [])

  // Calculate confidence based on data availability
  let confidence = 50 // Base confidence

  // More campaigns = higher confidence
  const campaignCount = campaigns?.length || 0
  confidence += Math.min(30, campaignCount * 10)

  // More updates = higher confidence
  const updateCount = updates?.length || 0
  confidence += Math.min(20, updateCount * 2)

  // More donations = higher confidence
  const donationCount = donations?.length || 0
  confidence += Math.min(20, donationCount * 1)

  return Math.min(100, confidence)
}

function generateRecommendations(metrics: TrustMetrics, trustScore: number): string[] {
  const recommendations: string[] = []

  if (metrics.updateTimeliness < 60) {
    recommendations.push("Post regular updates to improve your timeliness score")
  }

  if (metrics.spendProofAccuracy < 70) {
    recommendations.push("Include receipts and payment references in your spending updates")
  }

  if (metrics.kycDepth < 70) {
    recommendations.push("Complete your identity verification to increase trust")
  }

  if (metrics.donorSentiment < 60) {
    recommendations.push("Engage more with your donors and respond to their feedback")
  }

  if (trustScore < 50) {
    recommendations.push("Focus on consistent communication and transparency to build trust")
  }

  if (recommendations.length === 0) {
    recommendations.push("Great work! Keep maintaining your excellent trust score")
  }

  return recommendations
}