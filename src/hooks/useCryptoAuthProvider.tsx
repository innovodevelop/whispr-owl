import React, { useState, useEffect, createContext, useContext } from 'react';
import { CryptoAuthManager } from '@/lib/cryptoAuth';

interface CryptoAuthUser {
  id: string;
  username?: string;
  deviceId: string;
  publicKey: string;
}

interface CryptoAuthContextType {
  user: CryptoAuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<{ success: boolean; error?: string }>;
  register: (generateRecovery?: boolean) => Promise<{ success: boolean; error?: string; recoveryPhrase?: string[] }>;
  logout: () => void;
  hasStoredKeys: () => boolean;
}

const CryptoAuthContext = createContext<CryptoAuthContextType | undefined>(undefined);

export const CryptoAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<CryptoAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const userId = CryptoAuthManager.getUserId();
      const deviceId = CryptoAuthManager.getDeviceId();
      const hasKeys = CryptoAuthManager.hasStoredKeys();
      
      if (userId && deviceId && hasKeys) {
        const keyPair = await CryptoAuthManager.getStoredKeyPair();
        if (keyPair) {
          const publicKeyString = await CryptoAuthManager.exportPublicKey(keyPair.publicKey);
          const username = await CryptoAuthManager.generateUsername(keyPair.publicKey);
          
          setUser({
            id: userId,
            username,
            deviceId,
            publicKey: publicKeyString
          });
        }
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const userId = CryptoAuthManager.getUserId();
      if (!userId) {
        return { success: false, error: 'No user ID found. Please register first.' };
      }

      const keyPair = await CryptoAuthManager.getStoredKeyPair();
      if (!keyPair) {
        return { success: false, error: 'No keys found. Please register first.' };
      }

      // Request challenge
      const challenge = await CryptoAuthManager.requestChallenge(userId);
      if (!challenge) {
        return { success: false, error: 'Failed to get authentication challenge.' };
      }

      // Sign challenge
      const signature = await CryptoAuthManager.signChallenge(
        challenge.challenge_string,
        keyPair.privateKey
      );

      // Verify challenge
      const result = await CryptoAuthManager.verifyChallenge(
        challenge.challenge_id,
        signature
      );

      if (result.success) {
        const deviceId = CryptoAuthManager.getDeviceId()!;
        const publicKeyString = await CryptoAuthManager.exportPublicKey(keyPair.publicKey);
        const username = await CryptoAuthManager.generateUsername(keyPair.publicKey);
        
        setUser({
          id: userId,
          username,
          deviceId,
          publicKey: publicKeyString
        });
        
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Authentication failed.' };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Login failed due to unexpected error.' };
    }
  };

  const register = async (generateRecovery = true): Promise<{ success: boolean; error?: string; recoveryPhrase?: string[] }> => {
    try {
      // Generate new key pair
      const keyPair = await CryptoAuthManager.generateKeyPair();
      await CryptoAuthManager.storeKeyPair(keyPair);

      // Generate recovery phrase if requested
      let recoveryPhrase: string[] | undefined;
      if (generateRecovery) {
        recoveryPhrase = CryptoAuthManager.generateRecoveryPhrase();
      }

      // Register with server
      const result = await CryptoAuthManager.registerUser(keyPair.publicKey, recoveryPhrase);
      
      if (result.success) {
        const userId = CryptoAuthManager.getUserId()!;
        const deviceId = CryptoAuthManager.getDeviceId()!;
        const publicKeyString = await CryptoAuthManager.exportPublicKey(keyPair.publicKey);
        
        setUser({
          id: userId,
          username: result.username,
          deviceId,
          publicKey: publicKeyString
        });
        
        return { success: true, recoveryPhrase };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: 'Registration failed due to unexpected error.' };
    }
  };

  const logout = () => {
    CryptoAuthManager.clearStoredData();
    setUser(null);
  };

  const hasStoredKeys = (): boolean => {
    return CryptoAuthManager.hasStoredKeys();
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    hasStoredKeys
  };

  return (
    <CryptoAuthContext.Provider value={value}>
      {children}
    </CryptoAuthContext.Provider>
  );
};

export const useCryptoAuth = () => {
  const context = useContext(CryptoAuthContext);
  if (!context) {
    throw new Error('useCryptoAuth must be used within CryptoAuthProvider');
  }
  return context;
};