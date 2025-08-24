import * as libsignal from '@signalapp/libsignal-client';
import { supabase } from '@/integrations/supabase/client';

// Signal Protocol types and interfaces
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

// Convert between Uint8Array and base64 strings for database storage
export const uint8ArrayToBase64 = (array: Uint8Array): string => {
  return Buffer.from(array).toString('base64');
};

export const base64ToUint8Array = (base64: string): Uint8Array => {
  return new Uint8Array(Buffer.from(base64, 'base64'));
};

// Generate Signal Protocol identity key pair
export const generateIdentityKeyPair = (): SignalIdentityKeyPair => {
  const keyPair = libsignal.PrivateKey.generate();
  const publicKey = keyPair.getPublicKey();
  
  return {
    publicKey: publicKey.serialize(),
    privateKey: keyPair.serialize()
  };
};

// Generate signed prekey
export const generateSignedPreKey = (identityKeyPair: SignalIdentityKeyPair, signedPreKeyId: number): {
  keyId: number;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  signature: Uint8Array;
} => {
  const privateKey = libsignal.PrivateKey.deserialize(identityKeyPair.privateKey);
  const signedPreKeyPair = libsignal.PrivateKey.generate();
  const signedPreKeyPublic = signedPreKeyPair.getPublicKey();
  
  const signature = privateKey.sign(signedPreKeyPublic.serialize());
  
  return {
    keyId: signedPreKeyId,
    publicKey: signedPreKeyPublic.serialize(),
    privateKey: signedPreKeyPair.serialize(),
    signature
  };
};

// Generate one-time prekeys
export const generatePreKeys = (startId: number, count: number): Array<{
  keyId: number;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}> => {
  const preKeys: Array<{
    keyId: number;
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  }> = [];
  
  for (let i = 0; i < count; i++) {
    const keyPair = libsignal.PrivateKey.generate();
    preKeys.push({
      keyId: startId + i,
      publicKey: keyPair.getPublicKey().serialize(),
      privateKey: keyPair.serialize()
    });
  }
  
  return preKeys;
};

// Store identity keys in database
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

// Store signed prekey in database
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

// Store one-time prekeys in database
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

// Get prekey bundle for a user
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

// Simplified Signal Protocol encryption using ECDH key agreement
export const encryptMessageWithSignalProtocol = async (
  plaintext: string,
  localPrivateKey: Uint8Array,
  remotePublicKey: Uint8Array
): Promise<string> => {
  try {
    // Use ECDH to derive a shared secret
    const localKey = libsignal.PrivateKey.deserialize(localPrivateKey);
    const remoteKey = libsignal.PublicKey.deserialize(remotePublicKey);
    
    // Generate ephemeral key pair for this message
    const ephemeralKey = libsignal.PrivateKey.generate();
    const ephemeralPublic = ephemeralKey.getPublicKey();
    
    // Derive shared secret using ECDH
    const sharedSecret = localKey.agree(remoteKey);
    
    // Use the shared secret as AES key (simplified - in real Signal Protocol, this would go through HKDF)
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const plaintextBytes = encoder.encode(plaintext);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Import the shared secret as AES-GCM key
    const key = await crypto.subtle.importKey(
      'raw',
      sharedSecret.slice(0, 32), // Use first 32 bytes as AES-256 key
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    // Encrypt the message
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plaintextBytes
    );
    
    // Combine ephemeral public key, IV, and encrypted data
    const combined = new Uint8Array(
      ephemeralPublic.serialize().length + iv.length + encryptedData.byteLength
    );
    
    combined.set(ephemeralPublic.serialize(), 0);
    combined.set(iv, ephemeralPublic.serialize().length);
    combined.set(new Uint8Array(encryptedData), ephemeralPublic.serialize().length + iv.length);
    
    return uint8ArrayToBase64(combined);
  } catch (error) {
    console.error('Failed to encrypt message:', error);
    throw error;
  }
};

// Simplified Signal Protocol decryption using ECDH key agreement
export const decryptMessageWithSignalProtocol = async (
  encryptedData: string,
  localPrivateKey: Uint8Array,
  remotePublicKey: Uint8Array
): Promise<string> => {
  try {
    const combined = base64ToUint8Array(encryptedData);
    
    // Extract components
    const ephemeralPublicBytes = combined.slice(0, 33); // Compressed public key is 33 bytes
    const iv = combined.slice(33, 33 + 12); // IV is 12 bytes
    const ciphertext = combined.slice(33 + 12);
    
    // Deserialize keys
    const localKey = libsignal.PrivateKey.deserialize(localPrivateKey);
    const remoteKey = libsignal.PublicKey.deserialize(remotePublicKey);
    const ephemeralPublic = libsignal.PublicKey.deserialize(ephemeralPublicBytes);
    
    // Derive shared secret using ECDH
    const sharedSecret = localKey.agree(remoteKey);
    
    // Import the shared secret as AES-GCM key
    const key = await crypto.subtle.importKey(
      'raw',
      sharedSecret.slice(0, 32), // Use first 32 bytes as AES-256 key
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Decrypt the message
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Failed to decrypt message:', error);
    throw error;
  }
};

// Get user's identity keys from database
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

// Get user's public identity key from database
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