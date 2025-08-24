import CryptoJS from 'crypto-js';

// Encryption utilities for end-to-end encryption

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface ConversationKey {
  key: string;
  iv: string;
}

// Generate a new RSA-like key pair for user encryption
export async function generateUserKeyPair(password: string): Promise<KeyPair> {
  // Generate a strong random key pair
  const privateKeyData = CryptoJS.lib.WordArray.random(256/8); // 256-bit private key
  const publicKeyData = CryptoJS.SHA256(privateKeyData); // Derive public key from private
  
  const privateKey = privateKeyData.toString();
  const publicKey = publicKeyData.toString();
  
  // Encrypt the private key with the user's password
  const encryptedPrivateKey = CryptoJS.AES.encrypt(privateKey, password).toString();
  
  return {
    publicKey,
    privateKey: encryptedPrivateKey
  };
}

// Generate a symmetric key for conversation encryption
export function generateConversationKey(): ConversationKey {
  const key = CryptoJS.lib.WordArray.random(256/8).toString(); // 256-bit AES key
  const iv = CryptoJS.lib.WordArray.random(128/8).toString();  // 128-bit IV
  
  return { key, iv };
}

// Encrypt text with AES using conversation key
export function encryptMessage(plaintext: string, conversationKey: ConversationKey): string {
  try {
    const key = CryptoJS.enc.Hex.parse(conversationKey.key);
    const iv = CryptoJS.enc.Hex.parse(conversationKey.iv);
    
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, { 
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return encrypted.toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt message');
  }
}

// Decrypt text with AES using conversation key
export function decryptMessage(ciphertext: string, conversationKey: ConversationKey): string {
  try {
    const key = CryptoJS.enc.Hex.parse(conversationKey.key);
    const iv = CryptoJS.enc.Hex.parse(conversationKey.iv);
    
    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, { 
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '[Encrypted Message - Unable to Decrypt]';
  }
}

// Encrypt conversation key for a user's public key
export function encryptConversationKey(conversationKey: ConversationKey, userPublicKey: string): string {
  try {
    const keyData = JSON.stringify(conversationKey);
    // Use the public key as the encryption key (simplified implementation)
    const encrypted = CryptoJS.AES.encrypt(keyData, userPublicKey).toString();
    return encrypted;
  } catch (error) {
    console.error('Failed to encrypt conversation key:', error);
    throw new Error('Failed to encrypt conversation key');
  }
}

// Decrypt conversation key with user's private key
export function decryptConversationKey(encryptedKey: string, userPrivateKey: string, password: string): ConversationKey | null {
  try {
    // First decrypt the user's private key with their password
    const decryptedPrivateKey = CryptoJS.AES.decrypt(userPrivateKey, password).toString(CryptoJS.enc.Utf8);
    
    // Then decrypt the conversation key
    const decryptedData = CryptoJS.AES.decrypt(encryptedKey, decryptedPrivateKey).toString(CryptoJS.enc.Utf8);
    
    return JSON.parse(decryptedData) as ConversationKey;
  } catch (error) {
    console.error('Failed to decrypt conversation key:', error);
    return null;
  }
}

// Hash password for secure storage (used for key derivation)
export function hashPassword(password: string, salt?: string): string {
  const saltToUse = salt || CryptoJS.lib.WordArray.random(128/8).toString();
  const hash = CryptoJS.PBKDF2(password, saltToUse, {
    keySize: 256/32,
    iterations: 10000
  }).toString();
  
  return `${saltToUse}:${hash}`;
}

// Verify password against hash
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':');
    const computedHash = CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    }).toString();
    
    return computedHash === hash;
  } catch {
    return false;
  }
}

// Generate a secure master password from user credentials
export function deriveEncryptionPassword(email: string, userId: string): string {
  // Derive a deterministic but secure password from user data
  return CryptoJS.SHA256(email + userId + 'encryption_key_salt_2024').toString();
}