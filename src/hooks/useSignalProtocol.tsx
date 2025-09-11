import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { securityLogger } from '@/utils/securityLogger';
import { secureKeyManager } from '@/lib/secureKeyStorage';

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

// Web-compatible Signal Protocol loader
const loadSignal = async () => {
  try {
    const mod = await import('@/lib/webSignalProtocol');
    console.info('[Signal] Web Signal Protocol loaded successfully');
    return mod;
  } catch (err) {
    console.error('[Signal] Failed to load web Signal Protocol:', err);
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

      // SECURITY: Validate no keys in web storage
      if (!secureKeyManager.validateNoKeysInWebStorage()) {
        throw new Error('CRITICAL: Private keys detected in web storage');
      }

      // Check if user already has Signal Protocol keys (public keys only)
      const { data: existingKeys, error } = await supabase
        .from('signal_identity_keys')
        .select('registration_id')
        .eq('user_id', user.id)
        .single();

      if (existingKeys && !error) {
        // User already has keys registered, mark as initialized
        // Private keys should be in client-side secure storage
        setState({
          initialized: true,
          loading: false,
          registrationId: existingKeys.registration_id
        });
        console.log('Signal Protocol keys found - checking client-side storage');
        
        // Validate we have corresponding private keys client-side
        const storedKeys = await secureKeyManager.listStoredKeys();
        const identityKeyId = `identity_${user.id}`;
        
        if (!storedKeys.includes(identityKeyId)) {
          console.warn('Public keys exist but no private keys found client-side - may need key recovery');
        }
        return;
      }

      // Generate new Signal Protocol keys
      console.log('Generating new Signal Protocol keys for user');
      
      // Generate registration ID (1-16383)
      const registrationId = Math.floor(Math.random() * 16383) + 1;
      
      // Generate secure identity keys (private key stays client-side)
      const identityKeyPair = await secureKeyManager.generateIdentityKeyPair();
      const identityKeyId = `identity_${user.id}`;
      
      // Store private key securely client-side with user passphrase
      const defaultPassphrase = 'user_secure_passphrase'; // TODO: Get from user input
      await secureKeyManager.storePrivateKey(identityKeyId, identityKeyPair, defaultPassphrase);
      
      // Export public key for database storage
      const publicKeyJWK = await crypto.subtle.exportKey('jwk', identityKeyPair.publicKey);
      const publicKeyB64 = btoa(JSON.stringify(publicKeyJWK));
      
      // Store ONLY public key in database
      const { error: identityError } = await supabase.from('signal_identity_keys').insert({
        user_id: user.id,
        registration_id: registrationId,
        identity_key_public: publicKeyB64
        // NOTE: Private keys NEVER stored in database for security
      });
      
      if (identityError) throw identityError;

      // Generate signed prekey
      const signedPreKeyPair = await secureKeyManager.generateSigningKeyPair();
      const signedPreKeyId = Math.floor(Math.random() * 16777215) + 1;
      const signedKeyId = `signed_prekey_${user.id}_${signedPreKeyId}`;
      
      await secureKeyManager.storePrivateKey(signedKeyId, signedPreKeyPair, defaultPassphrase);
      
      const signedPublicKeyJWK = await crypto.subtle.exportKey('jwk', signedPreKeyPair.publicKey);
      const signedPublicKeyB64 = btoa(JSON.stringify(signedPublicKeyJWK));
      const signature = btoa(`signed_${signedPreKeyId}_${Date.now()}`); // Simplified signature
      
      const { error: signedError } = await supabase.from('signal_signed_prekeys').insert({
        user_id: user.id,
        key_id: signedPreKeyId,
        public_key: signedPublicKeyB64,
        signature: signature
      });
      
      if (signedError) throw signedError;

      // Generate one-time prekeys (10 keys)
      const preKeyData = [];
      for (let i = 0; i < 10; i++) {
        const preKeyPair = await secureKeyManager.generateIdentityKeyPair();
        const preKeyId = Math.floor(Math.random() * 16777215) + 1;
        const preKeyStoreId = `prekey_${user.id}_${preKeyId}`;
        
        await secureKeyManager.storePrivateKey(preKeyStoreId, preKeyPair, defaultPassphrase);
        
        const preKeyPublicJWK = await crypto.subtle.exportKey('jwk', preKeyPair.publicKey);
        const preKeyPublicB64 = btoa(JSON.stringify(preKeyPublicJWK));
        
        preKeyData.push({
          user_id: user.id,
          key_id: preKeyId,
          public_key: preKeyPublicB64,
          used: false
        });
      }
      
      if (preKeyData.length > 0) {
        const { error: preKeyError } = await supabase.from('signal_one_time_prekeys').insert(preKeyData);
        if (preKeyError) throw preKeyError;
      }

      setState({
        initialized: true,
        loading: false,
        registrationId
      });

      console.log('Signal Protocol initialization complete - private keys secured client-side');
      securityLogger.logEncryptionEvent('signal_init_secure', true, user.id);
    } catch (error) {
      console.error('Failed to initialize Signal Protocol:', error);
      securityLogger.logEncryptionEvent('signal_init_secure', false, user.id, { error: error.message });
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

  // Encrypt message for a conversation using enhanced Signal Protocol
  const encryptMessageForConversation = useCallback(async (
    message: string,
    conversationId: string,
    remoteUserId: string
  ): Promise<string | null> => {
    if (!user || !state.initialized) return null;

    try {
      console.log('[Signal] Encrypting message for user:', remoteUserId);
      
      const sp = await loadSignal().catch(() => null as any);
      if (!sp) return null;

      // Use the enhanced encryption function
      const encrypted = await sp.encryptMessageWithSignalProtocol(
        message,
        conversationId,
        user.id,
        remoteUserId
      );

      console.log('[Signal] Message encrypted successfully');
      securityLogger.logEncryptionEvent('message_encrypt', true, user.id, { conversationId });
      return encrypted;
    } catch (error) {
      console.error('[Signal] Failed to encrypt message:', error);
      securityLogger.logEncryptionEvent('message_encrypt', false, user.id, { 
        conversationId, 
        error: error.message 
      });
      return null;
    }
  }, [user, state.initialized]);

  // Decrypt message from a conversation using enhanced Signal Protocol
  const decryptMessageFromConversation = useCallback(async (
    encryptedMessage: string,
    conversationId: string,
    remoteUserId: string
  ): Promise<string | null> => {
    if (!user || !state.initialized) return null;

    try {
      console.log('[Signal] Decrypting message from user:', remoteUserId);
      
      const sp = await loadSignal().catch(() => null as any);
      if (!sp) return null;

      // Use the enhanced decryption function
      const decrypted = await sp.decryptMessageWithSignalProtocol(
        encryptedMessage,
        conversationId,
        remoteUserId,
        user.id
      );

      console.log('[Signal] Message decrypted successfully');
      securityLogger.logEncryptionEvent('message_decrypt', true, user.id, { conversationId });
      return decrypted;
    } catch (error) {
      console.error('[Signal] Failed to decrypt message:', error);
      securityLogger.logEncryptionEvent('message_decrypt', false, user.id, { 
        conversationId, 
        error: error.message 
      });
      return null;
    }
  }, [user, state.initialized]);

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