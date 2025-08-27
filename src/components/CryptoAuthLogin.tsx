import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CryptoAuthManager, Challenge } from '@/lib/cryptoAuth';
import { Shield, Key, Loader2 } from 'lucide-react';

interface CryptoAuthLoginProps {
  onSuccess: (userId: string, token: string) => void;
  onNeedRegistration: () => void;
}

export const CryptoAuthLogin: React.FC<CryptoAuthLoginProps> = ({ 
  onSuccess, 
  onNeedRegistration 
}) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'check' | 'challenge' | 'verify'>('check');
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  useEffect(() => {
    checkExistingKeys();
  }, []);

  const checkExistingKeys = async () => {
    const hasKeys = CryptoAuthManager.hasStoredKeys();
    const userId = CryptoAuthManager.getUserId();

    if (!hasKeys || !userId) {
      onNeedRegistration();
      return;
    }

    setStep('challenge');
    await requestChallenge(userId);
  };

  const requestChallenge = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const challengeData = await CryptoAuthManager.requestChallenge(userId);
      
      if (!challengeData) {
        setError('Failed to get authentication challenge');
        return;
      }

      setChallenge(challengeData);
      setStep('verify');
      
      // Auto-proceed to verification
      await handleVerifyChallenge(challengeData);

    } catch (error) {
      console.error('Challenge request error:', error);
      setError('Failed to request challenge');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyChallenge = async (challengeData: Challenge) => {
    try {
      setLoading(true);
      setError(null);

      // Get stored key pair
      const keyPair = await CryptoAuthManager.getStoredKeyPair();
      if (!keyPair) {
        setError('No cryptographic keys found');
        onNeedRegistration();
        return;
      }

      // Sign the challenge
      const signature = await CryptoAuthManager.signChallenge(
        challengeData.challenge_string,
        keyPair.privateKey
      );

      // Verify with backend
      const result = await CryptoAuthManager.verifyChallenge(
        challengeData.challenge_id,
        signature
      );

      if (!result.success) {
        setError(result.error || 'Authentication failed');
        return;
      }

      // Success!
      const userId = CryptoAuthManager.getUserId();
      if (userId && result.token) {
        onSuccess(userId, result.token);
      }

    } catch (error) {
      console.error('Challenge verification error:', error);
      setError('Failed to verify challenge');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    const userId = CryptoAuthManager.getUserId();
    if (userId) {
      setError(null);
      setStep('challenge');
      requestChallenge(userId);
    }
  };

  if (step === 'check') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <CardTitle>Checking Credentials</CardTitle>
          <CardDescription>
            Looking for existing cryptographic keys...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          {loading ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          ) : (
            <Key className="w-6 h-6 text-primary" />
          )}
        </div>
        <CardTitle>
          {step === 'challenge' ? 'Requesting Challenge' : 'Authenticating'}
        </CardTitle>
        <CardDescription>
          {step === 'challenge' 
            ? 'Getting authentication challenge from server...'
            : 'Signing challenge with your private key...'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'verify' && challenge && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Challenge received:</p>
              <code className="block mt-2 p-2 bg-muted rounded text-xs break-all">
                {challenge.challenge_string.substring(0, 40)}...
              </code>
            </div>
            
            {loading && (
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing and verifying...</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <Button onClick={handleRetry} variant="outline" className="w-full">
            Try Again
          </Button>
        )}

        <Button 
          onClick={onNeedRegistration} 
          variant="ghost" 
          className="w-full"
        >
          Create New Identity
        </Button>
      </CardContent>
    </Card>
  );
};