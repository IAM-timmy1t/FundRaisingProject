import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface UpdateCampaignRequest {
  campaign_id: string
  title?: string
  goal_amount?: number
  deadline?: string
  story_markdown?: string
  scripture_reference?: string
  budget_breakdown?: Array<{
    description: string
    amount: number
    category: string
  }>
  category_id?: string
  location_country?: string
  location_city?: string
  status?: string
}

serve(async (req) => {
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

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const updateData: UpdateCampaignRequest = await req.json()

    if (!updateData.campaign_id) {
      throw new Error('Campaign ID is required')
    }

    // Check if user owns the campaign
    const { data: campaign, error: fetchError } = await supabaseClient
      .from('campaigns')
      .select('recipient_id, status')
      .eq('id', updateData.campaign_id)
      .single()

    if (fetchError || !campaign) {
      throw new Error('Campaign not found')
    }

    if (campaign.recipient_id !== user.id) {
      throw new Error('Unauthorized to update this campaign')
    }

    // Can only update certain fields based on status
    const allowedUpdates: any = {}
    
    if (campaign.status === 'DRAFT') {
      // Can update everything except status
      Object.assign(allowedUpdates, updateData)
      delete allowedUpdates.campaign_id
      delete allowedUpdates.status
    } else if (campaign.status === 'PENDING_REVIEW') {
      // Can only update story and scripture reference
      if (updateData.story_markdown) allowedUpdates.story_markdown = updateData.story_markdown
      if (updateData.scripture_reference !== undefined) allowedUpdates.scripture_reference = updateData.scripture_reference
    } else if (campaign.status === 'FUNDING') {
      // Can only update story
      if (updateData.story_markdown) allowedUpdates.story_markdown = updateData.story_markdown
    } else {
      throw new Error('Cannot update campaign in current status')
    }

    // Validate updates if any
    if (allowedUpdates.goal_amount) {
      if (allowedUpdates.goal_amount < 100 || allowedUpdates.goal_amount > 1000000) {
        throw new Error('Goal amount must be between 100 and 1,000,000')
      }
    }

    if (allowedUpdates.deadline) {
      const deadline = new Date(allowedUpdates.deadline)
      const minDeadline = new Date()
      minDeadline.setDate(minDeadline.getDate() + 7)
      
      if (deadline < minDeadline) {
        throw new Error('Deadline must be at least 7 days from now')
      }
    }

    // Update campaign
    const { data: updatedCampaign, error: updateError } = await supabaseClient
      .from('campaigns')
      .update(allowedUpdates)
      .eq('id', updateData.campaign_id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ success: true, data: updatedCampaign }),
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