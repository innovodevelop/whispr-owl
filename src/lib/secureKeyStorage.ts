// Secure client-side key storage with non-extractable keys
// This replaces database private key storage for enhanced security

interface SecureKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

interface StoredKeyMetadata {
  keyId: string;
  publicKeyJWK: JsonWebKey;
  wrappedPrivateKey: ArrayBuffer;
  iv: ArrayBuffer;
  salt: ArrayBuffer;
  createdAt: string;
}

class SecureKeyManager {
  private dbName = 'SecureSignalKeys';
  private dbVersion = 1;
  private keyStoreName = 'keys';
  private masterKeyName = 'master_key';

  // Generate a Local Key Encryption Key (LKEK) from user passphrase
  private async deriveLKEK(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000, // Strong iteration count
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false, // Non-extractable
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
  }

  // Generate secure, non-extractable key pairs
  async generateIdentityKeyPair(): Promise<SecureKeyPair> {
    return await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'X25519'
      },
      false, // Private key is non-extractable!
      ['deriveKey', 'deriveBits']
    );
  }

  async generateSigningKeyPair(): Promise<SecureKeyPair> {
    return await crypto.subtle.generateKey(
      {
        name: 'Ed25519',
      },
      false, // Private key is non-extractable!
      ['sign', 'verify']
    );
  }

  // Store wrapped private key in IndexedDB (never localStorage!)
  async storePrivateKey(
    keyId: string, 
    keyPair: SecureKeyPair, 
    passphrase: string
  ): Promise<void> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const lkek = await this.deriveLKEK(passphrase, salt);
    
    // Wrap the private key with the LKEK
    const wrappedPrivateKey = await crypto.subtle.wrapKey(
      'pkcs8',
      keyPair.privateKey,
      lkek,
      {
        name: 'AES-GCM',
        iv: iv
      }
    );

    // Export public key for storage
    const publicKeyJWK = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

    const metadata: StoredKeyMetadata = {
      keyId,
      publicKeyJWK,
      wrappedPrivateKey,
      iv,
      salt,
      createdAt: new Date().toISOString()
    };

    const db = await this.openDB();
    const transaction = db.transaction([this.keyStoreName], 'readwrite');
    await transaction.objectStore(this.keyStoreName).put(metadata, keyId);
  }

  // Retrieve and unwrap private key from IndexedDB
  async retrievePrivateKey(keyId: string, passphrase: string): Promise<SecureKeyPair | null> {
    const db = await this.openDB();
    const transaction = db.transaction([this.keyStoreName], 'readonly');
    const request = transaction.objectStore(this.keyStoreName).get(keyId);
    
    const metadata = await new Promise<StoredKeyMetadata | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    if (!metadata) return null;

    try {
      const lkek = await this.deriveLKEK(passphrase, metadata.salt);
      
      // Import public key
      const publicKey = await crypto.subtle.importKey(
        'jwk',
        metadata.publicKeyJWK,
        metadata.publicKeyJWK.crv === 'X25519' ? 
          { name: 'ECDH', namedCurve: 'X25519' } : 
          { name: 'Ed25519' },
        true,
        metadata.publicKeyJWK.crv === 'X25519' ? 
          ['deriveKey', 'deriveBits'] : 
          ['verify']
      );

      // Unwrap private key (remains non-extractable)
      const privateKey = await crypto.subtle.unwrapKey(
        'pkcs8',
        metadata.wrappedPrivateKey,
        lkek,
        {
          name: 'AES-GCM',
          iv: metadata.iv
        },
        metadata.publicKeyJWK.crv === 'X25519' ? 
          { name: 'ECDH', namedCurve: 'X25519' } : 
          { name: 'Ed25519' },
        false, // Keep non-extractable!
        metadata.publicKeyJWK.crv === 'X25519' ? 
          ['deriveKey', 'deriveBits'] : 
          ['sign']
      );

      return { publicKey, privateKey };
    } catch (error) {
      console.error('Failed to unwrap private key:', error);
      return null;
    }
  }

  // Delete keys from storage
  async deleteKey(keyId: string): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.keyStoreName], 'readwrite');
    await transaction.objectStore(this.keyStoreName).delete(keyId);
  }

  // List stored key IDs
  async listStoredKeys(): Promise<string[]> {
    const db = await this.openDB();
    const transaction = db.transaction([this.keyStoreName], 'readonly');
    const request = transaction.objectStore(this.keyStoreName).getAllKeys();
    
    return new Promise<string[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all keys (logout/reset)
  async clearAllKeys(): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.keyStoreName], 'readwrite');
    await transaction.objectStore(this.keyStoreName).clear();
  }

  // Open IndexedDB
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.keyStoreName)) {
          db.createObjectStore(this.keyStoreName);
        }
      };
    });
  }

  // Validate no keys are in localStorage or sessionStorage (security check)
  validateNoKeysInWebStorage(): boolean {
    const sensitivePatterns = [
      /private.*key/i,
      /identity.*key/i,
      /prekey/i,
      /signal.*key/i,
      /crypto.*key/i
    ];

    // Check localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = key ? localStorage.getItem(key) : null;
      
      if (key && sensitivePatterns.some(pattern => pattern.test(key))) {
        console.error('SECURITY VIOLATION: Private key found in localStorage:', key);
        return false;
      }
      
      if (value && sensitivePatterns.some(pattern => pattern.test(value))) {
        console.error('SECURITY VIOLATION: Private key data found in localStorage value');
        return false;
      }
    }

    // Check sessionStorage  
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const value = key ? sessionStorage.getItem(key) : null;
      
      if (key && sensitivePatterns.some(pattern => pattern.test(key))) {
        console.error('SECURITY VIOLATION: Private key found in sessionStorage:', key);
        return false;
      }
      
      if (value && sensitivePatterns.some(pattern => pattern.test(value))) {
        console.error('SECURITY VIOLATION: Private key data found in sessionStorage value');
        return false;
      }
    }

    return true;
  }
}

export const secureKeyManager = new SecureKeyManager();

// Runtime security check - runs on module load
if (typeof window !== 'undefined') {
  const isSecure = secureKeyManager.validateNoKeysInWebStorage();
  if (!isSecure) {
    // Do not crash the app; warn and allow migration/cleanup flows to run
    console.warn('CRITICAL SECURITY VIOLATION: Private keys detected in web storage! Allowing app to continue for cleanup.');
    try {
      window.localStorage.setItem('whispr_security_violation_detected', 'true');
      window.dispatchEvent(new CustomEvent('whispr-security-violation', { detail: { source: 'secureKeyStorage' } }));
    } catch (e) {
      // ignore
    }
  }
}