import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCryptoAuth } from '@/hooks/useCryptoAuth';

interface LegacyMigrationContextType {
  needsMigration: boolean;
  isLegacyUser: boolean;
  migrationStatus: 'idle' | 'pending' | 'in_progress' | 'completed' | 'failed';
  loading: boolean;
  startMigration: () => Promise<void>;
  completeMigration: (cryptoUserId: string) => Promise<void>;
}

const LegacyMigrationContext = createContext<LegacyMigrationContextType | undefined>(undefined);

export const LegacyMigrationProvider = ({ children }: { children: React.ReactNode }) => {
  const [needsMigration, setNeedsMigration] = useState(false);
  const [isLegacyUser, setIsLegacyUser] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'pending' | 'in_progress' | 'completed' | 'failed'>('idle');
  const [loading, setLoading] = useState(true);

  const { user: legacyUser, session: legacySession } = useAuth();
  const { user: cryptoUser, isAuthenticated: cryptoAuthenticated } = useCryptoAuth();

  useEffect(() => {
    checkMigrationStatus();
  }, [legacyUser, cryptoUser]);

  const checkMigrationStatus = async () => {
    setLoading(true);

    try {
      // Check if user is authenticated via legacy Supabase Auth
      if (legacyUser && legacySession) {
        setIsLegacyUser(true);

        // Check if they have a corresponding crypto_users record
        const { data: cryptoUserData } = await supabase
          .from('crypto_users')
          .select('user_id')
          .eq('user_id', legacyUser.id)
          .maybeSingle();

        // Check for existing migration record
        const { data: migrationData } = await supabase
          .from('user_migrations')
          .select('migration_status')
          .eq('legacy_user_id', legacyUser.id)
          .maybeSingle();

        if (migrationData) {
          setMigrationStatus(migrationData.migration_status as any);
          setNeedsMigration(migrationData.migration_status !== 'completed');
        } else if (!cryptoUserData) {
          // Legacy user without crypto identity - needs migration
          setNeedsMigration(true);
          setMigrationStatus('pending');
        } else {
          // Legacy user with crypto identity - migration completed
          setNeedsMigration(false);
          setMigrationStatus('completed');
        }
      } else {
        // Not a legacy user
        setIsLegacyUser(false);
        setNeedsMigration(false);
        setMigrationStatus('idle');
      }
    } catch (error) {
      console.error('Migration status check failed:', error);
      setMigrationStatus('failed');
    }

    setLoading(false);
  };

  const startMigration = async () => {
    if (!legacyUser) return;

    setMigrationStatus('in_progress');

    try {
      // Create migration record
      const { error } = await supabase
        .from('user_migrations')
        .insert({
          legacy_user_id: legacyUser.id,
          migration_status: 'in_progress'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to start migration:', error);
      setMigrationStatus('failed');
      throw error;
    }
  };

  const completeMigration = async (cryptoUserId: string) => {
    if (!legacyUser) return;

    try {
      // Update migration record
      const { error: migrationError } = await supabase
        .from('user_migrations')
        .update({
          new_crypto_user_id: cryptoUserId,
          migration_status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('legacy_user_id', legacyUser.id);

      if (migrationError) throw migrationError;

      // Create bridge record
      const { error: bridgeError } = await supabase
        .from('legacy_crypto_bridge')
        .insert({
          legacy_user_id: legacyUser.id,
          crypto_user_id: cryptoUserId,
          migration_completed: true
        });

      if (bridgeError) throw bridgeError;

      setMigrationStatus('completed');
      setNeedsMigration(false);

      // Sign out of legacy auth after successful migration
      await supabase.auth.signOut();
      
      // Force a page reload to ensure crypto auth takes over properly
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to complete migration:', error);
      setMigrationStatus('failed');
      throw error;
    }
  };

  return (
    <LegacyMigrationContext.Provider value={{
      needsMigration,
      isLegacyUser,
      migrationStatus,
      loading,
      startMigration,
      completeMigration
    }}>
      {children}
    </LegacyMigrationContext.Provider>
  );
};

export const useLegacyMigration = () => {
  const context = useContext(LegacyMigrationContext);
  if (!context) {
    throw new Error('useLegacyMigration must be used within LegacyMigrationProvider');
  }
  return context;
};