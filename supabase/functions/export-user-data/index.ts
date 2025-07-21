import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify the user is requesting their own data
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    
    if (!user || user.id !== userId) {
      throw new Error('Unauthorized');
    }

    // Collect all user data
    const [profile, campaigns, donations, consents, activities] = await Promise.all([
      supabaseClient.from('user_profiles').select('*').eq('id', userId).single(),
      supabaseClient.from('campaigns').select('*').eq('created_by', userId),
      supabaseClient.from('donations').select('*').eq('donor_id', userId),
      supabaseClient.from('user_consent').select('*').eq('user_id', userId),
      supabaseClient.from('audit_logs').select('*').eq('user_id', userId).limit(1000),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      requestedBy: user.email,
      userData: {
        accountInfo: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in: user.last_sign_in_at,
        },
        profile: profile.data,
        campaigns: campaigns.data || [],
        donations: donations.data || [],
        consents: consents.data || [],
        recentActivity: activities.data || [],
      },
    };

    // Log the export request
    await supabaseClient.from('audit_logs').insert({
      user_id: userId,
      event_type: 'data_export_requested',
      event_data: { timestamp: new Date().toISOString() },
    });

    return new Response(JSON.stringify(exportData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});