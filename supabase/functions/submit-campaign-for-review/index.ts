import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { campaign_id } = await req.json()

    if (!campaign_id) {
      throw new Error('Campaign ID is required')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user owns the campaign and it's in DRAFT status
    const { data: campaign, error: fetchError } = await supabaseClient
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single()

    if (fetchError || !campaign) {
      throw new Error('Campaign not found')
    }

    if (campaign.recipient_id !== user.id) {
      throw new Error('Unauthorized to submit this campaign')
    }

    if (campaign.status !== 'DRAFT') {
      throw new Error('Only draft campaigns can be submitted for review')
    }

    // Validate campaign completeness
    const validationErrors = []

    if (!campaign.title || campaign.title.length < 10) {
      validationErrors.push('Title must be at least 10 characters')
    }

    if (!campaign.story_markdown || campaign.story_markdown.length < 200) {
      validationErrors.push('Story must be at least 200 characters')
    }

    if (!campaign.budget_breakdown || campaign.budget_breakdown.length === 0) {
      validationErrors.push('Budget breakdown is required')
    }

    if (!campaign.category_id) {
      validationErrors.push('Category must be selected')
    }

    // Check for at least one media item
    const { data: media } = await supabaseClient
      .from('campaign_media')
      .select('id')
      .eq('campaign_id', campaign_id)
      .limit(1)

    if (!media || media.length === 0) {
      validationErrors.push('At least one image is required')
    }

    if (validationErrors.length > 0) {
      throw new Error(`Campaign validation failed: ${validationErrors.join(', ')}`)
    }

    // Update campaign status to PENDING_REVIEW
    const { data: updatedCampaign, error: updateError } = await supabaseClient
      .from('campaigns')
      .update({ status: 'PENDING_REVIEW' })
      .eq('id', campaign_id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Create moderation queue entry
    await supabaseClient
      .from('moderation_queue')
      .insert({
        campaign_id: campaign_id,
        status: 'pending'
      })

    // TODO: Trigger AI moderation check (would be implemented separately)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: updatedCampaign,
        message: 'Campaign submitted for review. You will be notified once it is approved.'
      }),
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