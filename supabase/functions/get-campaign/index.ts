import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('id')
    const slug = url.searchParams.get('slug')

    if (!campaignId && !slug) {
      throw new Error('Campaign ID or slug is required')
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

    // Build query
    let query = supabaseClient
      .from('campaigns')
      .select(`
        *,
        recipient:user_profiles!campaigns_recipient_id_fkey(
          id,
          display_name,
          country_iso,
          trust_score,
          trust_tier,
          verification_status
        ),
        category:campaign_categories(
          id,
          name,
          slug,
          icon_name
        ),
        milestones:campaign_milestones(
          id,
          title,
          description,
          target_amount,
          reached_at
        ),
        media:campaign_media(
          id,
          media_type,
          media_url,
          thumbnail_url,
          caption,
          display_order,
          is_primary
        ),
        tags:campaign_tags(
          tag
        ),
        beneficiaries:campaign_beneficiaries(
          id,
          name,
          relationship,
          age,
          description
        ),
        recent_donations:donations(
          id,
          amount,
          currency,
          is_anonymous,
          donor_name,
          message,
          created_at
        ),
        updates_count:campaign_updates(count)
      `)

    if (campaignId) {
      query = query.eq('id', campaignId)
    } else {
      query = query.eq('slug', slug)
    }

    const { data: campaign, error } = await query.single()

    if (error || !campaign) {
      throw new Error('Campaign not found')
    }

    // Get authenticated user if any
    const { data: { user } } = await supabaseClient.auth.getUser()

    // Check if campaign is viewable
    const isPublic = ['FUNDING', 'FUNDED', 'COMPLETED'].includes(campaign.status)
    const isOwner = user && campaign.recipient_id === user.id

    if (!isPublic && !isOwner) {
      throw new Error('Campaign not accessible')
    }

    // Update view count and last viewed time
    if (isPublic && (!user || campaign.recipient_id !== user.id)) {
      await supabaseClient
        .from('campaigns')
        .update({ 
          view_count: campaign.view_count + 1,
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', campaign.id)
    }

    // Calculate progress
    const progress = campaign.goal_amount > 0 
      ? Math.round((campaign.raised_amount / campaign.goal_amount) * 100) 
      : 0

    // Format response
    const response = {
      ...campaign,
      progress,
      tags: campaign.tags.map((t: any) => t.tag),
      recent_donations: campaign.recent_donations
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10),
      is_owner: isOwner,
      can_edit: isOwner && ['DRAFT', 'PENDING_REVIEW'].includes(campaign.status),
      can_submit_for_review: isOwner && campaign.status === 'DRAFT',
      can_post_update: isOwner && ['FUNDING', 'FUNDED'].includes(campaign.status)
    }

    return new Response(
      JSON.stringify({ success: true, data: response }),
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