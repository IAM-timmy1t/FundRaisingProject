// Create Campaign Update Edge Function
// Handles creation of campaign updates with media upload support

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUpdateRequest {
  campaign_id: string
  title: string
  content: string
  update_type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'RECEIPT'
  amount_spent?: number
  spending_breakdown?: Array<{
    description: string
    amount: number
    receipt_url?: string
  }>
  media_urls?: string[]
  receipt_urls?: string[]
  is_milestone?: boolean
  milestone_percentage?: number
  scheduled_for?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: CreateUpdateRequest = await req.json()
    const { 
      campaign_id, 
      title, 
      content, 
      update_type = 'TEXT',
      amount_spent,
      spending_breakdown,
      media_urls,
      receipt_urls,
      is_milestone,
      milestone_percentage,
      scheduled_for
    } = body

    // Validate required fields
    if (!campaign_id || !title || !content) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: campaign_id, title, content' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user owns the campaign
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select('*, recipient:user_profiles!recipient_id(*)')
      .eq('id', campaign_id)
      .single()

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (campaign.recipient_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check campaign status
    if (!['FUNDING', 'FUNDED'].includes(campaign.status)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Updates can only be posted for active campaigns' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate remaining funds if spending is reported
    let remaining_funds = null
    if (amount_spent && amount_spent > 0) {
      const totalWithdrawn = campaign.withdrawn_amount || 0
      const previousSpent = await calculatePreviousSpending(supabaseClient, campaign_id)
      remaining_funds = totalWithdrawn - previousSpent - amount_spent
    }

    // Create the update
    const { data: update, error: updateError } = await supabaseClient
      .from('campaign_updates')
      .insert({
        campaign_id,
        author_id: user.id,
        title,
        content_markdown: content,
        content_html: content, // In production, convert markdown to HTML
        update_type,
        amount_spent: amount_spent || 0,
        spending_breakdown: spending_breakdown || [],
        remaining_funds,
        media_urls: media_urls || [],
        receipt_urls: receipt_urls || [],
        is_milestone: is_milestone || false,
        milestone_percentage,
        scheduled_for: scheduled_for || null,
        view_count: 0,
        like_count: 0,
        comment_count: 0
      })
      .select('*, author:user_profiles!author_id(*)')
      .single()

    if (updateError) {
      console.error('Update creation error:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create update' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update campaign's last_update_at
    await supabaseClient
      .from('campaigns')
      .update({ 
        last_update_at: new Date().toISOString(),
        overdue_updates_count: 0 // Reset overdue count
      })
      .eq('id', campaign_id)

    // Schedule next update reminder
    await scheduleNextUpdateReminder(supabaseClient, campaign_id, user.id)

    // Trigger trust score recalculation
    await supabaseClient.functions.invoke('trust-score-calculator', {
      body: { user_id: user.id, trigger: 'campaign_update' }
    })

    // Notify donors about the update
    await notifyDonors(supabaseClient, campaign_id, campaign.title, update.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: update,
        message: 'Update posted successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in create-campaign-update:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function calculatePreviousSpending(supabase: any, campaignId: string): Promise<number> {
  const { data } = await supabase
    .from('campaign_updates')
    .select('amount_spent')
    .eq('campaign_id', campaignId)

  return data?.reduce((sum: number, update: any) => sum + (update.amount_spent || 0), 0) || 0
}

async function scheduleNextUpdateReminder(supabase: any, campaignId: string, userId: string) {
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('update_frequency_days')
    .eq('id', campaignId)
    .single()

  const nextUpdateDue = new Date()
  nextUpdateDue.setDate(nextUpdateDue.getDate() + (campaign?.update_frequency_days || 14))

  await supabase
    .from('campaigns')
    .update({ next_update_due: nextUpdateDue.toISOString() })
    .eq('id', campaignId)

  // Create notification for future reminder
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type: 'update_reminder',
      title: 'Time to update your campaign',
      message: 'Your supporters are waiting to hear about your progress',
      campaign_id: campaignId,
      scheduled_for: nextUpdateDue.toISOString(),
      priority: 3
    })
}

async function notifyDonors(supabase: any, campaignId: string, campaignTitle: string, updateId: string) {
  // Get all donors for this campaign
  const { data: donations } = await supabase
    .from('donations')
    .select('donor_id')
    .eq('campaign_id', campaignId)
    .eq('payment_status', 'completed')
    .not('donor_id', 'is', null)

  if (!donations || donations.length === 0) return

  // Get unique donor IDs
  const uniqueDonorIds = [...new Set(donations.map((d: any) => d.donor_id))]

  // Create notifications for each donor
  const notifications = uniqueDonorIds.map(donorId => ({
    user_id: donorId,
    type: 'campaign_update',
    title: 'New update from campaign you supported',
    message: `"${campaignTitle}" has posted a new update`,
    campaign_id: campaignId,
    update_id: updateId,
    priority: 5
  }))

  await supabase
    .from('notifications')
    .insert(notifications)
}
