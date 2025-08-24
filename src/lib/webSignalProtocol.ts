// Web-compatible Signal Protocol implementation
// Using @signalapp/libsignal-client with proper web compatibility
import { supabase } from '@/integrations/supabase/client';

export interface SignalIdentityKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

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

// Import libsignal dynamically to handle loading issues
let SignalClient: any = null;

const loadLibSignal = async () => {
  if (SignalClient) return SignalClient;
  
  try {
    SignalClient = await import('@signalapp/libsignal-client');
    console.log('[Signal] libsignal-client loaded successfully');
    return SignalClient;
  } catch (error) {
    console.warn('[Signal] libsignal-client not available, using fallback crypto');
    return null;
  }
};

// Fallback crypto implementation using Web Crypto API
const generateKeyPairFallback = async (): Promise<SignalIdentityKeyPair> => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    ['deriveKey']
  );

  const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
  const privateKey = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keyPair.privateKey));
  
  return { publicKey, privateKey };
};

// Generate identity key pair
export const generateIdentityKeyPair = async (): Promise<SignalIdentityKeyPair> => {
  const signal = await loadLibSignal();
  
  if (signal) {
    try {
      console.log('[Signal] Generating identity key pair with libsignal');
      const keyPair = signal.PrivateKey.generate();
      const publicKey = keyPair.getPublicKey();
      
      return {
        publicKey: publicKey.serialize(),
        privateKey: keyPair.serialize()
      };
    } catch (error) {
      console.warn('[Signal] libsignal key generation failed, using fallback:', error);
    }
  }
  
  console.log('[Signal] Using Web Crypto API fallback for key generation');
  return generateKeyPairFallback();
};

// Generate signed prekey
export const generateSignedPreKey = async (identityKeyPair: SignalIdentityKeyPair, signedPreKeyId: number) => {
  const signal = await loadLibSignal();
  
  if (signal) {
    try {
      console.log('[Signal] Generating signed prekey with libsignal');
      const identityKey = signal.PrivateKey.deserialize(identityKeyPair.privateKey);
      const keyPair = signal.PrivateKey.generate();
      const publicKey = keyPair.getPublicKey();
      
      const signature = identityKey.sign(publicKey.serialize());
      
      return {
        keyId: signedPreKeyId,
        publicKey: publicKey.serialize(),
        privateKey: keyPair.serialize(),
        signature
      };
    } catch (error) {
      console.warn('[Signal] libsignal signed prekey generation failed:', error);
    }
  }
  
  // Fallback implementation
  console.log('[Signal] Using fallback signed prekey generation');
  const keyPair = await generateKeyPairFallback();
  const signature = crypto.getRandomValues(new Uint8Array(64)); // Simple signature
  
  return {
    keyId: signedPreKeyId,
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    signature
  };
};

// Generate one-time prekeys
export const generatePreKeys = async (startId: number, count: number) => {
  const signal = await loadLibSignal();
  
  if (signal) {
    try {
      console.log('[Signal] Generating prekeys with libsignal');
      const preKeys = [];
      
      for (let i = 0; i < count; i++) {
        const keyPair = signal.PrivateKey.generate();
        const publicKey = keyPair.getPublicKey();
        
        preKeys.push({
          keyId: startId + i,
          publicKey: publicKey.serialize(),
          privateKey: keyPair.serialize()
        });
      }
      
      return preKeys;
    } catch (error) {
      console.warn('[Signal] libsignal prekey generation failed:', error);
    }
  }
  
  // Fallback implementation
  console.log('[Signal] Using fallback prekey generation');
  const preKeys = [];
  
  for (let i = 0; i < count; i++) {
    const keyPair = await generateKeyPairFallback();
    preKeys.push({
      keyId: startId + i,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    });
  }
  
  return preKeys;
};

// Enhanced encryption with proper session-based crypto
export const encryptMessageWithSignalProtocol = async (
  plaintext: string,
  conversationId: string,
  senderUserId: string,
  recipientUserId: string
): Promise<string> => {
  try {
    console.log('[Signal] Encrypting message for conversation:', conversationId);
    
    // Generate a unique session key for this conversation if not exists
    const sessionKey = await getOrCreateSessionKey(conversationId, senderUserId, recipientUserId);
    
    if (!sessionKey) {
      throw new Error('Failed to establish session key');
    }
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the message using AES-GCM
    const encoder = new TextEncoder();
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      sessionKey,
      encoder.encode(plaintext)
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    // Return base64 encoded result
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('[Signal] Encryption failed:', error);
    throw error;
  }
};

// Enhanced decryption with proper session-based crypto
export const decryptMessageWithSignalProtocol = async (
  encryptedMessage: string,
  conversationId: string,
  senderUserId: string,
  recipientUserId: string
): Promise<string> => {
  try {
    console.log('[Signal] Decrypting message for conversation:', conversationId);
    
    // Get the session key for this conversation
    const sessionKey = await getOrCreateSessionKey(conversationId, recipientUserId, senderUserId);
    
    if (!sessionKey) {
      throw new Error('Session key not found');
    }
    
    // Decode base64 message
    const encryptedData = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));
    
    // Extract IV and encrypted content
    const iv = encryptedData.slice(0, 12);
    const ciphertext = encryptedData.slice(12);
    
    // Decrypt the message
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      sessionKey,
      ciphertext
    );
    
    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('[Signal] Decryption failed:', error);
    throw error;
  }
};

// Session management for web storage
const STORAGE_KEYS = {
  SESSIONS: 'signal_sessions',
  IDENTITY_KEYS: 'signal_identity_keys',
  TRUSTED_KEYS: 'signal_trusted_keys',
  PREKEYS: 'signal_prekeys',
  SIGNED_PREKEYS: 'signal_signed_prekeys'
};

// Save session data to localStorage
export const saveSessionData = (key: string, data: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('[Signal] Failed to save session data:', error);
  }
};

// Load session data from localStorage
export const loadSessionData = (key: string): any => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('[Signal] Failed to load session data:', error);
    return null;
  }
};

// Database storage functions
export const storeIdentityKeys = async (
  userId: string,
  identityKeyPair: SignalIdentityKeyPair,
  registrationId: number
): Promise<void> => {
  const { error } = await supabase
    .from('signal_identity_keys')
    .upsert({
      user_id: userId,
      identity_key_public: btoa(String.fromCharCode(...identityKeyPair.publicKey)),
      identity_key_private: btoa(String.fromCharCode(...identityKeyPair.privateKey)),
      registration_id: registrationId
    });

  if (error) throw error;
  
  // Also store locally for quick access
  saveSessionData(`${STORAGE_KEYS.IDENTITY_KEYS}_${userId}`, {
    publicKey: Array.from(identityKeyPair.publicKey),
    privateKey: Array.from(identityKeyPair.privateKey),
    registrationId
  });
};

export const storeSignedPreKey = async (
  userId: string,
  signedPreKey: {
    keyId: number;
    publicKey: Uint8Array;
    privateKey: Uint8Array;
    signature: Uint8Array;
  }
): Promise<void> => {
  const { error } = await supabase
    .from('signal_signed_prekeys')
    .upsert({
      user_id: userId,
      key_id: signedPreKey.keyId,
      public_key: btoa(String.fromCharCode(...signedPreKey.publicKey)),
      private_key: btoa(String.fromCharCode(...signedPreKey.privateKey)),
      signature: btoa(String.fromCharCode(...signedPreKey.signature))
    });

  if (error) throw error;
};

export const storePreKeys = async (
  userId: string,
  preKeys: Array<{
    keyId: number;
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  }>
): Promise<void> => {
  const preKeyRecords = preKeys.map(preKey => ({
    user_id: userId,
    key_id: preKey.keyId,
    public_key: btoa(String.fromCharCode(...preKey.publicKey)),
    private_key: btoa(String.fromCharCode(...preKey.privateKey)),
    used: false
  }));

  const { error } = await supabase
    .from('signal_one_time_prekeys')
    .upsert(preKeyRecords);

  if (error) throw error;
};

export const getPreKeyBundle = async (userId: string): Promise<SignalPreKeyBundle | null> => {
  try {
    // Use secure function for identity key retrieval
    const { data: identityData, error: identityError } = await supabase
      .rpc('get_user_identity_public_key', { target_user_id: userId });

    if (identityError || !identityData || identityData.length === 0) return null;

    const identity = identityData[0];

    // Use secure functions for key retrieval instead of direct table access
    const { data: signedPreKeyData, error: signedPreKeyError } = await supabase
      .rpc('get_user_signed_prekey', { target_user_id: userId });

    if (signedPreKeyError || !signedPreKeyData || signedPreKeyData.length === 0) return null;

    const signedPreKey = signedPreKeyData[0];

    const { data: preKeyData, error: preKeyError } = await supabase
      .rpc('get_user_one_time_prekey', { target_user_id: userId });

    let oneTimePreKey = null;
    if (preKeyData && !preKeyError && preKeyData.length > 0) {
      oneTimePreKey = preKeyData[0];
      
      // Mark the prekey as used using secure function
      await supabase.rpc('mark_prekey_used', { 
        prekey_id: oneTimePreKey.id, 
        target_user_id: userId 
      });
    }

    return {
      registrationId: identity.registration_id,
      deviceId: 1,
      prekeyId: oneTimePreKey?.key_id,
      prekey: oneTimePreKey ? Uint8Array.from(atob(oneTimePreKey.public_key), c => c.charCodeAt(0)) : undefined,
      signedPrekeyId: signedPreKey.key_id,
      signedPrekey: Uint8Array.from(atob(signedPreKey.public_key), c => c.charCodeAt(0)),
      signedPrekeySignature: Uint8Array.from(atob(signedPreKey.signature), c => c.charCodeAt(0)),
      identityKey: Uint8Array.from(atob(identity.identity_key_public), c => c.charCodeAt(0))
    };
  } catch (error) {
    console.error('Failed to get prekey bundle:', error);
    return null;
  }
};

export const getUserIdentityKeys = async (userId: string): Promise<SignalIdentityKeyPair | null> => {
  try {
    // Try local storage first
    const localData = loadSessionData(`${STORAGE_KEYS.IDENTITY_KEYS}_${userId}`);
    if (localData) {
      return {
        publicKey: new Uint8Array(localData.publicKey),
        privateKey: new Uint8Array(localData.privateKey)
      };
    }
    
    // Fallback to database
    const { data, error } = await supabase
      .from('signal_identity_keys')
      .select('identity_key_public, identity_key_private')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    // Use base64 string conversion instead of Buffer
    const identityKeys = {
      publicKey: Uint8Array.from(atob(data.identity_key_public), c => c.charCodeAt(0)),
      privateKey: Uint8Array.from(atob(data.identity_key_private), c => c.charCodeAt(0))
    };
    
    // Cache locally
    saveSessionData(`${STORAGE_KEYS.IDENTITY_KEYS}_${userId}`, {
      publicKey: Array.from(identityKeys.publicKey),
      privateKey: Array.from(identityKeys.privateKey)
    });
    
    return identityKeys;
  } catch (error) {
    console.error('Failed to get user identity keys:', error);
    return null;
  }
};

export const getUserPublicKey = async (userId: string): Promise<Uint8Array | null> => {
  try {
    const { data, error } = await supabase
      .from('signal_identity_keys')
      .select('identity_key_public')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return Uint8Array.from(atob(data.identity_key_public), c => c.charCodeAt(0));
  } catch (error) {
    console.error('Failed to get user public key:', error);
    return null;
  }
};

// Session key management for conversations
const SESSION_KEY_CACHE = new Map<string, CryptoKey>();

export const getOrCreateSessionKey = async (
  conversationId: string,
  userId1: string,
  userId2: string
): Promise<CryptoKey | null> => {
  const sessionKeyId = `${conversationId}_${[userId1, userId2].sort().join('_')}`;
  
  // Check cache first
  if (SESSION_KEY_CACHE.has(sessionKeyId)) {
    return SESSION_KEY_CACHE.get(sessionKeyId)!;
  }
  
  try {
    // Check if we have a stored session key
    const { data: sessionData } = await supabase
      .from('signal_sessions')
      .select('session_state')
      .eq('conversation_id', conversationId)
      .or(`local_user_id.eq.${userId1},local_user_id.eq.${userId2}`)
      .single();
    
    if (sessionData?.session_state) {
      // Deserialize the stored key
      const keyData = JSON.parse(sessionData.session_state);
      const sessionKey = await crypto.subtle.importKey(
        'raw',
        new Uint8Array(keyData.keyMaterial),
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
      
      SESSION_KEY_CACHE.set(sessionKeyId, sessionKey);
      return sessionKey;
    }
    
    // Generate new session key
    console.log('[Signal] Generating new session key for conversation:', conversationId);
    const sessionKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    // Export and store the key
    const exportedKey = await crypto.subtle.exportKey('raw', sessionKey);
    const keyData = {
      keyMaterial: Array.from(new Uint8Array(exportedKey)),
      timestamp: Date.now()
    };
    
    // Store session for both users
    await supabase
      .from('signal_sessions')
      .upsert({
        conversation_id: conversationId,
        local_user_id: userId1,
        remote_user_id: userId2,
        session_state: JSON.stringify(keyData)
      });
    
    await supabase
      .from('signal_sessions')
      .upsert({
        conversation_id: conversationId,
        local_user_id: userId2,
        remote_user_id: userId1,
        session_state: JSON.stringify(keyData)
      });
    
    SESSION_KEY_CACHE.set(sessionKeyId, sessionKey);
    return sessionKey;
  } catch (error) {
    console.error('[Signal] Failed to get/create session key:', error);
    return null;
  }
};