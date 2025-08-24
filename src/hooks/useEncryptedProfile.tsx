import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEncryption } from '@/hooks/useEncryption';
import { encryptMessage, decryptMessage } from '@/lib/encryption';

export const useEncryptedProfile = () => {
  const { user } = useAuth();
  const { getConversationKey, encryptionReady, createConversationKey } = useEncryption();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch and decrypt user profile
  const fetchProfile = useCallback(async () => {
    if (!user || !encryptionReady) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      // For now, we'll keep profile data unencrypted for searchability
      // In a real implementation, you'd need a conversation-independent key for profiles
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user, encryptionReady]);

  // Update profile with optional encryption
  const updateProfile = useCallback(async (updates: any) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return false;
      }

      // Refresh profile data
      await fetchProfile();
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  }, [user, fetchProfile]);

  // Create profile for new user
  const createProfile = useCallback(async (profileData: any) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          ...profileData
        });

      if (error) {
        console.error('Error creating profile:', error);
        return false;
      }

      await fetchProfile();
      return true;
    } catch (error) {
      console.error('Error creating profile:', error);
      return false;
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    updateProfile,
    createProfile,
    fetchProfile
  };
};
