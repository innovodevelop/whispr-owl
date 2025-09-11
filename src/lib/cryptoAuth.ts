// Cryptographic authentication utilities for device-based login
import { supabase } from "@/integrations/supabase/client";

// Types for the crypto auth system
export interface CryptoKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface StoredKeyPair {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
}

export interface Challenge {
  challenge_id: string;
  challenge_string: string;
  expires_at: string;
}

export interface DeviceLinkRequest {
  request_id: string;
  device_code?: string;
  challenge_string: string;
  expires_at: string;
}

export interface CryptoUser {
  user_id: string;
  public_key: string;
  recovery_phrase_hash?: string;
}

// Device fingerprinting for enhanced security
export interface DeviceFingerprint {
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  userAgent: string;
  hardwareConcurrency: number;
  maxTouchPoints: number;
  colorDepth: number;
  deviceMemory?: number;
}

// Key generation and storage with enhanced device fingerprinting
export class CryptoAuthManager {
  private static readonly STORAGE_KEY = 'whispr_crypto_keys';
  private static readonly USER_ID_KEY = 'whispr_user_id';
  private static readonly RECOVERY_PHRASE_KEY = 'whispr_recovery_phrase';
  private static readonly DEVICE_ID_KEY = 'whispr_device_id';
  private static readonly DEVICE_FINGERPRINT_KEY = 'whispr_device_fingerprint';

  // Generate a new Ed25519 key pair
  static async generateKeyPair(): Promise<CryptoKeyPair> {
    return await window.crypto.subtle.generateKey(
      {
        name: "Ed25519",
        namedCurve: "Ed25519",
      },
      true, // extractable
      ["sign", "verify"]
    );
  }

  // Store key pair securely in localStorage
  static async storeKeyPair(keyPair: CryptoKeyPair): Promise<void> {
    const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    
    const storedKeys: StoredKeyPair = {
      publicKeyJwk,
      privateKeyJwk
    };
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storedKeys));
  }

  // Retrieve stored key pair
  static async getStoredKeyPair(): Promise<CryptoKeyPair | null> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return null;

    try {
      const { publicKeyJwk, privateKeyJwk }: StoredKeyPair = JSON.parse(stored);
      
      const publicKey = await window.crypto.subtle.importKey(
        "jwk",
        publicKeyJwk,
        { name: "Ed25519", namedCurve: "Ed25519" },
        true,
        ["verify"]
      );
      
      const privateKey = await window.crypto.subtle.importKey(
        "jwk",
        privateKeyJwk,
        { name: "Ed25519", namedCurve: "Ed25519" },
        true,
        ["sign"]
      );
      
      return { publicKey, privateKey };
    } catch (error) {
      console.error('Failed to restore key pair:', error);
      return null;
    }
  }

  // Sign a challenge with the private key
  static async signChallenge(challenge: string, privateKey: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(challenge);
    
    const signature = await window.crypto.subtle.sign(
      "Ed25519",
      privateKey,
      data
    );
    
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  // Verify a signature with the public key
  static async verifySignature(
    challenge: string, 
    signature: string, 
    publicKey: CryptoKey
  ): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(challenge);
      const signatureBytes = new Uint8Array(
        atob(signature).split('').map(char => char.charCodeAt(0))
      );
      
      return await window.crypto.subtle.verify(
        "Ed25519",
        publicKey,
        signatureBytes,
        data
      );
    } catch (error) {
      console.error('Failed to verify signature:', error);
      return false;
    }
  }

  // Generate device fingerprint for enhanced security
  static generateDeviceFingerprint(): DeviceFingerprint {
    const fingerprint: DeviceFingerprint = {
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      userAgent: navigator.userAgent.substring(0, 100), // Limit length for storage
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      colorDepth: screen.colorDepth,
      deviceMemory: (navigator as any).deviceMemory || undefined
    };
    
    localStorage.setItem(this.DEVICE_FINGERPRINT_KEY, JSON.stringify(fingerprint));
    return fingerprint;
  }

  // Get stored device fingerprint
  static getDeviceFingerprint(): DeviceFingerprint | null {
    const stored = localStorage.getItem(this.DEVICE_FINGERPRINT_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  // Generate unique device ID based on fingerprint
  static async generateDeviceId(): Promise<string> {
    const fingerprint = this.generateDeviceFingerprint();
    const fingerprintString = JSON.stringify(fingerprint);
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprintString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const deviceId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
    
    localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
    return deviceId;
  }

  // Get stored device ID
  static getDeviceId(): string | null {
    return localStorage.getItem(this.DEVICE_ID_KEY);
  }

  // Generate and store user ID
  static generateUserId(): string {
    const userId = crypto.randomUUID();
    localStorage.setItem(this.USER_ID_KEY, userId);
    return userId;
  }

  // Get stored user ID
  static getUserId(): string | null {
    return localStorage.getItem(this.USER_ID_KEY);
  }

  // Store user ID
  static storeUserId(userId: string): void {
    localStorage.setItem(this.USER_ID_KEY, userId);
  }

  // Export public key to base64 string for storage
  static async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const jwk = await window.crypto.subtle.exportKey("jwk", publicKey);
    return btoa(JSON.stringify(jwk));
  }

  // Import public key from base64 string
  static async importPublicKey(publicKeyString: string): Promise<CryptoKey> {
    const jwk = JSON.parse(atob(publicKeyString));
    return await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "Ed25519", namedCurve: "Ed25519" },
      true,
      ["verify"]
    );
  }

  // Generate recovery phrase (12 words)
  static generateRecoveryPhrase(): string[] {
    const wordList = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
      'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
      'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
      'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'agent', 'agree',
      'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol',
      'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha',
      'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among', 'amount'
    ];
    
    const phrase: string[] = [];
    for (let i = 0; i < 12; i++) {
      const randomIndex = Math.floor(Math.random() * wordList.length);
      phrase.push(wordList[randomIndex]);
    }
    return phrase;
  }

  // Store recovery phrase hash
  static async storeRecoveryPhrase(phrase: string[]): Promise<void> {
    const phraseString = phrase.join(' ');
    const encoder = new TextEncoder();
    const data = encoder.encode(phraseString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    localStorage.setItem(this.RECOVERY_PHRASE_KEY, hashHex);
  }

  // Verify recovery phrase
  static async verifyRecoveryPhrase(phrase: string[]): Promise<boolean> {
    const storedHash = localStorage.getItem(this.RECOVERY_PHRASE_KEY);
    if (!storedHash) return false;
    
    const phraseString = phrase.join(' ');
    const encoder = new TextEncoder();
    const data = encoder.encode(phraseString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex === storedHash;
  }

  // Generate username from public key for identity visualization
  static async generateUsername(publicKey: CryptoKey): Promise<string> {
    const publicKeyString = await this.exportPublicKey(publicKey);
    const encoder = new TextEncoder();
    const data = encoder.encode(publicKeyString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Generate a readable username from the hash
    const adjectives = ['swift', 'bright', 'wise', 'bold', 'calm', 'quick', 'keen', 'noble'];
    const nouns = ['falcon', 'tiger', 'eagle', 'wolf', 'bear', 'fox', 'hawk', 'lion'];
    
    const adjIndex = parseInt(hash.substring(0, 2), 16) % adjectives.length;
    const nounIndex = parseInt(hash.substring(2, 4), 16) % nouns.length;
    const number = parseInt(hash.substring(4, 6), 16);
    
    return `${adjectives[adjIndex]}-${nouns[nounIndex]}-${number}`;
  }

  // Clear all stored data (logout)
  static clearStoredData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    localStorage.removeItem(this.RECOVERY_PHRASE_KEY);
    localStorage.removeItem(this.DEVICE_ID_KEY);
    localStorage.removeItem(this.DEVICE_FINGERPRINT_KEY);
  }

  // Check if user has existing keys
  static hasStoredKeys(): boolean {
    return !!localStorage.getItem(this.STORAGE_KEY);
  }

  // Register new user with crypto auth including device fingerprinting
  static async registerUser(publicKey: CryptoKey, recoveryPhrase?: string[]): Promise<{ success: boolean; error?: string; username?: string }> {
    try {
      const userId = this.generateUserId();
      const deviceId = await this.generateDeviceId();
      const publicKeyString = await this.exportPublicKey(publicKey);
      const username = await this.generateUsername(publicKey);
      const fingerprint = this.generateDeviceFingerprint();
      
      let recoveryPhraseHash = null;
      if (recoveryPhrase) {
        await this.storeRecoveryPhrase(recoveryPhrase);
        const phraseString = recoveryPhrase.join(' ');
        const encoder = new TextEncoder();
        const data = encoder.encode(phraseString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        recoveryPhraseHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }

      const { data, error } = await supabase.functions.invoke('crypto-register', {
        body: {
          user_id: userId,
          device_id: deviceId,
          public_key: publicKeyString,
          recovery_phrase_hash: recoveryPhraseHash,
          device_fingerprint: fingerprint,
          username: username
        }
      });

      if (error) {
        console.error('Registration error:', error);
        return { success: false, error: error.message };
      }

      this.storeUserId(userId);
      return { success: true, username };
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  // Request authentication challenge
  static async requestChallenge(userId: string): Promise<Challenge | null> {
    try {
      const { data, error } = await supabase.functions.invoke('crypto-challenge', {
        body: { user_id: userId }
      });

      if (error) {
        console.error('Challenge request error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Challenge request failed:', error);
      return null;
    }
  }

  // Verify challenge and get auth token
  static async verifyChallenge(
    challengeId: string, 
    signature: string
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('crypto-verify', {
        body: {
          challenge_id: challengeId,
          signature: signature
        }
      });

      if (error) {
        console.error('Verification error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, token: data.token };
    } catch (error) {
      console.error('Verification failed:', error);
      return { success: false, error: 'Verification failed' };
    }
  }
}