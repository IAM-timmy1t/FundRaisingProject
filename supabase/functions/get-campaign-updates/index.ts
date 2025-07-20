import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('campaign_id')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    if (!campaignId) {
      throw new Error('campaign_id is required')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get campaign updates with recipient info
    const { data: updates, error: updatesError, count } = await supabaseClient
      .from('campaign_updates')
      .select(`
        *,
        campaign:campaigns(
          id,
          title,
          recipient:user_profiles(
            id,
            display_name,
            trust_score,
            trust_tier
          )
        )
      `, { count: 'exact' })
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (updatesError) {
      throw updatesError
    }

    // Format updates for response
    const formattedUpdates = updates.map(update => ({
      id: update.id,
      campaign_id: update.campaign_id,
      title: update.title,
      update_type: update.update_type,
      content_markdown: update.content_markdown,
      content_html: update.content_html,
      media_urls: update.media_urls || [],
      spend_items: update.spend_items || [],
      total_spent: update.total_spent,
      created_at: update.created_at,
      view_count: update.view_count,
      reaction_counts: update.reaction_counts || {},
      recipient: update.campaign?.recipient || null
    }))

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          updates: formattedUpdates,
          total: count,
          limit,
          offset,
          has_more: offset + limit < count
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error fetching campaign updates:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to fetch campaign updates'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})