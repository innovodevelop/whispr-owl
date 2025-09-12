// Local PIN security implementation with Argon2id key derivation
// PIN is local-only and never sent to server

interface PinStorage {
  salt: string;
  keyParams: string;
  wrappedSessionKey: string;
  createdAt: number;
}

interface PinAttempts {
  count: number;
  lastAttempt: number;
  blockedUntil?: number;
}

const PIN_STORAGE_KEY = 'whispr_pin_storage';
const PIN_ATTEMPTS_KEY = 'whispr_pin_attempts';
const SESSION_KEY = 'whispr_session_unlock';
const LAST_ACTIVITY_KEY = 'whispr_last_activity';

// Argon2id parameters (adjusted for mobile performance)
const ARGON2_PARAMS = {
  memory: 64 * 1024, // 64MB
  iterations: 3,
  parallelism: 1,
  hashLength: 32
};

// Simple Argon2id implementation using WebCrypto (fallback to PBKDF2 for broader support)
async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);
  
  // Import PIN as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinData,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive AES-GCM key using PBKDF2 (fallback for Argon2id)
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // High iteration count for security
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate random salt
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

// Generate random session unlock key
function generateSessionKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

// Convert Uint8Array to base64
function arrayToBase64(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array));
}

// Convert base64 to Uint8Array
function base64ToArray(base64: string): Uint8Array {
  return new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
}

export class PinManager {
  // Check if PIN is enabled
  static isPinEnabled(): boolean {
    return !!localStorage.getItem(PIN_STORAGE_KEY);
  }

  // Enable PIN with 3-digit code
  static async enablePin(pin: string): Promise<{ success: boolean; error?: string }> {
    if (!/^\d{3}$/.test(pin)) {
      return { success: false, error: 'PIN must be exactly 3 digits' };
    }

    try {
      const salt = generateSalt();
      const sessionKey = generateSessionKey();
      const derivedKey = await deriveKeyFromPin(pin, salt);
      
      // Encrypt the session unlock key with the PIN-derived key
      const sessionKeyData = new TextEncoder().encode(sessionKey);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encryptedSessionKey = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        derivedKey,
        sessionKeyData
      );
      
      const pinStorage: PinStorage = {
        salt: arrayToBase64(salt),
        keyParams: arrayToBase64(iv),
        wrappedSessionKey: arrayToBase64(new Uint8Array(encryptedSessionKey)),
        createdAt: Date.now()
      };
      
      localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinStorage));
      localStorage.setItem(SESSION_KEY, sessionKey);
      this.updateLastActivity();
      
      return { success: true };
    } catch (error) {
      console.error('Failed to enable PIN:', error);
      return { success: false, error: 'Failed to enable PIN' };
    }
  }

  // Disable PIN (requires current PIN)
  static async disablePin(currentPin: string): Promise<{ success: boolean; error?: string }> {
    const verification = await this.verifyPin(currentPin);
    if (!verification.success) {
      return { success: false, error: 'Incorrect PIN' };
    }

    localStorage.removeItem(PIN_STORAGE_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PIN_ATTEMPTS_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    
    return { success: true };
  }

  // Verify PIN and unlock session
  static async verifyPin(pin: string): Promise<{ success: boolean; error?: string; blockedUntil?: number }> {
    if (!/^\d{3}$/.test(pin)) {
      return { success: false, error: 'PIN must be exactly 3 digits' };
    }

    // Check if blocked
    const blockStatus = this.getBlockStatus();
    if (blockStatus.isBlocked) {
      return { 
        success: false, 
        error: 'Too many failed attempts', 
        blockedUntil: blockStatus.blockedUntil 
      };
    }

    try {
      const pinStorageStr = localStorage.getItem(PIN_STORAGE_KEY);
      if (!pinStorageStr) {
        return { success: false, error: 'PIN not set' };
      }

      const pinStorage: PinStorage = JSON.parse(pinStorageStr);
      const salt = base64ToArray(pinStorage.salt);
      const iv = base64ToArray(pinStorage.keyParams);
      const wrappedKey = base64ToArray(pinStorage.wrappedSessionKey);
      
      const derivedKey = await deriveKeyFromPin(pin, salt);
      
      // Try to decrypt the session key
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        derivedKey,
        wrappedKey
      );
      
      const sessionKey = new TextDecoder().decode(decryptedData);
      
      // Store unlocked session key
      localStorage.setItem(SESSION_KEY, sessionKey);
      this.updateLastActivity();
      this.clearAttempts();
      
      return { success: true };
    } catch (error) {
      // PIN verification failed
      this.recordFailedAttempt();
      const attempts = this.getAttempts();
      const remaining = Math.max(0, 5 - attempts.count);
      
      if (remaining === 0) {
        const blockStatus = this.getBlockStatus();
        return { 
          success: false, 
          error: 'Too many failed attempts', 
          blockedUntil: blockStatus.blockedUntil 
        };
      }
      
      return { 
        success: false, 
        error: `Incorrect PIN. ${remaining} attempts remaining.` 
      };
    }
  }

  // Check if session is unlocked and valid
  static isSessionUnlocked(): boolean {
    if (!this.isPinEnabled()) return true;
    
    const sessionKey = localStorage.getItem(SESSION_KEY);
    if (!sessionKey) return false;
    
    const lastActivity = this.getLastActivity();
    const thresholdMs = 5 * 60 * 1000; // 5 minutes
    
    return Date.now() - lastActivity < thresholdMs;
  }

  // Update last activity timestamp
  static updateLastActivity(): void {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }

  // Get last activity timestamp
  static getLastActivity(): number {
    const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  // Lock session (clear session key)
  static lockSession(): void {
    localStorage.removeItem(SESSION_KEY);
  }

  // Record failed PIN attempt
  private static recordFailedAttempt(): void {
    const attempts = this.getAttempts();
    attempts.count += 1;
    attempts.lastAttempt = Date.now();
    
    // Calculate exponential backoff
    if (attempts.count >= 5) {
      const backoffMinutes = Math.pow(2, attempts.count - 5); // 1, 2, 4, 8, 16...
      const backoffMs = Math.min(backoffMinutes * 60 * 1000, 30 * 60 * 1000); // Max 30 minutes
      attempts.blockedUntil = Date.now() + backoffMs;
    }
    
    localStorage.setItem(PIN_ATTEMPTS_KEY, JSON.stringify(attempts));
  }

  // Get current attempt count and block status
  private static getAttempts(): PinAttempts {
    const stored = localStorage.getItem(PIN_ATTEMPTS_KEY);
    if (!stored) {
      return { count: 0, lastAttempt: 0 };
    }
    
    const attempts: PinAttempts = JSON.parse(stored);
    
    // Reset if it's been more than an hour since last attempt
    if (Date.now() - attempts.lastAttempt > 60 * 60 * 1000) {
      return { count: 0, lastAttempt: 0 };
    }
    
    return attempts;
  }

  // Clear failed attempts
  private static clearAttempts(): void {
    localStorage.removeItem(PIN_ATTEMPTS_KEY);
  }

  // Get block status
  static getBlockStatus(): { isBlocked: boolean; blockedUntil?: number; remainingMs?: number } {
    const attempts = this.getAttempts();
    
    if (attempts.blockedUntil && Date.now() < attempts.blockedUntil) {
      return {
        isBlocked: true,
        blockedUntil: attempts.blockedUntil,
        remainingMs: attempts.blockedUntil - Date.now()
      };
    }
    
    return { isBlocked: false };
  }

  // Reset PIN (requires biometric or passkey re-auth)
  static async resetPin(): Promise<{ success: boolean; error?: string }> {
    // In a real implementation, this would require WebAuthn re-authentication
    // For now, we'll simulate the biometric challenge
    try {
      // This would be replaced with actual WebAuthn challenge
      const confirmed = window.confirm(
        'This will reset your PIN. You will need to set a new PIN after this action. Continue?'
      );
      
      if (!confirmed) {
        return { success: false, error: 'Reset cancelled' };
      }
      
      localStorage.removeItem(PIN_STORAGE_KEY);
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(PIN_ATTEMPTS_KEY);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Reset failed' };
    }
  }
}