import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'

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
    const { 
      amount, 
      currency = 'usd', 
      campaign_id,
      campaign_title,
      donor_name,
      donor_email,
      message,
      is_anonymous = false
    } = await req.json()

    // Validate required fields
    if (!amount || !campaign_id || !campaign_title) {
      throw new Error('Missing required fields: amount, campaign_id, campaign_title')
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Initialize Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get authenticated user if available
    const authHeader = req.headers.get('Authorization')!
    let userId = null
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
      
      if (!authError && user) {
        userId = user.id
      }
    }

    // Verify campaign exists and is active
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select('id, title, status, goal_amount, raised_amount, recipient_id')
      .eq('id', campaign_id)
      .single()

    if (campaignError || !campaign) {
      throw new Error('Campaign not found')
    }

    if (campaign.status !== 'FUNDING') {
      throw new Error('Campaign is not accepting donations')
    }

    // Check if amount would exceed goal
    const remainingAmount = campaign.goal_amount - campaign.raised_amount
    if (amount > remainingAmount) {
      throw new Error(`Donation amount exceeds campaign goal. Maximum allowed: ${remainingAmount}`)
    }

    // Calculate fees (2.9% + 30¢ for Stripe)
    const stripeFee = Math.round(amount * 0.029 + 30) // in cents

    // Create donation record with pending status
    const { data: donation, error: donationError } = await supabaseClient
      .from('donations')
      .insert({
        campaign_id,
        donor_id: userId,
        amount: amount / 100, // Convert from cents to dollars for storage
        currency: currency.toUpperCase(),
        payment_status: 'pending',
        is_anonymous,
        donor_name: is_anonymous ? null : donor_name,
        donor_email: donor_email,
        message,
        processing_fee: stripeFee / 100
      })
      .select()
      .single()

    if (donationError) {
      throw new Error('Failed to create donation record')
    }

    // Create metadata for the payment intent
    const metadata = {
      donation_id: donation.id,
      campaign_id: campaign.id,
      campaign_title: campaign.title,
      donor_id: userId || 'guest',
      is_anonymous: is_anonymous.toString(),
      platform: 'blessed-horizon'
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      description: `Donation to: ${campaign_title}`,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
      // Add receipt email if provided
      ...(donor_email && { receipt_email: donor_email }),
    })

    // Update donation record with payment intent ID
    const { error: updateError } = await supabaseClient
      .from('donations')
      .update({ payment_intent_id: paymentIntent.id })
      .eq('id', donation.id)

    if (updateError) {
      console.error('Failed to update donation with payment intent ID:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          donationId: donation.id,
          amount: amount,
          currency: currency,
          fees: {
            processing: stripeFee,
            total: stripeFee
          },
          netAmount: amount - stripeFee
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error creating payment intent:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create payment intent'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
