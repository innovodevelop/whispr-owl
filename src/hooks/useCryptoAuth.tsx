import { useState, useEffect, createContext, useContext } from 'react';
import { CryptoAuthManager } from '@/lib/cryptoAuth';

interface CryptoAuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  token: string | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const CryptoAuthContext = createContext<CryptoAuthContextType | undefined>(undefined);

export const CryptoAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const storedUserId = CryptoAuthManager.getUserId();
    const hasKeys = CryptoAuthManager.hasStoredKeys();
    
    if (storedUserId && hasKeys) {
      setUserId(storedUserId);
      setIsAuthenticated(true);
    }
    
    setLoading(false);
  };

  const login = async () => {
    const storedUserId = CryptoAuthManager.getUserId();
    if (storedUserId) {
      const challenge = await CryptoAuthManager.requestChallenge(storedUserId);
      if (challenge) {
        const keyPair = await CryptoAuthManager.getStoredKeyPair();
        if (keyPair) {
          const signature = await CryptoAuthManager.signChallenge(
            challenge.challenge_string,
            keyPair.privateKey
          );
          const result = await CryptoAuthManager.verifyChallenge(
            challenge.challenge_id,
            signature
          );
          if (result.success) {
            setIsAuthenticated(true);
            setUserId(storedUserId);
            setToken(result.token || null);
          }
        }
      }
    }
  };

  const logout = () => {
    CryptoAuthManager.clearStoredData();
    setIsAuthenticated(false);
    setUserId(null);
    setToken(null);
  };

  return (
    <CryptoAuthContext.Provider value={{
      isAuthenticated,
      userId,
      token,
      loading,
      login,
      logout
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