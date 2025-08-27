import React, { useState } from 'react';
import { CryptoAuthRegister } from '@/components/CryptoAuthRegister';
import { CryptoAuthLogin } from '@/components/CryptoAuthLogin';
import { DeviceLinkQR } from '@/components/DeviceLinkQR';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Smartphone, Key } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'link-device';

export const CryptoAuth: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [authenticated, setAuthenticated] = useState(false);

  const handleAuthSuccess = (userId: string, token?: string) => {
    console.log('Auth success:', { userId, token });
    setAuthenticated(true);
    // Here you would typically redirect to the main app
  };

  const handleLinkSuccess = () => {
    console.log('Device linked successfully');
    setMode('login');
  };

  if (authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Welcome to Whispr-Owl</CardTitle>
            <CardDescription>
              You are now authenticated with cryptographic security
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md mx-auto space-y-4">
        {mode === 'login' && (
          <>
            <CryptoAuthLogin
              onSuccess={handleAuthSuccess}
              onNeedRegistration={() => setMode('register')}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setMode('register')}
                className="flex-1"
              >
                <Key className="w-4 h-4 mr-2" />
                New Identity
              </Button>
              <Button
                variant="outline"
                onClick={() => setMode('link-device')}
                className="flex-1"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Link Device
              </Button>
            </div>
          </>
        )}

        {mode === 'register' && (
          <>
            <CryptoAuthRegister onSuccess={handleAuthSuccess} />
            <Button
              variant="ghost"
              onClick={() => setMode('login')}
              className="w-full"
            >
              Back to Login
            </Button>
          </>
        )}

        {mode === 'link-device' && (
          <>
            <DeviceLinkQR onSuccess={handleLinkSuccess} />
            <Button
              variant="ghost"
              onClick={() => setMode('login')}
              className="w-full"
            >
              Back to Login
            </Button>
          </>
        )}
      </div>
    </div>
  );
};