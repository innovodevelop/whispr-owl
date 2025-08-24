// Mobile-compatible encryption for Capacitor apps
// Uses Web Crypto API which is available in mobile WebViews

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

// Browser-safe base64 conversion
export const uint8ArrayToBase64 = (array: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < array.length; i++) binary += String.fromCharCode(array[i]);
  return btoa(binary);
};

export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

// Generate identity key pair using Web Crypto API
export const generateIdentityKeyPair = async (): Promise<SignalIdentityKeyPair> => {
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

// Generate signed prekey
export const generateSignedPreKey = async (identityKeyPair: SignalIdentityKeyPair, signedPreKeyId: number) => {
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
  
  // Create a simple signature using the identity private key
  const signature = await crypto.subtle.sign(
    'ECDSA',
    await crypto.subtle.importKey('pkcs8', identityKeyPair.privateKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']),
    publicKey
  );

  return {
    keyId: signedPreKeyId,
    publicKey,
    privateKey,
    signature: new Uint8Array(signature)
  };
};

// Generate one-time prekeys
export const generatePreKeys = async (startId: number, count: number) => {
  const preKeys = [];
  
  for (let i = 0; i < count; i++) {
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

    preKeys.push({
      keyId: startId + i,
      publicKey,
      privateKey
    });
  }
  
  return preKeys;
};

// Simplified encryption using Web Crypto API
export const encryptMessageWithSignalProtocol = async (
  plaintext: string,
  localPrivateKey: Uint8Array,
  remotePublicKey: Uint8Array
): Promise<string> => {
  try {
    // Import keys for ECDH
    const localKey = await crypto.subtle.importKey(
      'pkcs8',
      localPrivateKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveKey']
    );

    const remoteKey = await crypto.subtle.importKey(
      'raw',
      remotePublicKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );

    // Derive shared secret
    const sharedSecret = await crypto.subtle.deriveKey(
      { name: 'ECDH', public: remoteKey },
      localKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the message
    const encoder = new TextEncoder();
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      sharedSecret,
      encoder.encode(plaintext)
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return uint8ArrayToBase64(combined);
  } catch (error) {
    console.error('Failed to encrypt message:', error);
    throw error;
  }
};

// Simplified decryption using Web Crypto API
export const decryptMessageWithSignalProtocol = async (
  encryptedData: string,
  localPrivateKey: Uint8Array,
  remotePublicKey: Uint8Array
): Promise<string> => {
  try {
    const combined = base64ToUint8Array(encryptedData);
    
    // Extract IV and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    // Import keys for ECDH
    const localKey = await crypto.subtle.importKey(
      'pkcs8',
      localPrivateKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveKey']
    );

    const remoteKey = await crypto.subtle.importKey(
      'raw',
      remotePublicKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );

    // Derive shared secret
    const sharedSecret = await crypto.subtle.deriveKey(
      { name: 'ECDH', public: remoteKey },
      localKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decrypt the message
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      sharedSecret,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Failed to decrypt message:', error);
    throw error;
  }
};

// Store/retrieve functions that use Supabase
import { supabase } from '@/integrations/supabase/client';

export const storeIdentityKeys = async (
  userId: string,
  identityKeyPair: SignalIdentityKeyPair,
  registrationId: number
): Promise<void> => {
  const { error } = await supabase
    .from('signal_identity_keys')
    .upsert({
      user_id: userId,
      identity_key_public: uint8ArrayToBase64(identityKeyPair.publicKey),
      identity_key_private: uint8ArrayToBase64(identityKeyPair.privateKey),
      registration_id: registrationId
    });

  if (error) throw error;
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
      public_key: uint8ArrayToBase64(signedPreKey.publicKey),
      private_key: uint8ArrayToBase64(signedPreKey.privateKey),
      signature: uint8ArrayToBase64(signedPreKey.signature)
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
    public_key: uint8ArrayToBase64(preKey.publicKey),
    private_key: uint8ArrayToBase64(preKey.privateKey),
    used: false
  }));

  const { error } = await supabase
    .from('signal_one_time_prekeys')
    .upsert(preKeyRecords);

  if (error) throw error;
};

export const getPreKeyBundle = async (userId: string): Promise<SignalPreKeyBundle | null> => {
  try {
    // Get identity key and registration ID
    const { data: identityData, error: identityError } = await supabase
      .from('signal_identity_keys')
      .select('identity_key_public, registration_id')
      .eq('user_id', userId)
      .single();

    if (identityError || !identityData) return null;

    // Get signed prekey
    const { data: signedPreKeyData, error: signedPreKeyError } = await supabase
      .from('signal_signed_prekeys')
      .select('key_id, public_key, signature')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (signedPreKeyError || !signedPreKeyData) return null;

    // Get an unused one-time prekey
    const { data: preKeyData, error: preKeyError } = await supabase
      .from('signal_one_time_prekeys')
      .select('key_id, public_key')
      .eq('user_id', userId)
      .eq('used', false)
      .limit(1)
      .single();

    // Mark the prekey as used if we found one
    if (preKeyData && !preKeyError) {
      await supabase
        .from('signal_one_time_prekeys')
        .update({ used: true })
        .eq('user_id', userId)
        .eq('key_id', preKeyData.key_id);
    }

    return {
      registrationId: identityData.registration_id,
      deviceId: 1, // We use device ID 1 for simplicity
      prekeyId: preKeyData?.key_id,
      prekey: preKeyData ? base64ToUint8Array(preKeyData.public_key) : undefined,
      signedPrekeyId: signedPreKeyData.key_id,
      signedPrekey: base64ToUint8Array(signedPreKeyData.public_key),
      signedPrekeySignature: base64ToUint8Array(signedPreKeyData.signature),
      identityKey: base64ToUint8Array(identityData.identity_key_public)
    };
  } catch (error) {
    console.error('Failed to get prekey bundle:', error);
    return null;
  }
};

export const getUserIdentityKeys = async (userId: string): Promise<SignalIdentityKeyPair | null> => {
  try {
    const { data, error } = await supabase
      .from('signal_identity_keys')
      .select('identity_key_public, identity_key_private')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return {
      publicKey: base64ToUint8Array(data.identity_key_public),
      privateKey: base64ToUint8Array(data.identity_key_private)
    };
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

    return base64ToUint8Array(data.identity_key_public);
  } catch (error) {
    console.error('Failed to get user public key:', error);
    return null;
  }
};
