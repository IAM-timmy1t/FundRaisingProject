import { supabase } from '../lib/supabaseClient';

// Content moderation patterns and rules
const MODERATION_RULES = {
  // Luxury/lavish item keywords
  luxuryPatterns: [
    /\b(luxury|luxurious|deluxe|premium|high-end|designer|brand new)\b/gi,
    /\b(mercedes|bmw|ferrari|lamborghini|rolex|gucci|prada|louis vuitton)\b/gi,
    /\b(mansion|villa|penthouse|yacht|private jet|first class)\b/gi,
    /\b(diamond|gold|platinum|jewelry|jewellery)\b/gi,
    /\b(vacation|holiday|resort|cruise|spa)\b/gi,
    /\b(latest|newest|top of the line|state of the art)\b/gi
  ],

  // Inappropriate content patterns
  inappropriatePatterns: [
    /\b(scam|fraud|fake|hoax|pyramid|ponzi)\b/gi,
    /\b(drugs|alcohol|cigarettes|tobacco|gambling)\b/gi,
    /\b(weapons|guns|ammunition|explosives)\b/gi,
    /\b(hate|racist|sexist|discriminate)\b/gi,
    /\b(xxx|porn|adult|escort)\b/gi
  ],

  // Suspicious financial patterns
  suspiciousFinancialPatterns: [
    /\b(quick money|fast cash|guaranteed returns|double your money)\b/gi,
    /\b(investment opportunity|forex|crypto|bitcoin)\b/gi,
    /\b(wire transfer|western union|moneygram)\b/gi,
    /\b(urgent|emergency|immediately|asap)\s+.{0,20}(money|funds|cash)/gi,
    /\$\s*\d{5,}/g, // Amounts over $10,000
    /\b\d{6,}\s*(dollars|usd|euros|pounds)\b/gi // Large amounts
  ],

  // Medical emergency verification patterns
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

  // Education verification patterns
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

// Trust indicators for positive scoring
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

class ModerationService {
  /**
   * Analyze campaign content for moderation
   * @param {Object} campaign - Campaign data to analyze
   * @returns {Object} Moderation result with scores and flags
   */
  async analyzeCampaign(campaign) {
    const startTime = Date.now();
    
    // Combine all text content for analysis
    const fullContent = this.extractTextContent(campaign);
    
    // Run all moderation checks
    const [
      luxuryScore,
      inappropriateScore,
      fraudScore,
      needValidation,
      trustScore
    ] = await Promise.all([
      this.checkLuxuryContent(fullContent, campaign),
      this.checkInappropriateContent(fullContent),
      this.checkFraudPatterns(fullContent, campaign),
      this.validateNeedType(campaign),
      this.calculateTrustIndicators(fullContent)
    ]);

    // Calculate overall moderation score
    const overallScore = this.calculateOverallScore({
      luxuryScore,
      inappropriateScore,
      fraudScore,
      needValidation,
      trustScore
    });

    // Determine moderation decision
    const decision = this.makeDecision(overallScore);

    const result = {
      campaignId: campaign.id,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime,
      scores: {
        luxury: luxuryScore,
        inappropriate: inappropriateScore,
        fraud: fraudScore,
        needValidation: needValidation,
        trust: trustScore,
        overall: overallScore
      },
      decision: decision.status,
      flags: decision.flags,
      recommendations: decision.recommendations,
      details: {
        luxuryItems: this.extractMatchedPatterns(fullContent, MODERATION_RULES.luxuryPatterns),
        inappropriateContent: this.extractMatchedPatterns(fullContent, MODERATION_RULES.inappropriatePatterns),
        suspiciousPatterns: this.extractMatchedPatterns(fullContent, MODERATION_RULES.suspiciousFinancialPatterns),
        trustIndicators: this.extractTrustIndicators(fullContent)
      }
    };

    // Store moderation result
    await this.storeModerationResult(result);

    return result;
  }

  /**
   * Extract all text content from campaign
   */
  extractTextContent(campaign) {
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

  /**
   * Check for luxury/lavish content
   */
  async checkLuxuryContent(content, campaign) {
    let score = 0;
    let matchCount = 0;

    // Check for luxury patterns
    for (const pattern of MODERATION_RULES.luxuryPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matchCount += matches.length;
        score += matches.length * 15; // 15 points per luxury keyword
      }
    }

    // Check budget items for high amounts
    if (campaign.budget_breakdown) {
      for (const item of campaign.budget_breakdown) {
        // Flag individual items over $1000 for basic needs
        if (item.amount > 1000 && campaign.need_type !== 'medical') {
          score += 20;
        }
        // Flag items over $5000 for any need
        if (item.amount > 5000) {
          score += 30;
        }
      }
    }

    // Check total goal amount
    if (campaign.goal_amount) {
      if (campaign.goal_amount > 50000) score += 25;
      if (campaign.goal_amount > 100000) score += 35;
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Check for inappropriate content
   */
  async checkInappropriateContent(content) {
    let score = 0;

    for (const pattern of MODERATION_RULES.inappropriatePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        score += matches.length * 25; // 25 points per inappropriate keyword
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Check for fraud patterns
   */
  async checkFraudPatterns(content, campaign) {
    let score = 0;

    // Check suspicious financial patterns
    for (const pattern of MODERATION_RULES.suspiciousFinancialPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        score += matches.length * 20;
      }
    }

    // Check for urgency without proper justification
    const urgencyPattern = /\b(urgent|emergency|immediately|asap|deadline|critical)\b/gi;
    const urgencyMatches = content.match(urgencyPattern);
    if (urgencyMatches && urgencyMatches.length > 2) {
      score += 15;
    }

    // Check for vague descriptions
    if (campaign.story && campaign.story.length < 200) {
      score += 10; // Too brief
    }

    // Check for missing budget breakdown
    if (!campaign.budget_breakdown || campaign.budget_breakdown.length === 0) {
      score += 20;
    }

    // Check for round numbers only (potential fake campaign)
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

  /**
   * Validate need type specific patterns
   */
  async validateNeedType(campaign) {
    const content = this.extractTextContent(campaign).toLowerCase();
    let score = 100; // Start with full score

    switch (campaign.need_type) {
      case 'medical':
        // Check for medical legitimacy
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
        // Check for education legitimacy
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
        // Emergency should have clear, specific details
        if (campaign.story && campaign.story.length < 300) {
          score -= 25; // Too vague for emergency
        }
        break;
    }

    return Math.max(score, 0);
  }

  /**
   * Calculate positive trust indicators
   */
  async calculateTrustIndicators(content) {
    let score = 50; // Base score

    // Check transparency indicators
    for (const pattern of TRUST_INDICATORS.transparency) {
      if (pattern.test(content)) {
        score += 5;
      }
    }

    // Check scripture/faith references
    for (const pattern of TRUST_INDICATORS.scripture) {
      if (pattern.test(content)) {
        score += 3;
      }
    }

    // Check community indicators
    for (const pattern of TRUST_INDICATORS.community) {
      if (pattern.test(content)) {
        score += 4;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate overall moderation score
   */
  calculateOverallScore(scores) {
    // Weighted average with penalties for high risk scores
    const weights = {
      luxury: -0.25,
      inappropriate: -0.35,
      fraud: -0.30,
      needValidation: 0.20,
      trust: 0.20
    };

    let weightedSum = 50; // Base score

    // Apply negative weights (penalties)
    weightedSum += scores.luxury * weights.luxury;
    weightedSum += scores.inappropriate * weights.inappropriate;
    weightedSum += scores.fraud * weights.fraud;

    // Apply positive weights
    weightedSum += scores.needValidation * weights.needValidation;
    weightedSum += scores.trust * weights.trust;

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, weightedSum));
  }

  /**
   * Make moderation decision based on scores
   */
  makeDecision(overallScore) {
    const decision = {
      status: 'approved',
      flags: [],
      recommendations: []
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

  /**
   * Extract matched patterns for reporting
   */
  extractMatchedPatterns(content, patterns) {
    const matches = [];
    
    for (const pattern of patterns) {
      const found = content.match(pattern);
      if (found) {
        matches.push(...found.map(match => match.trim()));
      }
    }

    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Extract positive trust indicators
   */
  extractTrustIndicators(content) {
    const indicators = [];

    for (const [category, patterns] of Object.entries(TRUST_INDICATORS)) {
      for (const pattern of patterns) {
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

  /**
   * Store moderation result in database
   */
  async storeModerationResult(result) {
    try {
      const { error } = await supabase
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

      if (error) throw error;
    } catch (error) {
      console.error('Error storing moderation result:', error);
    }
  }

  /**
   * Get moderation history for a campaign
   */
  async getModerationHistory(campaignId) {
    try {
      const { data, error } = await supabase
        .from('campaign_moderation')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('moderated_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching moderation history:', error);
      return [];
    }
  }

  /**
   * Batch moderate multiple campaigns
   */
  async batchModerate(campaigns) {
    const results = [];

    for (const campaign of campaigns) {
      try {
        const result = await this.analyzeCampaign(campaign);
        results.push(result);
      } catch (error) {
        console.error(`Error moderating campaign ${campaign.id}:`, error);
        results.push({
          campaignId: campaign.id,
          error: error.message,
          decision: 'error'
        });
      }
    }

    return results;
  }

  /**
   * Update campaign status based on moderation
   */
  async updateCampaignStatus(campaignId, moderationResult) {
    try {
      let newStatus = 'active';
      
      if (moderationResult.decision === 'rejected') {
        newStatus = 'rejected';
      } else if (moderationResult.decision === 'review') {
        newStatus = 'under_review';
      }

      const { error } = await supabase
        .from('campaigns')
        .update({
          status: newStatus,
          moderation_score: moderationResult.scores.overall,
          moderated_at: moderationResult.timestamp
        })
        .eq('id', campaignId);

      if (error) throw error;

      return { success: true, newStatus };
    } catch (error) {
      console.error('Error updating campaign status:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const moderationService = new ModerationService();

// Export for testing
export { MODERATION_RULES, TRUST_INDICATORS };
