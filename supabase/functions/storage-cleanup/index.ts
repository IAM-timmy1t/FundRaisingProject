import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    // Get pending deletions from queue
    const { data: pendingDeletions, error: queueError } = await supabase
      .from('storage_deletion_queue')
      .select('*')
      .is('processed_at', null)
      .order('created_at', { ascending: true })
      .limit(50)

    if (queueError) {
      throw new Error(`Queue error: ${queueError.message}`)
    }

    const results = []

    // Process each deletion
    for (const deletion of pendingDeletions || []) {
      try {
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from(deletion.bucket_name)
          .remove([deletion.file_path])

        if (deleteError) {
          // Update queue with error
          await supabase
            .from('storage_deletion_queue')
            .update({
              processed_at: new Date().toISOString(),
              error: deleteError.message
            })
            .eq('id', deletion.id)

          results.push({
            id: deletion.id,
            success: false,
            error: deleteError.message
          })
        } else {
          // Mark as processed
          await supabase
            .from('storage_deletion_queue')
            .update({
              processed_at: new Date().toISOString()
            })
            .eq('id', deletion.id)

          results.push({
            id: deletion.id,
            success: true
          })
        }
      } catch (error) {
        results.push({
          id: deletion.id,
          success: false,
          error: error.message
        })
      }
    }

    // Clean up old processed records (older than 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    await supabase
      .from('storage_deletion_queue')
      .delete()
      .lt('processed_at', thirtyDaysAgo.toISOString())

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
