import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Smartphone, Key, Copy, Download, CheckCircle } from 'lucide-react';
import { DeviceLinkQR } from '@/components/DeviceLinkQR';
import { DeviceReview } from '@/components/DeviceReview';
import { UsernameSetup } from '@/components/UsernameSetup';
import { DevTools } from '@/components/DevTools';
import { useCryptoAuth } from '@/hooks/useCryptoAuth';
import { isDryRun, shouldShowDevTools } from '@/config/featureFlags';
import { toast } from 'sonner';

type FlowMode = 'welcome' | 'register' | 'login' | 'link-device' | 'recovery' | 'device-review' | 'username-setup' | 'success';

export const CryptoAuthFlow: React.FC = () => {
  const [mode, setMode] = useState<FlowMode>('welcome');
  const [recoveryPhrase, setRecoveryPhrase] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);

  const { register, login, hasStoredKeys, user } = useCryptoAuth();
  const dryRun = isDryRun();
  const canShowDevTools = shouldShowDevTools();

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    
    const result = await register(true);
    
    if (result.success && result.recoveryPhrase) {
      setRecoveryPhrase(result.recoveryPhrase);
      setMode('recovery');
    } else {
      setError(result.error || 'Registration failed');
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    
    const result = await login();
    
    if (result.success) {
      // Login success - auth provider will handle state update
      window.location.reload();
    } else {
      setError(result.error || 'Login failed');
    }
    setLoading(false);
  };

  const copyRecoveryPhrase = async () => {
    const phraseText = recoveryPhrase.join(' ');
    await navigator.clipboard.writeText(phraseText);
    setCopied(true);
    toast.success('Recovery phrase copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadRecoveryPhrase = () => {
    const phraseText = recoveryPhrase.join(' ');
    const blob = new Blob([phraseText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whispr-recovery-phrase.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Recovery phrase downloaded');
  };

  const handleRecoveryConfirmed = () => {
    setMode('device-review');
  };

  const handleDeviceConfirmed = () => {
    // Check if user already has a username
    const existingUsername = localStorage.getItem('whispr_username');
    if (existingUsername) {
      setMode('success');
    } else {
      setMode('username-setup');
    }
  };

  const handleDeviceRejected = () => {
    setMode('welcome');
    setError('');
    setRecoveryPhrase([]);
  };

  const handleUsernameComplete = (username: string) => {
    // Mark as authenticated after username is set
    window.location.reload(); // This will trigger auth check and redirect to main app
  };

  // Welcome screen - entry point
  if (mode === 'welcome') {
    const hasKeys = hasStoredKeys();
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Dry Run Badge */}
          {dryRun && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">DRY RUN</span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                No real data will be saved to the server
              </p>
            </div>
          )}

          {/* Dev Tools Button */}
          {canShowDevTools && (
            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDevTools(true)}
                className="text-xs"
              >
                Dev Tools
              </Button>
            </div>
          )}

          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome to Whispr-Owl</CardTitle>
              <CardDescription>
                Secure, device-based authentication with end-to-end encryption
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasKeys ? (
                <>
                  <p className="text-center text-sm text-muted-foreground mb-4">
                    You have an existing identity on this device
                  </p>
                  <Button onClick={handleLogin} className="w-full" disabled={loading}>
                    <Shield className="w-4 h-4 mr-2" />
                    {loading ? 'Authenticating...' : 'Login with Device Keys'}
                  </Button>
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
              ) : (
                <>
                  <p className="text-center text-sm text-muted-foreground mb-4">
                    Create a new cryptographic identity or link an existing device
                  </p>
                  <Button onClick={() => setMode('register')} className="w-full">
                    <Key className="w-4 h-4 mr-2" />
                    Create New Identity
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setMode('link-device')}
                    className="w-full"
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    Link Existing Device
                  </Button>
                </>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          
          {/* Dev Tools Modal */}
          {showDevTools && <DevTools onClose={() => setShowDevTools(false)} />}
        </div>
      </div>
    );
  }

  // Registration confirmation
  if (mode === 'register') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md mx-auto space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Key className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Create New Identity</CardTitle>
              <CardDescription>
                This will generate a unique cryptographic identity for this device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>• Your identity will be tied to this device</p>
                <p>• A recovery phrase will be generated</p>
                <p>• No personal information is required</p>
                <p>• Your identity is based on cryptographic keys</p>
              </div>
              
              <Button onClick={handleRegister} className="w-full" disabled={loading}>
                {loading ? 'Creating Identity...' : 'Create Identity'}
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => setMode('welcome')}
                className="w-full"
              >
                Back
              </Button>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Recovery phrase display
  if (mode === 'recovery') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md mx-auto space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle>Save Your Recovery Phrase</CardTitle>
              <CardDescription>
                This is your only way to recover your identity if you lose access to this device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Store this recovery phrase in a safe place. Anyone with access to it can restore your identity.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-3 gap-2 p-4 bg-muted rounded-lg">
                {recoveryPhrase.map((word, index) => (
                  <div key={index} className="text-center">
                    <span className="text-xs text-muted-foreground">{index + 1}.</span>
                    <div className="font-mono text-sm">{word}</div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={copyRecoveryPhrase}
                  className="flex-1"
                  disabled={copied}
                >
                  {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  variant="outline"
                  onClick={downloadRecoveryPhrase}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="recovery-confirmed"
                  checked={recoveryConfirmed}
                  onChange={(e) => setRecoveryConfirmed(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="recovery-confirmed" className="text-sm">
                  I have safely stored my recovery phrase
                </label>
              </div>
              
              <Button
                onClick={handleRecoveryConfirmed}
                className="w-full"
                disabled={!recoveryConfirmed}
              >
                Continue to Device Review
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Device review screen
  if (mode === 'device-review') {
    return (
      <DeviceReview
        onConfirm={handleDeviceConfirmed}
        onReject={handleDeviceRejected}
      />
    );
  }

  // Username setup screen
  if (mode === 'username-setup') {
    return (
      <UsernameSetup onComplete={handleUsernameComplete} />
    );
  }

  // Device linking
  if (mode === 'link-device') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md mx-auto space-y-6">
          <DeviceLinkQR onSuccess={() => setMode('success')} />
          <Button
            variant="ghost"
            onClick={() => setMode('welcome')}
            className="w-full"
          >
            Back to Welcome
          </Button>
        </div>
      </div>
    );
  }

  // Success screen
  if (mode === 'success') {
    const username = localStorage.getItem('whispr_username');
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>
              {username ? `You're in, @${username}` : 'Welcome to Whispr'}
            </CardTitle>
            <CardDescription>
              {dryRun 
                ? 'Simulation complete - no real data was saved'
                : 'You are now authenticated with cryptographic security'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground">
              Redirecting to the main application...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};