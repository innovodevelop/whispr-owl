import { useState, useEffect, createContext, useContext } from 'react';
import { CryptoAuthManager } from '@/lib/cryptoAuth';
import { isDryRun } from '@/config/featureFlags';
import { mockRegisterUser, mockRequestChallenge, mockVerifyChallenge } from '@/lib/dryRunStubs';
import { supabase } from '@/integrations/supabase/client';

interface CryptoAuthUser {
  userId: string;
  username?: string;
}

interface CryptoAuthContextType {
  isAuthenticated: boolean;
  user: CryptoAuthUser | null;
  loading: boolean;
  register: (generateRecovery?: boolean) => Promise<{ success: boolean; error?: string; recoveryPhrase?: string[] }>;
  login: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasStoredKeys: () => boolean;
}

const CryptoAuthContext = createContext<CryptoAuthContextType | undefined>(undefined);

export const CryptoAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<CryptoAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const storedUserId = CryptoAuthManager.getUserId();
    const hasKeys = CryptoAuthManager.hasStoredKeys();
    const username = localStorage.getItem('whispr_username');
    
    if (storedUserId && hasKeys) {
      setUser({ 
        userId: storedUserId, 
        username: username || undefined 
      });
      setIsAuthenticated(true);
    }
    
    setLoading(false);
  };

  const register = async (generateRecovery: boolean = false): Promise<{ success: boolean; error?: string; recoveryPhrase?: string[] }> => {
    setLoading(true);
    try {
      const keyPair = await CryptoAuthManager.generateKeyPair();
      await CryptoAuthManager.storeKeyPair(keyPair);
      
      let recoveryPhrase: string[] | undefined;
      if (generateRecovery) {
        recoveryPhrase = CryptoAuthManager.generateRecoveryPhrase();
      }
      
      const result = isDryRun() 
        ? await mockRegisterUser(keyPair.publicKey, recoveryPhrase)
        : await CryptoAuthManager.registerUser(keyPair.publicKey, recoveryPhrase);
      
      if (result.success) {
        const userId = CryptoAuthManager.getUserId();
        if (userId) {
          setUser({ 
            userId, 
            username: result.username 
          });
          // Note: Don't set isAuthenticated true here - let the flow complete first
        }
        return { success: true, recoveryPhrase };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const login = async (): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const storedUserId = CryptoAuthManager.getUserId();
      if (!storedUserId) {
        return { success: false, error: 'No stored user ID' };
      }

      const challenge = isDryRun() 
        ? await mockRequestChallenge(storedUserId)
        : await CryptoAuthManager.requestChallenge(storedUserId);
        
      if (!challenge) {
        return { success: false, error: 'Failed to get challenge' };
      }

      const keyPair = await CryptoAuthManager.getStoredKeyPair();
      if (!keyPair) {
        return { success: false, error: 'No stored key pair' };
      }

      const signature = await CryptoAuthManager.signChallenge(
        challenge.challenge_string,
        keyPair.privateKey
      );

      const result = isDryRun()
        ? await mockVerifyChallenge(challenge.challenge_id, signature)
        : await CryptoAuthManager.verifyChallenge(challenge.challenge_id, signature);

      if (result.success) {
        const username = localStorage.getItem('whispr_username');
        setUser({ 
          userId: storedUserId, 
          username: username || undefined 
        });
        setIsAuthenticated(true);
        
        // Establish Supabase session for crypto-authenticated user
        if (result.token) {
          try {
            await supabase.auth.setSession({
              access_token: result.token,
              refresh_token: result.token
            });
          } catch (error) {
            console.error('Failed to set Supabase session:', error);
          }
        }
        
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    CryptoAuthManager.clearStoredData();
    localStorage.removeItem('whispr_username');
    setIsAuthenticated(false);
    setUser(null);
    
    // Also sign out from Supabase
    await supabase.auth.signOut();
  };

  const hasStoredKeys = (): boolean => {
    return CryptoAuthManager.hasStoredKeys();
  };

  return (
    <CryptoAuthContext.Provider value={{
      isAuthenticated,
      user,
      loading,
      register,
      login,
      logout,
      hasStoredKeys
    }}>
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