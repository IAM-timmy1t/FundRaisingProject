import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface CreateCampaignRequest {
  title: string
  need_type: 'EMERGENCY' | 'COMMUNITY_LONG_TERM'
  goal_amount: number
  currency: string
  deadline: string
  story_markdown: string
  scripture_reference?: string
  budget_breakdown: Array<{
    description: string
    amount: number
    category: string
  }>
  category_id?: string
  location_country?: string
  location_city?: string
  tags?: string[]
  beneficiaries?: Array<{
    name: string
    relationship?: string
    age?: number
    description?: string
  }>
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user can create campaign
    const { data: canCreate, error: checkError } = await supabaseClient
      .rpc('can_user_create_campaign', { user_id: user.id })

    if (checkError || !canCreate) {
      throw new Error('User cannot create campaign. Please verify your account or check active campaign limit.')
    }

    const campaignData: CreateCampaignRequest = await req.json()

    // Validate required fields
    if (!campaignData.title || !campaignData.need_type || !campaignData.goal_amount || 
        !campaignData.story_markdown || !campaignData.budget_breakdown) {
      throw new Error('Missing required fields')
    }

    // Validate amounts
    if (campaignData.goal_amount < 100 || campaignData.goal_amount > 1000000) {
      throw new Error('Goal amount must be between 100 and 1,000,000')
    }

    // Validate deadline
    const deadline = new Date(campaignData.deadline)
    const minDeadline = new Date()
    minDeadline.setDate(minDeadline.getDate() + 7) // Minimum 7 days
    const maxDeadline = new Date()
    maxDeadline.setFullYear(maxDeadline.getFullYear() + 1) // Maximum 1 year

    if (deadline < minDeadline || deadline > maxDeadline) {
      throw new Error('Deadline must be between 7 days and 1 year from now')
    }

    // Start transaction
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .insert({
        recipient_id: user.id,
        title: campaignData.title,
        need_type: campaignData.need_type,
        goal_amount: campaignData.goal_amount,
        currency: campaignData.currency || 'USD',
        deadline: campaignData.deadline,
        story_markdown: campaignData.story_markdown,
        scripture_reference: campaignData.scripture_reference,
        budget_breakdown: campaignData.budget_breakdown,
        category_id: campaignData.category_id,
        location_country: campaignData.location_country,
        location_city: campaignData.location_city,
        status: 'DRAFT'
      })
      .select()
      .single()

    if (campaignError) {
      throw campaignError
    }

    // Add tags if provided
    if (campaignData.tags && campaignData.tags.length > 0) {
      const tags = campaignData.tags.map(tag => ({
        campaign_id: campaign.id,
        tag: tag.toLowerCase().trim()
      }))

      await supabaseClient
        .from('campaign_tags')
        .insert(tags)
    }

    // Add beneficiaries if provided
    if (campaignData.beneficiaries && campaignData.beneficiaries.length > 0) {
      const beneficiaries = campaignData.beneficiaries.map(b => ({
        campaign_id: campaign.id,
        ...b
      }))

      await supabaseClient
        .from('campaign_beneficiaries')
        .insert(beneficiaries)
    }

    // Trigger moderation for the campaign
    try {
      // Use service role client for edge function calls
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Call moderation edge function
      const { data: moderationResult, error: moderationError } = await serviceClient.functions.invoke('moderate-campaign', {
        body: {
          campaign: {
            id: campaign.id,
            title: campaign.title,
            story: campaign.story_markdown,
            need_type: campaign.need_type,
            goal_amount: campaign.goal_amount,
            budget_breakdown: campaign.budget_breakdown,
            created_by: campaign.recipient_id
          }
        }
      })

      if (moderationError) {
        console.error('Moderation error:', moderationError)
        // Don't fail campaign creation if moderation fails
        // Campaign will remain in DRAFT status
      } else if (moderationResult?.result) {
        // Update campaign status based on moderation
        let newStatus = 'DRAFT'
        if (moderationResult.result.decision === 'approved') {
          newStatus = 'ACTIVE'
        } else if (moderationResult.result.decision === 'review') {
          newStatus = 'UNDER_REVIEW'
        } else if (moderationResult.result.decision === 'rejected') {
          newStatus = 'REJECTED'
        }

        // Update campaign with moderation results
        const { error: updateError } = await supabaseClient
          .from('campaigns')
          .update({ 
            status: newStatus,
            moderation_score: moderationResult.result.scores.overall,
            moderated_at: moderationResult.result.timestamp
          })
          .eq('id', campaign.id)

        if (updateError) {
          console.error('Failed to update campaign status:', updateError)
        } else {
          campaign.status = newStatus
          campaign.moderation_score = moderationResult.result.scores.overall
        }

        // Include moderation info in response
        campaign.moderation = {
          decision: moderationResult.result.decision,
          score: moderationResult.result.scores.overall,
          flags: moderationResult.result.flags,
          recommendations: moderationResult.result.recommendations
        }
      }
    } catch (moderationError) {
      console.error('Moderation processing error:', moderationError)
      // Continue without moderation
    }

    return new Response(
      JSON.stringify({ success: true, data: campaign }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})