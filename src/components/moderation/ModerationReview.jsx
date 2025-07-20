import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react';
import { moderationService } from '../../services/moderationService';
import { useTranslation } from 'react-i18next';

const ModerationReview = ({ campaign, onApprove, onReject, onRequestChanges }) => {
  const { t } = useTranslation();
  const [moderationResult, setModerationResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    analyzeCampaign();
  }, [campaign]);

  const analyzeCampaign = async () => {
    setLoading(true);
    try {
      const result = await moderationService.analyzeCampaign(campaign);
      setModerationResult(result);
    } catch (error) {
      console.error('Moderation analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDecisionIcon = (decision) => {
    switch (decision) {
      case 'approved':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'review':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Shield className="w-6 h-6 text-gray-600" />;
    }
  };

  const handleApprove = () => {
    onApprove({
      ...moderationResult,
      reviewNotes,
      manualReview: true
    });
  };

  const handleReject = () => {
    onReject({
      ...moderationResult,
      reviewNotes,
      manualReview: true
    });
  };

  const handleRequestChanges = () => {
    onRequestChanges({
      ...moderationResult,
      reviewNotes,
      requestedChanges: getRecommendedChanges()
    });
  };

  const getRecommendedChanges = () => {
    const changes = [];

    if (moderationResult.scores.luxury > 50) {
      changes.push(t('moderation.changes.removeLuxury'));
    }
    if (moderationResult.scores.inappropriate > 0) {
      changes.push(t('moderation.changes.removeInappropriate'));
    }
    if (moderationResult.scores.fraud > 40) {
      changes.push(t('moderation.changes.addDetails'));
    }
    if (moderationResult.scores.trust < 50) {
      changes.push(t('moderation.changes.addTransparency'));
    }

    return changes;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!moderationResult) {
    return (
      <div className="text-center p-8 text-gray-500">
        {t('moderation.error')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t('moderation.title')}
          </h3>
          {getDecisionIcon(moderationResult.decision)}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Individual Scores */}
          <div className="text-center">
            <div className={`text-2xl font-bold ${getScoreColor(100 - moderationResult.scores.luxury)}`}>
              {100 - moderationResult.scores.luxury}%
            </div>
            <div className="text-sm text-gray-600">{t('moderation.scores.appropriate')}</div>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-bold ${getScoreColor(100 - moderationResult.scores.inappropriate)}`}>
              {100 - moderationResult.scores.inappropriate}%
            </div>
            <div className="text-sm text-gray-600">{t('moderation.scores.clean')}</div>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-bold ${getScoreColor(100 - moderationResult.scores.fraud)}`}>
              {100 - moderationResult.scores.fraud}%
            </div>
            <div className="text-sm text-gray-600">{t('moderation.scores.legitimate')}</div>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-bold ${getScoreColor(moderationResult.scores.needValidation)}`}>
              {moderationResult.scores.needValidation}%
            </div>
            <div className="text-sm text-gray-600">{t('moderation.scores.needValid')}</div>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-bold ${getScoreColor(moderationResult.scores.trust)}`}>
              {moderationResult.scores.trust}%
            </div>
            <div className="text-sm text-gray-600">{t('moderation.scores.trustworthy')}</div>
          </div>
        </div>

        {/* Overall Score */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium">{t('moderation.overallScore')}</span>
            <span className={`text-3xl font-bold ${getScoreColor(moderationResult.scores.overall)}`}>
              {moderationResult.scores.overall}%
            </span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  moderationResult.scores.overall >= 70
                    ? 'bg-green-600'
                    : moderationResult.scores.overall >= 40
                    ? 'bg-yellow-600'
                    : 'bg-red-600'
                }`}
                style={{ width: `${moderationResult.scores.overall}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Flags and Recommendations */}
      {(moderationResult.flags.length > 0 || moderationResult.recommendations.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          {moderationResult.flags.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-red-600 mb-2">{t('moderation.flags')}</h4>
              <ul className="space-y-1">
                {moderationResult.flags.map((flag, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    {t(`moderation.flagTypes.${flag}`)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {moderationResult.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium text-blue-600 mb-2">{t('moderation.recommendations')}</h4>
              <ul className="space-y-1">
                {moderationResult.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-700">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Detailed Analysis */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center justify-between w-full mb-4"
        >
          <h4 className="font-medium">{t('moderation.detailedAnalysis')}</h4>
          <Eye className={`w-5 h-5 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
        </button>

        {showDetails && (
          <div className="space-y-4">
            {moderationResult.details.luxuryItems.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-1">
                  {t('moderation.details.luxuryItems')}
                </h5>
                <div className="flex flex-wrap gap-2">
                  {moderationResult.details.luxuryItems.map((item, index) => (
                    <span key={index} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {moderationResult.details.inappropriateContent.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-1">
                  {t('moderation.details.inappropriate')}
                </h5>
                <div className="flex flex-wrap gap-2">
                  {moderationResult.details.inappropriateContent.map((item, index) => (
                    <span key={index} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {moderationResult.details.trustIndicators.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-1">
                  {t('moderation.details.trustIndicators')}
                </h5>
                <div className="flex flex-wrap gap-2">
                  {moderationResult.details.trustIndicators.map((indicator, index) => (
                    <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      {t(`moderation.trustCategories.${indicator.category}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Review Section */}
      {moderationResult.decision === 'review' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="font-medium mb-4">{t('moderation.manualReview')}</h4>
          
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder={t('moderation.reviewNotesPlaceholder')}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleApprove}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              {t('moderation.approve')}
            </button>
            <button
              onClick={handleRequestChanges}
              className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              {t('moderation.requestChanges')}
            </button>
            <button
              onClick={handleReject}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              {t('moderation.reject')}
            </button>
          </div>
        </div>
      )}

      {/* Auto-Decision Display */}
      {moderationResult.decision !== 'review' && (
        <div className={`p-4 rounded-lg ${
          moderationResult.decision === 'approved' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {getDecisionIcon(moderationResult.decision)}
            <span className="font-medium">
              {t(`moderation.decisions.${moderationResult.decision}`)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModerationReview;
