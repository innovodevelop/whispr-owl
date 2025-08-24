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
      setLoading(false);
      return;
    }

    initializeEncryption();
  }, [user]);

  const initializeEncryption = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Generate deterministic encryption password from user data
      const password = deriveEncryptionPassword(user.email!, user.id);
      setEncryptionPassword(password);

      // Check if user already has encryption keys
      const { data: existingKeys, error } = await supabase
        .from('user_encryption_keys')
        .select('public_key, encrypted_private_key, key_version')
        .eq('user_id', user.id)
        .single();

      if (existingKeys && !error) {
        // User has existing keys
        setUserKeys({
          publicKey: existingKeys.public_key,
          privateKey: existingKeys.encrypted_private_key,
          keyVersion: existingKeys.key_version
        });
      } else {
        // Generate new keys for user
        await generateAndStoreUserKeys(password);
      }
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAndStoreUserKeys = async (password: string) => {
    if (!user) return;

    try {
      const keyPair = await generateUserKeyPair(password);

      const { data, error } = await supabase
        .from('user_encryption_keys')
        .insert({
          user_id: user.id,
          public_key: keyPair.publicKey,
          encrypted_private_key: keyPair.privateKey,
          key_version: 1
        })
        .select()
        .single();

      if (error) throw error;

      setUserKeys({
        publicKey: data.public_key,
        privateKey: data.encrypted_private_key,
        keyVersion: data.key_version
      });
    } catch (error) {
      console.error('Failed to generate user keys:', error);
      throw error;
    }
  };

  // Get or create conversation encryption key
  const getConversationKey = useCallback(async (conversationId: string): Promise<ConversationKey | null> => {
    if (!user || !userKeys || !encryptionPassword) return null;

    try {
      // Try to fetch existing conversation key
      const { data: existingKey, error } = await supabase
        .from('conversation_encryption_keys')
        .select('encrypted_key_for_participant_one, encrypted_key_for_participant_two')
        .eq('conversation_id', conversationId)
        .single();

      if (existingKey && !error) {
        // Get conversation to determine which participant we are
        const { data: conversation } = await supabase
          .from('conversations')
          .select('participant_one, participant_two')
          .eq('id', conversationId)
          .single();

        if (!conversation) return null;

        const isParticipantOne = conversation.participant_one === user.id;
        const encryptedKeyForUser = isParticipantOne 
          ? existingKey.encrypted_key_for_participant_one
          : existingKey.encrypted_key_for_participant_two;

        return decryptConversationKey(encryptedKeyForUser, userKeys.privateKey, encryptionPassword);
      } else {
        // Create new conversation key (only if we're the conversation creator)
        return await createConversationKey(conversationId);
      }
    } catch (error) {
      console.error('Failed to get conversation key:', error);
      return null;
    }
  }, [user, userKeys, encryptionPassword]);

  const createConversationKey = async (conversationId: string): Promise<ConversationKey | null> => {
    if (!user || !userKeys) return null;

    try {
      // Get conversation participants
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('participant_one, participant_two')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) throw convError;

      // Get both participants' public keys
      const { data: participantKeys, error: keysError } = await supabase
        .from('user_encryption_keys')
        .select('user_id, public_key')
        .in('user_id', [conversation.participant_one, conversation.participant_two]);

      if (keysError || !participantKeys || participantKeys.length !== 2) {
        throw new Error('Could not get participant keys');
      }

      // Generate new conversation key
      const conversationKey = generateConversationKey();

      // Encrypt for both participants
      const participant1Key = participantKeys.find(k => k.user_id === conversation.participant_one);
      const participant2Key = participantKeys.find(k => k.user_id === conversation.participant_two);

      if (!participant1Key || !participant2Key) {
        throw new Error('Missing participant keys');
      }

      const encryptedForP1 = encryptConversationKey(conversationKey, participant1Key.public_key);
      const encryptedForP2 = encryptConversationKey(conversationKey, participant2Key.public_key);

      // Store encrypted keys
      const { error: storeError } = await supabase
        .from('conversation_encryption_keys')
        .insert({
          conversation_id: conversationId,
          encrypted_key_for_participant_one: encryptedForP1,
          encrypted_key_for_participant_two: encryptedForP2,
          key_version: 1
        });

      if (storeError) throw storeError;

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
        .from('user_encryption_keys')
        .select('public_key')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data.public_key;
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