import { gcm } from '@noble/ciphers/aes';

// Use Web Crypto API for random bytes since @noble/ciphers/utils doesn't export randomBytes
function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

// Modern encryption using @noble/ciphers and Web Crypto API

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface ConversationKey {
  key: string;
  iv: string;
}

// Helper functions for encoding/decoding
function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(base64: string): Uint8Array {
  return new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
}

function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

// Generate a new key pair for user encryption
export async function generateUserKeyPair(password: string): Promise<KeyPair> {
  // Generate a strong random private key
  const privateKeyBytes = randomBytes(32); // 256-bit private key
  
  // Derive public key from private key (simplified - hash of private key)
  const privateKeyHash = await crypto.subtle.digest('SHA-256', privateKeyBytes);
  const publicKeyBytes = new Uint8Array(privateKeyHash);
  
  const privateKey = bytesToBase64(privateKeyBytes);
  const publicKey = bytesToBase64(publicKeyBytes);
  
  // Encrypt the private key with the user's password
  const encryptedPrivateKey = await encryptWithPassword(privateKey, password);
  
  return {
    publicKey,
    privateKey: encryptedPrivateKey
  };
}

// Generate a symmetric key for conversation encryption
export function generateConversationKey(): ConversationKey {
  const key = bytesToBase64(randomBytes(32)); // 256-bit AES key
  const iv = bytesToBase64(randomBytes(12));  // 96-bit IV for GCM
  
  return { key, iv };
}

// Encrypt text with AES-GCM using conversation key
export function encryptMessage(plaintext: string, conversationKey: ConversationKey): string {
  try {
    const key = base64ToBytes(conversationKey.key);
    const iv = base64ToBytes(conversationKey.iv);
    const plaintextBytes = textToBytes(plaintext);
    
    const cipher = gcm(key, iv);
    const encrypted = cipher.encrypt(plaintextBytes);
    
    return bytesToBase64(encrypted);
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt message');
  }
}

// Decrypt text with AES-GCM using conversation key
export function decryptMessage(ciphertext: string, conversationKey: ConversationKey): string {
  try {
    const key = base64ToBytes(conversationKey.key);
    const iv = base64ToBytes(conversationKey.iv);
    const ciphertextBytes = base64ToBytes(ciphertext);
    
    const cipher = gcm(key, iv);
    const decrypted = cipher.decrypt(ciphertextBytes);
    
    return bytesToText(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '[Encrypted Message - Unable to Decrypt]';
  }
}

// Encrypt conversation key for a user's public key
export function encryptConversationKey(conversationKey: ConversationKey, userPublicKey: string): string {
  try {
    const keyData = JSON.stringify(conversationKey);
    const publicKeyBytes = base64ToBytes(userPublicKey);
    
    // Use first 32 bytes of public key as encryption key (simplified)
    const encryptionKey = publicKeyBytes.slice(0, 32);
    const iv = randomBytes(12);
    
    const cipher = gcm(encryptionKey, iv);
    const encrypted = cipher.encrypt(textToBytes(keyData));
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.length);
    combined.set(iv, 0);
    combined.set(encrypted, iv.length);
    
    return bytesToBase64(combined);
  } catch (error) {
    console.error('Failed to encrypt conversation key:', error);
    throw new Error('Failed to encrypt conversation key');
  }
}

// Decrypt conversation key with user's private key
export async function decryptConversationKey(encryptedKey: string, userPrivateKey: string, password: string): Promise<ConversationKey | null> {
  try {
    // First decrypt the user's private key with their password
    const decryptedPrivateKey = await decryptWithPassword(userPrivateKey, password);
    const privateKeyBytes = base64ToBytes(decryptedPrivateKey);
    
    // Use first 32 bytes as decryption key
    const decryptionKey = privateKeyBytes.slice(0, 32);
    
    // Extract IV and encrypted data
    const combined = base64ToBytes(encryptedKey);
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const cipher = gcm(decryptionKey, iv);
    const decrypted = cipher.decrypt(encrypted);
    
    return JSON.parse(bytesToText(decrypted)) as ConversationKey;
  } catch (error) {
    console.error('Failed to decrypt conversation key:', error);
    return null;
  }
}

// Encrypt text with password using Web Crypto API
async function encryptWithPassword(text: string, password: string): Promise<string> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  
  // Derive key from password
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textToBytes(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  // Encrypt the text
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    textToBytes(text)
  );
  
  // Combine salt, IV, and encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  
  return bytesToBase64(combined);
}

// Decrypt text with password using Web Crypto API
async function decryptWithPassword(encryptedText: string, password: string): Promise<string> {
  const combined = base64ToBytes(encryptedText);
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encrypted = combined.slice(28);
  
  // Derive key from password
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textToBytes(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  // Decrypt the text
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encrypted
  );
  
  return bytesToText(new Uint8Array(decrypted));
}

// Hash password for secure storage
export async function hashPassword(password: string, salt?: string): Promise<string> {
  const saltBytes = salt ? base64ToBytes(salt) : randomBytes(16);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textToBytes(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  const saltBase64 = bytesToBase64(saltBytes);
  const hashBase64 = bytesToBase64(new Uint8Array(hash));
  
  return `${saltBase64}:${hashBase64}`;
}

// Verify password against hash
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, hash] = storedHash.split(':');
    const computedHash = await hashPassword(password, salt);
    const [, computedHashPart] = computedHash.split(':');
    
    return computedHashPart === hash;
  } catch {
    return false;
  }
}

// Generate a secure master password from user credentials
export async function deriveEncryptionPassword(email: string, userId: string): Promise<string> {
  const data = textToBytes(email + userId + 'encryption_key_salt_2024');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bytesToBase64(new Uint8Array(hash));
}