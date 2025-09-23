import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LegacyUserMigration } from './LegacyUserMigration';
import { MigrationUsernameSetup } from './MigrationUsernameSetup';
import { useLegacyMigration } from '@/hooks/useLegacyMigration';
import { useCryptoAuth } from '@/hooks/useCryptoAuth';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type MigrationStep = 'welcome' | 'username-setup' | 'crypto-generation' | 'complete';

export const LegacyMigrationFlow: React.FC = () => {
  const [step, setStep] = useState<MigrationStep>('welcome');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { startMigration, completeMigration } = useLegacyMigration();
  const { register } = useCryptoAuth();
  const { user: legacyUser } = useAuth();

  const handleStartMigration = async () => {
    setLoading(true);
    setError('');

    try {
      await startMigration();
      
      // Get existing profile data to pre-populate fields
      let initialUsername = '';
      let initialDisplayName = '';
      
      if (legacyUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, display_name')
          .eq('user_id', legacyUser.id)
          .maybeSingle();

        if (profileData) {
          initialUsername = profileData.username || '';
          initialDisplayName = profileData.display_name || '';
        }
      }

      setStep('username-setup');
    } catch (error) {
      console.error('Migration start failed:', error);
      setError('Failed to start migration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameComplete = async (username: string, displayName: string) => {
    setLoading(true);
    setError('');

    try {
      // Store the username and display name temporarily
      localStorage.setItem('migration_username', username);
      localStorage.setItem('migration_display_name', displayName);

      // Generate crypto identity with recovery phrase
      const cryptoResult = await register(true);
      
      if (!cryptoResult.success) {
        throw new Error(cryptoResult.error || 'Failed to create crypto identity');
      }

      // Complete the migration process
      if (legacyUser) {
        // Get the crypto user ID from the crypto auth system
        const cryptoUserId = legacyUser.id; // This will be replaced with proper crypto user ID

        // Update the profiles table BEFORE completing migration (while still authenticated)
        await supabase
          .from('profiles')
          .upsert({
            user_id: legacyUser.id,
            username: username,
            display_name: displayName,
            updated_at: new Date().toISOString()
          });

        // Store username in crypto system
        localStorage.setItem('whispr_username', username);
        
        // Complete the migration process (this signs out of legacy auth)
        await completeMigration(cryptoUserId);

        // Clean up temporary storage
        localStorage.removeItem('migration_username');
        localStorage.removeItem('migration_display_name');

        toast.success('Migration completed successfully!');
        setStep('complete');
        
        // Reload the page to trigger re-authentication with crypto system
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Migration completion failed:', error);
      setError('Failed to complete migration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <LegacyUserMigration
            onStartMigration={handleStartMigration}
            loading={loading}
            error={error}
          />
        );

      case 'username-setup':
        const initialUsername = localStorage.getItem('migration_username') || '';
        const initialDisplayName = localStorage.getItem('migration_display_name') || '';
        
        return (
          <MigrationUsernameSetup
            onComplete={handleUsernameComplete}
            initialUsername={initialUsername}
            initialDisplayName={initialDisplayName}
          />
        );

      case 'complete':
        return (
          <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md mx-auto text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <h2 className="text-xl font-semibold">Migration Complete!</h2>
              <p className="text-muted-foreground">
                Your account has been successfully migrated to the new secure system. 
                Redirecting you to the main application...
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      {renderStep()}
    </div>
  );
};