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

    // Check if user owns the campaign
    const { data: campaign, error: fetchError } = await supabaseClient
      .from('campaigns')
      .select('recipient_id, status, raised_amount')
      .eq('id', campaign_id)
      .single()

    if (fetchError || !campaign) {
      throw new Error('Campaign not found')
    }

    if (campaign.recipient_id !== user.id) {
      throw new Error('Unauthorized to delete this campaign')
    }

    // Can only delete campaigns in certain states
    if (!['DRAFT', 'REJECTED', 'CANCELLED'].includes(campaign.status)) {
      if (campaign.raised_amount > 0) {
        throw new Error('Cannot delete campaign that has received donations. Please cancel it instead.')
      }
    }

    // Perform soft delete
    const { error: deleteError } = await supabaseClient
      .from('campaigns')
      .update({ 
        deleted_at: new Date().toISOString(),
        status: campaign.status === 'DRAFT' ? 'CANCELLED' : campaign.status
      })
      .eq('id', campaign_id)

    if (deleteError) {
      throw deleteError
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Campaign deleted successfully' }),
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