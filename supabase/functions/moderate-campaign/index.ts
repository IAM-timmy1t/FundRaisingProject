// Campaign Moderation Edge Function
// Automatically screens campaign content for luxury items, suspicious patterns, and content quality

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Moderation patterns (matching the moderationService patterns)
const MODERATION_RULES = {
  luxuryPatterns: [
    /\b(luxury|luxurious|deluxe|premium|high-end|designer|brand new)\b/gi,
    /\b(mercedes|bmw|ferrari|lamborghini|rolex|gucci|prada|louis vuitton)\b/gi,
    /\b(mansion|villa|penthouse|yacht|private jet|first class)\b/gi,
    /\b(diamond|gold|platinum|jewelry|jewellery)\b/gi,
    /\b(vacation|holiday|resort|cruise|spa)\b/gi,
    /\b(latest|newest|top of the line|state of the art)\b/gi
  ],

  inappropriatePatterns: [
    /\b(scam|fraud|fake|hoax|pyramid|ponzi)\b/gi,
    /\b(drugs|alcohol|cigarettes|tobacco|gambling)\b/gi,
    /\b(weapons|guns|ammunition|explosives)\b/gi,
    /\b(hate|racist|sexist|discriminate)\b/gi,
    /\b(xxx|porn|adult|escort)\b/gi
  ],

  suspiciousFinancialPatterns: [
    /\b(quick money|fast cash|guaranteed returns|double your money)\b/gi,
    /\b(investment opportunity|forex|crypto|bitcoin)\b/gi,
    /\b(wire transfer|western union|moneygram)\b/gi,
    /\b(urgent|emergency|immediately|asap)\s+.{0,20}(money|funds|cash)/gi,
    /\$\s*\d{5,}/g,
    /\b\d{6,}\s*(dollars|usd|euros|pounds)\b/gi
  ],

  medicalPatterns: {
    legitimate: [
      /\b(hospital|clinic|medical center|healthcare)\b/gi,
      /\b(surgery|operation|treatment|therapy|medication)\b/gi,
      /\b(cancer|diabetes|heart|kidney|liver)\b/gi,
      /\b(doctor|physician|surgeon|specialist)\b/gi,
      /\b(diagnosis|prognosis|condition|disease)\b/gi
    ],
    suspicious: [
      /\b(miracle cure|guaranteed healing|100% success)\b/gi,
      /\b(alternative medicine|experimental|untested)\b/gi,
      /\b(overseas treatment|foreign doctor)\b/gi
    ]
  },

  educationPatterns: {
    legitimate: [
      /\b(university|college|school|institute|academy)\b/gi,
      /\b(tuition|fees|books|supplies|dormitory)\b/gi,
      /\b(scholarship|student|degree|diploma|certificate)\b/gi,
      /\b(semester|term|academic year|course)\b/gi
    ],
    suspicious: [
      /\b(online degree|fast track|guaranteed admission)\b/gi,
      /\b(pay for grades|buy diploma)\b/gi
    ]
  }
};

const TRUST_INDICATORS = {
  transparency: [
    /\b(receipt|invoice|documentation|proof|evidence)\b/gi,
    /\b(breakdown|itemized|detailed|specific)\b/gi,
    /\b(accountability|transparent|track|monitor)\b/gi
  ],
  
  scripture: [
    /\b(God|Lord|Jesus|Christ|faith|prayer|blessing)\b/gi,
    /\b(bible|scripture|verse|psalm|proverbs)\b/gi,
    /\b(church|ministry|congregation|fellowship)\b/gi
  ],

  community: [
    /\b(community|family|neighbor|support|help)\b/gi,
    /\b(local|hometown|village|region)\b/gi,
    /\b(together|unity|collective|shared)\b/gi
  ]
};

interface Campaign {
  id: string;
  title: string;
  story: string;
  description?: string;
  need_type: string;
  goal_amount: number;
  budget_breakdown: Array<{
    item: string;
    amount: number;
    description?: string;
  }>;
}

interface ModerationResult {
  campaignId: string;
  timestamp: string;
  processingTime: number;
  scores: {
    luxury: number;
    inappropriate: number;
    fraud: number;
    needValidation: number;
    trust: number;
    overall: number;
  };
  decision: 'approved' | 'review' | 'rejected';
  flags: string[];
  recommendations: string[];
  details: {
    luxuryItems: string[];
    inappropriateContent: string[];
    suspiciousPatterns: string[];
    trustIndicators: Array<{ category: string; found: boolean }>;
  };
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    
    // Get campaign data from request
    const { campaignId, campaign } = await req.json();

    // If only campaignId provided, fetch campaign data
    let campaignData: Campaign = campaign;
    if (!campaignData && campaignId) {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw new Error(`Failed to fetch campaign: ${error.message}`);
      campaignData = data;
    }

    if (!campaignData) {
      throw new Error('Campaign data is required');
    }

    // Extract all text content
    const fullContent = extractTextContent(campaignData);

    // Run all moderation checks
    const [
      luxuryScore,
      inappropriateScore,
      fraudScore,
      needValidation,
      trustScore
    ] = await Promise.all([
      checkLuxuryContent(fullContent, campaignData),
      checkInappropriateContent(fullContent),
      checkFraudPatterns(fullContent, campaignData),
      validateNeedType(campaignData),
      calculateTrustIndicators(fullContent)
    ]);

    // Calculate overall score
    const overallScore = calculateOverallScore({
      luxuryScore,
      inappropriateScore,
      fraudScore,
      needValidation,
      trustScore
    });

    // Make decision
    const decision = makeDecision(overallScore);

    // Build result
    const result: ModerationResult = {
      campaignId: campaignData.id,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime,
      scores: {
        luxury: luxuryScore,
        inappropriate: inappropriateScore,
        fraud: fraudScore,
        needValidation,
        trust: trustScore,
        overall: overallScore
      },
      decision: decision.status,
      flags: decision.flags,
      recommendations: decision.recommendations,
      details: {
        luxuryItems: extractMatchedPatterns(fullContent, MODERATION_RULES.luxuryPatterns),
        inappropriateContent: extractMatchedPatterns(fullContent, MODERATION_RULES.inappropriatePatterns),
        suspiciousPatterns: extractMatchedPatterns(fullContent, MODERATION_RULES.suspiciousFinancialPatterns),
        trustIndicators: extractTrustIndicators(fullContent)
      }
    };

    // Store moderation result
    const { error: storeError } = await supabase
      .from('campaign_moderation')
      .insert({
        campaign_id: result.campaignId,
        moderation_score: result.scores.overall,
        decision: result.decision,
        flags: result.flags,
        details: result.details,
        recommendations: result.recommendations,
        processing_time: result.processingTime,
        moderated_at: result.timestamp
      });

    if (storeError) {
      console.error('Error storing moderation result:', storeError);
    }

    // Update campaign status based on moderation
    let newStatus = 'active';
    if (result.decision === 'rejected') {
      newStatus = 'rejected';
    } else if (result.decision === 'review') {
      newStatus = 'under_review';
    }

    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        status: newStatus,
        moderation_score: result.scores.overall,
        moderated_at: result.timestamp
      })
      .eq('id', campaignData.id);

    if (updateError) {
      console.error('Error updating campaign status:', updateError);
    }

    // Send notification if manual review needed
    if (result.decision === 'review') {
      await sendReviewNotification(campaignData, result);
    }

    return new Response(
      JSON.stringify({
        success: true,
        result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// Helper functions

function extractTextContent(campaign: Campaign): string {
  const contentParts = [
    campaign.title || '',
    campaign.story || '',
    campaign.description || '',
    ...(campaign.budget_breakdown || []).map(item => 
      `${item.item} ${item.description || ''}`
    )
  ];

  return contentParts.join(' ').toLowerCase();
}

async function checkLuxuryContent(content: string, campaign: Campaign): Promise<number> {
  let score = 0;
  let matchCount = 0;

  // Check for luxury patterns
  for (const pattern of MODERATION_RULES.luxuryPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      matchCount += matches.length;
      score += matches.length * 15;
    }
  }

  // Check budget items
  if (campaign.budget_breakdown) {
    for (const item of campaign.budget_breakdown) {
      if (item.amount > 1000 && campaign.need_type !== 'medical') {
        score += 20;
      }
      if (item.amount > 5000) {
        score += 30;
      }
    }
  }

  // Check total goal
  if (campaign.goal_amount > 50000) score += 25;
  if (campaign.goal_amount > 100000) score += 35;

  return Math.min(score, 100);
}

async function checkInappropriateContent(content: string): Promise<number> {
  let score = 0;

  for (const pattern of MODERATION_RULES.inappropriatePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      score += matches.length * 25;
    }
  }

  return Math.min(score, 100);
}

async function checkFraudPatterns(content: string, campaign: Campaign): Promise<number> {
  let score = 0;

  // Check suspicious patterns
  for (const pattern of MODERATION_RULES.suspiciousFinancialPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      score += matches.length * 20;
    }
  }

  // Check urgency
  const urgencyPattern = /\b(urgent|emergency|immediately|asap|deadline|critical)\b/gi;
  const urgencyMatches = content.match(urgencyPattern);
  if (urgencyMatches && urgencyMatches.length > 2) {
    score += 15;
  }

  // Check story length
  if (campaign.story && campaign.story.length < 200) {
    score += 10;
  }

  // Check budget breakdown
  if (!campaign.budget_breakdown || campaign.budget_breakdown.length === 0) {
    score += 20;
  }

  // Check round numbers
  if (campaign.budget_breakdown) {
    const allRound = campaign.budget_breakdown.every(item => 
      item.amount % 100 === 0
    );
    if (allRound && campaign.budget_breakdown.length > 2) {
      score += 15;
    }
  }

  return Math.min(score, 100);
}

async function validateNeedType(campaign: Campaign): Promise<number> {
  const content = extractTextContent(campaign).toLowerCase();
  let score = 100;

  switch (campaign.need_type) {
    case 'medical':
      const medicalLegit = MODERATION_RULES.medicalPatterns.legitimate.some(
        pattern => pattern.test(content)
      );
      const medicalSuspicious = MODERATION_RULES.medicalPatterns.suspicious.some(
        pattern => pattern.test(content)
      );
      
      if (!medicalLegit) score -= 30;
      if (medicalSuspicious) score -= 40;
      break;

    case 'education':
      const eduLegit = MODERATION_RULES.educationPatterns.legitimate.some(
        pattern => pattern.test(content)
      );
      const eduSuspicious = MODERATION_RULES.educationPatterns.suspicious.some(
        pattern => pattern.test(content)
      );
      
      if (!eduLegit) score -= 30;
      if (eduSuspicious) score -= 40;
      break;

    case 'emergency':
      if (campaign.story && campaign.story.length < 300) {
        score -= 25;
      }
      break;
  }

  return Math.max(score, 0);
}

async function calculateTrustIndicators(content: string): Promise<number> {
  let score = 50;

  // Check transparency
  for (const pattern of TRUST_INDICATORS.transparency) {
    if (pattern.test(content)) {
      score += 5;
    }
  }

  // Check scripture
  for (const pattern of TRUST_INDICATORS.scripture) {
    if (pattern.test(content)) {
      score += 3;
    }
  }

  // Check community
  for (const pattern of TRUST_INDICATORS.community) {
    if (pattern.test(content)) {
      score += 4;
    }
  }

  return Math.min(score, 100);
}

function calculateOverallScore(scores: any): number {
  const weights = {
    luxury: -0.25,
    inappropriate: -0.35,
    fraud: -0.30,
    needValidation: 0.20,
    trust: 0.20
  };

  let weightedSum = 50;

  weightedSum += scores.luxury * weights.luxury;
  weightedSum += scores.inappropriate * weights.inappropriate;
  weightedSum += scores.fraud * weights.fraud;
  weightedSum += scores.needValidation * weights.needValidation;
  weightedSum += scores.trust * weights.trust;

  return Math.max(0, Math.min(100, weightedSum));
}

function makeDecision(overallScore: number): any {
  const decision = {
    status: 'approved' as const,
    flags: [] as string[],
    recommendations: [] as string[]
  };

  if (overallScore >= 70) {
    decision.status = 'approved';
    decision.recommendations.push('Campaign looks good for publication');
  } else if (overallScore >= 40) {
    decision.status = 'review';
    decision.flags.push('manual_review_required');
    decision.recommendations.push(
      'Campaign requires manual review',
      'Consider requesting additional documentation'
    );
  } else {
    decision.status = 'rejected';
    decision.flags.push('high_risk');
    decision.recommendations.push(
      'Campaign does not meet platform guidelines',
      'Significant concerns detected'
    );
  }

  return decision;
}

function extractMatchedPatterns(content: string, patterns: RegExp[]): string[] {
  const matches: string[] = [];
  
  for (const pattern of patterns) {
    const found = content.match(pattern);
    if (found) {
      matches.push(...found.map(match => match.trim()));
    }
  }

  return [...new Set(matches)];
}

function extractTrustIndicators(content: string): Array<{ category: string; found: boolean }> {
  const indicators: Array<{ category: string; found: boolean }> = [];

  for (const [category, patterns] of Object.entries(TRUST_INDICATORS)) {
    for (const pattern of patterns as RegExp[]) {
      if (pattern.test(content)) {
        indicators.push({
          category,
          found: true
        });
        break;
      }
    }
  }

  return indicators;
}

async function sendReviewNotification(campaign: Campaign, result: ModerationResult) {
  try {
    await supabase
      .from('notifications')
      .insert({
        user_id: campaign.created_by,
        type: 'campaign_review',
        title: 'Campaign Under Review',
        body: `Your campaign "${campaign.title}" is under review. We'll notify you once the review is complete.`,
        metadata: {
          campaign_id: campaign.id,
          moderation_score: result.scores.overall,
          flags: result.flags
        }
      });
  } catch (error) {
    console.error('Error sending review notification:', error);
  }
}
