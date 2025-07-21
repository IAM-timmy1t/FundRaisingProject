import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import GDPRService from '@/services/gdpr';

export const useGDPR = () => {
  const { user } = useAuth();
  const [consents, setConsents] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load user consents
  useEffect(() => {
    if (user) {
      loadUserConsents();
    }
  }, [user]);

  const loadUserConsents = async () => {
    try {
      const userConsents = await GDPRService.getUserConsents(user.id);
      const consentMap = userConsents.reduce((acc, consent) => {
        acc[consent.consent_type] = consent.granted;
        return acc;
      }, {});
      setConsents(consentMap);
    } catch (err) {
      console.error('Error loading consents:', err);
      setError(err.message);
    }
  };

  const updateConsent = useCallback(async (consentType, granted) => {
    setLoading(true);
    setError(null);
    try {
      await GDPRService.updateConsent(user.id, consentType, granted);
      setConsents(prev => ({ ...prev, [consentType]: granted }));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const exportUserData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await GDPRService.exportUserData(user.id);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deleteAccount = useCallback(async (confirmEmail) => {
    setLoading(true);
    setError(null);
    try {
      const result = await GDPRService.deleteUserData(user.id, confirmEmail);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    consents,
    loading,
    error,
    updateConsent,
    exportUserData,
    deleteAccount,
    hasConsent: (type) => consents[type] || false,
  };
};

export default useGDPR;