import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Get the webhook signature
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('No stripe signature found')
    }

    // Get the raw body
    const body = await req.text()

    // Verify webhook signature
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured')
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object

        // Get donation record
        const { data: donation, error: donationError } = await supabaseClient
          .from('donations')
          .select('*, campaign:campaigns(*)')
          .eq('payment_intent_id', paymentIntent.id)
          .single()

        if (donationError || !donation) {
          console.error('Donation not found for payment intent:', paymentIntent.id)
          break
        }

        // Start a transaction to update donation and campaign
        const { error: updateDonationError } = await supabaseClient
          .from('donations')
          .update({
            payment_status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', donation.id)

        if (updateDonationError) {
          console.error('Failed to update donation status:', updateDonationError)
          break
        }

        // Update campaign raised amount and donor count
        const { data: campaign } = await supabaseClient
          .from('campaigns')
          .select('raised_amount, donor_count')
          .eq('id', donation.campaign_id)
          .single()

        if (campaign) {
          const newRaisedAmount = parseFloat(campaign.raised_amount) + parseFloat(donation.amount)
          
          // Check if this is a new donor
          const { count: previousDonations } = await supabaseClient
            .from('donations')
            .select('id', { count: 'exact' })
            .eq('campaign_id', donation.campaign_id)
            .eq('donor_id', donation.donor_id)
            .eq('payment_status', 'completed')
            .lt('created_at', donation.created_at)

          const isNewDonor = previousDonations === 0

          const { error: updateCampaignError } = await supabaseClient
            .from('campaigns')
            .update({
              raised_amount: newRaisedAmount,
              donor_count: isNewDonor ? campaign.donor_count + 1 : campaign.donor_count,
              // Update funded_at if goal is reached
              ...(newRaisedAmount >= donation.campaign.goal_amount && !donation.campaign.funded_at
                ? { funded_at: new Date().toISOString(), status: 'FUNDED' }
                : {})
            })
            .eq('id', donation.campaign_id)

          if (updateCampaignError) {
            console.error('Failed to update campaign:', updateCampaignError)
          }
        }

        // Create notification for campaign owner
        const { error: notificationError } = await supabaseClient
          .from('notifications')
          .insert({
            user_id: donation.campaign.recipient_id,
            type: 'donation_received',
            title: 'New Donation Received!',
            message: donation.is_anonymous 
              ? `An anonymous donor contributed ${formatCurrency(donation.amount, donation.currency)} to your campaign "${donation.campaign.title}"`
              : `${donation.donor_name || 'A supporter'} contributed ${formatCurrency(donation.amount, donation.currency)} to your campaign "${donation.campaign.title}"`,
            data: {
              donation_id: donation.id,
              campaign_id: donation.campaign_id,
              amount: donation.amount,
              currency: donation.currency
            }
          })

        if (notificationError) {
          console.error('Failed to create notification:', notificationError)
        }

        // Update donor's total donated amount if not anonymous
        if (donation.donor_id && !donation.is_anonymous) {
          const { data: profile } = await supabaseClient
            .from('user_profiles')
            .select('total_donated, campaigns_supported')
            .eq('id', donation.donor_id)
            .single()

          if (profile) {
            const { error: updateProfileError } = await supabaseClient
              .from('user_profiles')
              .update({
                total_donated: parseFloat(profile.total_donated) + parseFloat(donation.amount),
                campaigns_supported: isNewDonor ? profile.campaigns_supported + 1 : profile.campaigns_supported
              })
              .eq('id', donation.donor_id)

            if (updateProfileError) {
              console.error('Failed to update donor profile:', updateProfileError)
            }
          }
        }

        console.log(`Payment succeeded for donation ${donation.id}`)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object

        // Update donation status to failed
        const { error } = await supabaseClient
          .from('donations')
          .update({
            payment_status: 'failed',
            metadata: {
              failure_code: paymentIntent.last_payment_error?.code,
              failure_message: paymentIntent.last_payment_error?.message
            }
          })
          .eq('payment_intent_id', paymentIntent.id)

        if (error) {
          console.error('Failed to update failed donation:', error)
        }

        console.log(`Payment failed for payment intent ${paymentIntent.id}`)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object
        
        // Find donation by payment intent
        const { data: donation, error: findError } = await supabaseClient
          .from('donations')
          .select('*')
          .eq('payment_intent_id', charge.payment_intent)
          .single()

        if (findError || !donation) {
          console.error('Donation not found for refund:', charge.payment_intent)
          break
        }

        // Update donation status
        const { error: updateError } = await supabaseClient
          .from('donations')
          .update({
            payment_status: 'refunded',
            metadata: {
              ...donation.metadata,
              refunded_at: new Date().toISOString(),
              refund_amount: charge.amount_refunded / 100
            }
          })
          .eq('id', donation.id)

        if (updateError) {
          console.error('Failed to update refunded donation:', updateError)
          break
        }

        // Update campaign raised amount
        const { error: campaignError } = await supabaseClient
          .rpc('decrement_campaign_raised_amount', {
            campaign_id: donation.campaign_id,
            amount: donation.amount
          })

        if (campaignError) {
          console.error('Failed to update campaign after refund:', campaignError)
        }

        console.log(`Refund processed for donation ${donation.id}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

// Helper function to format currency
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}
