import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const params = {
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '12'),
      need_type: url.searchParams.get('need_type'),
      category_id: url.searchParams.get('category_id'),
      status: url.searchParams.get('status'),
      country: url.searchParams.get('country'),
      search: url.searchParams.get('search'),
      sort_by: url.searchParams.get('sort_by') || 'created_at',
      order: url.searchParams.get('order') || 'desc',
      featured_only: url.searchParams.get('featured_only') === 'true',
      recipient_id: url.searchParams.get('recipient_id')
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

    // Base query
    let query = supabaseClient
      .from('campaigns')
      .select(`
        id,
        title,
        slug,
        need_type,
        goal_amount,
        raised_amount,
        currency,
        deadline,
        status,
        view_count,
        donor_count,
        created_at,
        location_country,
        location_city,
        featured_until,
        recipient:user_profiles!campaigns_recipient_id_fkey(
          id,
          display_name,
          trust_score,
          trust_tier
        ),
        category:campaign_categories(
          id,
          name,
          slug,
          icon_name
        ),
        primary_media:campaign_media(
          media_url,
          thumbnail_url
        )
      `, { count: 'exact' })

    // Apply filters
    if (params.status) {
      if (params.status === 'active') {
        query = query.in('status', ['FUNDING'])
          .gte('deadline', new Date().toISOString())
      } else {
        query = query.eq('status', params.status)
      }
    } else {
      // Default to showing only public campaigns
      query = query.in('status', ['FUNDING', 'FUNDED', 'COMPLETED'])
    }

    // Filter by recipient if specified
    if (params.recipient_id) {
      query = query.eq('recipient_id', params.recipient_id)
    }

    // Other filters
    if (params.need_type) {
      query = query.eq('need_type', params.need_type)
    }

    if (params.category_id) {
      query = query.eq('category_id', params.category_id)
    }

    if (params.country) {
      query = query.eq('location_country', params.country)
    }

    if (params.featured_only) {
      query = query.gte('featured_until', new Date().toISOString())
    }

    // Search
    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,story_markdown.ilike.%${params.search}%`)
    }

    // Exclude soft deleted
    query = query.is('deleted_at', null)

    // Sorting
    const sortColumn = {
      'created_at': 'created_at',
      'deadline': 'deadline',
      'goal_amount': 'goal_amount',
      'raised_amount': 'raised_amount',
      'progress': 'raised_amount',
      'popularity': 'view_count'
    }[params.sort_by] || 'created_at'

    query = query.order(sortColumn, { ascending: params.order === 'asc' })

    // Pagination
    const offset = (params.page - 1) * params.limit
    query = query.range(offset, offset + params.limit - 1)

    // Execute query
    const { data: campaigns, error, count } = await query

    if (error) {
      throw error
    }

    // Calculate progress for each campaign
    const campaignsWithProgress = campaigns.map((campaign: any) => {
      const progress = campaign.goal_amount > 0 
        ? Math.round((campaign.raised_amount / campaign.goal_amount) * 100) 
        : 0

      // Get primary media
      const primaryMedia = campaign.primary_media?.find((m: any) => m.is_primary) || campaign.primary_media?.[0]

      return {
        ...campaign,
        progress,
        primary_media_url: primaryMedia?.media_url || null,
        primary_media_thumbnail: primaryMedia?.thumbnail_url || null,
        days_left: campaign.deadline 
          ? Math.max(0, Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : null
      }
    })

    // Get categories for filter options
    const { data: categories } = await supabaseClient
      .from('campaign_categories')
      .select('id, name, slug, icon_name')
      .eq('is_active', true)
      .order('display_order')

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          campaigns: campaignsWithProgress,
          categories,
          pagination: {
            page: params.page,
            limit: params.limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / params.limit)
          }
        }
      }),
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