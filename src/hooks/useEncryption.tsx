import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  KeyPair,
  ConversationKey,
  generateUserKeyPair,
  generateConversationKey,
  encryptConversationKey,
  decryptConversationKey,
  deriveEncryptionPassword
} from '@/lib/encryption';

interface UserEncryptionKeys {
  publicKey: string;
  privateKey: string;
  keyVersion: number;
}

export const useEncryption = () => {
  const { user } = useAuth();
  const [userKeys, setUserKeys] = useState<UserEncryptionKeys | null>(null);
  const [loading, setLoading] = useState(true);
  const [encryptionPassword, setEncryptionPassword] = useState<string | null>(null);

  // Initialize encryption for user
  useEffect(() => {
    if (!user) {
      console.log("useEncryption: No user, setting loading to false");
      setLoading(false);
      return;
    }

    console.log("useEncryption: User found, initializing Signal Protocol encryption");
    // Use setTimeout to prevent blocking the main thread
    const timeoutId = setTimeout(() => {
      initializeEncryption().catch((error) => {
        console.error("useEncryption: Critical error during initialization:", error);
        setLoading(false);
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [user]);

  const initializeEncryption = async () => {
    if (!user) return;

    try {
      console.log("useEncryption: Starting Signal Protocol encryption initialization");
      setLoading(true);
      
      // Generate deterministic encryption password from user data
      console.log("useEncryption: Generating encryption password");
      const password = await deriveEncryptionPassword(user.email!, user.id);
      setEncryptionPassword(password);

      console.log("useEncryption: Checking for existing Signal Protocol identity keys");
      // Check if user already has Signal Protocol identity keys
      const { data: existingKeys, error } = await supabase
        .from('signal_identity_keys')
        .select('identity_key_public, identity_key_private, registration_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingKeys && !error) {
        console.log("useEncryption: Found existing Signal Protocol keys");
        // User has existing Signal Protocol keys 
        setUserKeys({
          publicKey: existingKeys.identity_key_public,
          privateKey: existingKeys.identity_key_private,
          keyVersion: 1
        });
      } else {
        console.log("useEncryption: No existing keys, generating new Signal Protocol keys");
        // Generate new Signal Protocol keys for user
        await generateAndStoreSignalKeys(password);
      }
      console.log("useEncryption: Signal Protocol initialization complete");
    } catch (error) {
      console.error('useEncryption: Failed to initialize Signal Protocol encryption:', error);
    } finally {
      console.log("useEncryption: Setting loading to false");
      setLoading(false);
    }
  };

  const generateAndStoreSignalKeys = async (password: string) => {
    if (!user) return;

    try {
      // Generate identity key pair using our encryption system
      const keyPair = await generateUserKeyPair(password);
      
      // Generate registration ID (1-16383 range as per Signal Protocol spec)
      const registrationId = Math.floor(Math.random() * 16383) + 1;

      // Store in Signal Protocol identity keys table (using string storage for simplicity)
      const { data, error } = await supabase
        .from('signal_identity_keys')
        .insert({
          user_id: user.id,
          identity_key_public: keyPair.publicKey,
          identity_key_private: keyPair.privateKey,
          registration_id: registrationId
        })
        .select()
        .single();

      if (error) throw error;

      setUserKeys({
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        keyVersion: 1
      });

      console.log('Generated and stored Signal Protocol keys');
    } catch (error) {
      console.error('Failed to generate Signal Protocol keys:', error);
      throw error;
    }
  };

  // Get or create conversation encryption key (simplified for our system)
  const getConversationKey = useCallback(async (conversationId: string): Promise<ConversationKey | null> => {
    if (!user || !userKeys || !encryptionPassword) return null;

    try {
      // For our simplified Signal Protocol-inspired system, we'll generate a conversation key on-demand
      // In a full Signal Protocol implementation, this would involve complex session management
      const conversationKey = generateConversationKey();
      console.log('Generated conversation key for conversation:', conversationId);
      return conversationKey;
    } catch (error) {
      console.error('Failed to get conversation key:', error);
      return null;
    }
  }, [user, userKeys, encryptionPassword]);

  const createConversationKey = async (conversationId: string): Promise<ConversationKey | null> => {
    if (!user || !userKeys) return null;

    try {
      // In our simplified Signal Protocol-inspired system, just generate a new conversation key
      // In a full implementation, this would involve X3DH key exchange and Double Ratchet
      const conversationKey = generateConversationKey();
      console.log('Created new conversation key for conversation:', conversationId);
      return conversationKey;
    } catch (error) {
      console.error('Failed to create conversation key:', error);
      return null;
    }
  };

  // Get public key for a user
  const getUserPublicKey = useCallback(async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('signal_identity_keys')
        .select('identity_key_public')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      
      // Return the public key directly
      return data.identity_key_public;
    } catch (error) {
      console.error('Failed to get user public key:', error);
      return null;
    }
  }, []);

  return {
    userKeys,
    loading,
    encryptionReady: !!userKeys && !!encryptionPassword,
    getConversationKey,
    createConversationKey,
    getUserPublicKey,
    encryptionPassword
  };
};