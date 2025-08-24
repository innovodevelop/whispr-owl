import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// Local copy of required types to avoid static import cycles
export interface SignalPreKeyBundle {
  registrationId: number;
  deviceId: number;
  prekeyId?: number;
  prekey?: Uint8Array;
  signedPrekeyId: number;
  signedPrekey: Uint8Array;
  signedPrekeySignature: Uint8Array;
  identityKey: Uint8Array;
}

// Lazy loader for the heavy Signal Protocol implementation with detailed error logging
const loadSignal = async () => {
  try {
    const mod = await import('@/lib/signalProtocol');
    return mod;
  } catch (err) {
    console.error('[Signal] Failed to load signalProtocol module:', err);
    // Environment diagnostics
    console.info('[Signal] Diagnostics', {
      hasCrypto: typeof crypto !== 'undefined',
      hasSubtle: typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined',
      userAgent: navigator?.userAgent,
    });
    return null as any;
  }
};

interface SignalProtocolState {
  initialized: boolean;
  loading: boolean;
  registrationId: number | null;
}

export const useSignalProtocol = () => {
  const { user } = useAuth();
  const [state, setState] = useState<SignalProtocolState>({
    initialized: false,
    loading: true,
    registrationId: null
  });

  // Store active session keys in memory for performance
  const sessionKeysRef = useRef<Map<string, { localPrivateKey: Uint8Array; remotePublicKey: Uint8Array }>>(new Map());

  // Initialize Signal Protocol for the current user
  useEffect(() => {
    if (!user) {
      setState({ initialized: false, loading: false, registrationId: null });
      return;
    }

    initializeSignalProtocol();
  }, [user]);

  const initializeSignalProtocol = async () => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, loading: true }));

      // Check if user already has Signal Protocol keys
      const { data: existingKeys, error } = await supabase
        .from('signal_identity_keys')
        .select('registration_id')
        .eq('user_id', user.id)
        .single();

      if (existingKeys && !error) {
        // User already has keys, just mark as initialized
        setState({
          initialized: true,
          loading: false,
          registrationId: existingKeys.registration_id
        });
        console.log('Signal Protocol already initialized for user');
        return;
      }

      // Generate new Signal Protocol keys
      console.log('Generating new Signal Protocol keys for user');
      
      // Generate registration ID (1-16383)
      const registrationId = Math.floor(Math.random() * 16383) + 1;
      
      const sp = await loadSignal().catch(() => null as any);
      if (!sp) throw new Error('Signal library failed to load');
      
      // Generate identity key pair
      const identityKeyPair = sp.generateIdentityKeyPair();
      
      // Generate signed prekey
      const signedPreKey = sp.generateSignedPreKey(identityKeyPair, 1);
      
      // Generate one-time prekeys (50 keys)
      const preKeys = sp.generatePreKeys(1, 50);

      // Store all keys in database
      await Promise.all([
        sp.storeIdentityKeys(user.id, identityKeyPair, registrationId),
        sp.storeSignedPreKey(user.id, signedPreKey),
        sp.storePreKeys(user.id, preKeys)
      ]);

      setState({
        initialized: true,
        loading: false,
        registrationId
      });

      console.log('Signal Protocol initialization complete');
    } catch (error) {
      console.error('Failed to initialize Signal Protocol:', error);
      setState({ initialized: false, loading: false, registrationId: null });
    }
  };

  // Get or create session keys for a conversation
  const getSessionKeys = useCallback(async (
    conversationId: string,
    remoteUserId: string
  ): Promise<{ localPrivateKey: Uint8Array; remotePublicKey: Uint8Array } | null> => {
    if (!user || !state.initialized) return null;

    const sessionKey = `${conversationId}-${remoteUserId}`;
    
    // Check if we already have these keys in memory
    const existingKeys = sessionKeysRef.current.get(sessionKey);
    if (existingKeys) return existingKeys;

    try {
      const sp = await loadSignal().catch(() => null as any);
      if (!sp) throw new Error('Signal library failed to load');
      // Get our identity keys
      const localKeys = await sp.getUserIdentityKeys(user.id);
      if (!localKeys) {
        console.error('No local identity keys found');
        return null;
      }

      // Get remote user's public key
      const remotePublicKey = await sp.getUserPublicKey(remoteUserId);
      if (!remotePublicKey) {
        console.error('No remote public key found for user:', remoteUserId);
        return null;
      }

      const keys = {
        localPrivateKey: localKeys.privateKey,
        remotePublicKey
      };

      // Cache the keys
      sessionKeysRef.current.set(sessionKey, keys);
      
      return keys;
    } catch (error) {
      console.error('Failed to get session keys:', error);
      return null;
    }
  }, [user, state.initialized]);

  // Encrypt message for a conversation
  const encryptMessageForConversation = useCallback(async (
    message: string,
    conversationId: string,
    remoteUserId: string
  ): Promise<string | null> => {
    try {
      const keys = await getSessionKeys(conversationId, remoteUserId);
      if (!keys) return null;

      const sp = await loadSignal().catch(() => null as any);
      if (!sp) return null;

      return await sp.encryptMessageWithSignalProtocol(
        message,
        keys.localPrivateKey,
        keys.remotePublicKey
      );
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      return null;
    }
  }, [getSessionKeys]);

  // Decrypt message from a conversation
  const decryptMessageFromConversation = useCallback(async (
    encryptedMessage: string,
    conversationId: string,
    remoteUserId: string
  ): Promise<string | null> => {
    try {
      const keys = await getSessionKeys(conversationId, remoteUserId);
      if (!keys) return null;

      const sp = await loadSignal().catch(() => null as any);
      if (!sp) return null;

      return await sp.decryptMessageWithSignalProtocol(
        encryptedMessage, 
        keys.localPrivateKey, 
        keys.remotePublicKey
      );
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      return null;
    }
  }, [getSessionKeys]);

  // Get user's prekey bundle (for other users to initiate conversations)
  const getMyPreKeyBundle = useCallback(async (): Promise<SignalPreKeyBundle | null> => {
    if (!user) return null;
    const sp = await loadSignal().catch(() => null as any);
    if (!sp) return null;
    return await sp.getPreKeyBundle(user.id);
  }, [user]);

  // Check if we can communicate with a user (they have Signal Protocol keys)
  const canCommunicateWith = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const sp = await loadSignal().catch(() => null as any);
      const preKeyBundle = sp ? await sp.getPreKeyBundle(userId) : null;
      return preKeyBundle !== null;
    } catch (error) {
      console.error('Error checking if can communicate with user:', error);
      return false;
    }
  }, []);

  return {
    ...state,
    encryptMessage: encryptMessageForConversation,
    decryptMessage: decryptMessageFromConversation,
    getMyPreKeyBundle,
    canCommunicateWith,
    getSession: getSessionKeys
  };
};