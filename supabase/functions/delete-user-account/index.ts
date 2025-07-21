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
    const { userId, confirmEmail } = await req.json();
    
    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify the user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    
    if (!user || user.id !== userId || user.email !== confirmEmail) {
      throw new Error('Unauthorized or email mismatch');
    }

    // Start deletion process
    // 1. Anonymize donations (keep for financial records)
    await supabaseClient
      .from('donations')
      .update({ 
        donor_id: null,
        donor_email: 'deleted@user.com',
        donor_name: 'Anonymous Donor',
        message: null
      })
      .eq('donor_id', userId);

    // 2. Delete user campaigns
    await supabaseClient
      .from('campaigns')
      .delete()
      .eq('created_by', userId);

    // 3. Delete user profile
    await supabaseClient
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    // 4. Delete consent records
    await supabaseClient
      .from('user_consent')
      .delete()
      .eq('user_id', userId);

    // 5. Log the deletion
    await supabaseClient.from('audit_logs').insert({
      user_id: userId,
      event_type: 'account_deletion_requested',
      event_data: { 
        timestamp: new Date().toISOString(),
        email: confirmEmail
      },
    });

    // 6. Delete auth user (this will cascade to other tables)
    const { error } = await supabaseClient.auth.admin.deleteUser(userId);
    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});