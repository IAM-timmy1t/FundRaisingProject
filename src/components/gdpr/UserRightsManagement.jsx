import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  Trash2, 
  Edit, 
  Shield, 
  FileText, 
  Lock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const UserRightsManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
  const [confirmEmail, setConfirmEmail] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleDataExport = async () => {
    setLoading(true);
    try {
      // Call the data export edge function
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        body: { userId: user.id }
      });

      if (error) throw error;

      // Download the data
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blessed-horizon-data-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Your data has been exported successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export data. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDataDeletion = async () => {
    if (confirmEmail !== user.email) {
      setMessage({ type: 'error', text: 'Email does not match. Please try again.' });
      return;
    }

    setLoading(true);
    try {
      // Call the account deletion edge function
      const { error } = await supabase.functions.invoke('delete-user-account', {
        body: { userId: user.id, confirmEmail }
      });

      if (error) throw error;

      // Log out the user
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete account. Please contact support.' });
    } finally {
      setLoading(false);
      setConfirmDialog({ open: false, action: null });
    }
  };

  const handleDataCorrection = async (formData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: formData.displayName,
          bio: formData.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Your data has been updated successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update data. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleConsentWithdrawal = async (consentType) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_consent')
        .upsert({
          user_id: user.id,
          consent_type: consentType,
          granted: false,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Consent withdrawn successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update consent. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="bg-white/5 backdrop-blur-xl border-white/20">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-3">
            <Shield className="w-8 h-8 text-green-400" />
            Your Data Rights
          </CardTitle>
          <CardDescription className="text-gray-300">
            Under GDPR, you have the right to access, correct, delete, and control your personal data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message.text && (
            <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="access" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="access">Access</TabsTrigger>
              <TabsTrigger value="correct">Correct</TabsTrigger>
              <TabsTrigger value="delete">Delete</TabsTrigger>
              <TabsTrigger value="consent">Consent</TabsTrigger>
            </TabsList>

            <TabsContent value="access" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Right to Access</h3>
                <p className="text-gray-300">
                  You can request a copy of all personal data we hold about you.
                </p>
                <Button 
                  onClick={handleDataExport}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export My Data
                </Button>
              </div>
            </TabsContent>

            {/* Add more tab content for correct, delete, and consent */}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserRightsManagement;
