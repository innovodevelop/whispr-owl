import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { CryptoAuthManager } from '@/lib/cryptoAuth';
import { Shield, Download, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CryptoAuthRegisterProps {
  onSuccess: (userId: string) => void;
}

export const CryptoAuthRegister: React.FC<CryptoAuthRegisterProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'setup' | 'recovery' | 'complete'>('setup');
  const [generateRecovery, setGenerateRecovery] = useState(true);
  const [recoveryPhrase, setRecoveryPhrase] = useState<string[]>([]);
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedPhrase, setCopiedPhrase] = useState(false);
  const { toast } = useToast();

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError(null);

      // Generate new key pair
      const keyPair = await CryptoAuthManager.generateKeyPair();
      
      // Store key pair locally
      await CryptoAuthManager.storeKeyPair(keyPair);

      // Generate recovery phrase if requested
      let phrase: string[] | undefined;
      if (generateRecovery) {
        phrase = CryptoAuthManager.generateRecoveryPhrase();
        setRecoveryPhrase(phrase);
        setStep('recovery');
      }

      // Register with backend
      const result = await CryptoAuthManager.registerUser(keyPair.publicKey, phrase);

      if (!result.success) {
        setError(result.error || 'Registration failed');
        return;
      }

      if (!generateRecovery) {
        setStep('complete');
        setTimeout(() => {
          const userId = CryptoAuthManager.getUserId();
          if (userId) onSuccess(userId);
        }, 1500);
      }

    } catch (error) {
      console.error('Registration error:', error);
      setError('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryConfirmed = () => {
    setStep('complete');
    setTimeout(() => {
      const userId = CryptoAuthManager.getUserId();
      if (userId) onSuccess(userId);
    }, 1500);
  };

  const copyRecoveryPhrase = async () => {
    const phraseText = recoveryPhrase.join(' ');
    await navigator.clipboard.writeText(phraseText);
    setCopiedPhrase(true);
    toast({
      title: "Recovery phrase copied",
      description: "Keep it safe and secure!",
    });
    setTimeout(() => setCopiedPhrase(false), 2000);
  };

  const downloadRecoveryPhrase = () => {
    const phraseText = recoveryPhrase.join(' ');
    const blob = new Blob([phraseText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whispr-owl-recovery-phrase.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Recovery phrase downloaded",
      description: "Store the file in a secure location!",
    });
  };

  if (step === 'recovery') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
            <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle>Save Your Recovery Phrase</CardTitle>
          <CardDescription>
            Write down these 12 words in order. You'll need them to recover your account if you lose access to your device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-2 p-4 bg-muted rounded-lg">
            {recoveryPhrase.map((word, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">{index + 1}.</span>
                <span className="font-mono text-sm">{word}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={copyRecoveryPhrase} className="flex-1">
              {copiedPhrase ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copiedPhrase ? 'Copied!' : 'Copy'}
            </Button>
            <Button variant="outline" onClick={downloadRecoveryPhrase} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Store your recovery phrase in a safe place. We cannot recover your account without it.
            </AlertDescription>
          </Alert>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="recovery-confirmed"
              checked={recoveryConfirmed}
              onCheckedChange={(checked) => setRecoveryConfirmed(checked === true)}
            />
            <Label htmlFor="recovery-confirmed" className="text-sm">
              I have securely saved my recovery phrase
            </Label>
          </div>

          <Button
            onClick={handleRecoveryConfirmed}
            disabled={!recoveryConfirmed}
            className="w-full"
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'complete') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle>Registration Complete!</CardTitle>
          <CardDescription>
            Your cryptographic identity has been created successfully.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <CardTitle>Create Your Crypto Identity</CardTitle>
        <CardDescription>
          Generate a secure cryptographic key pair for device-based authentication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="generate-recovery"
              checked={generateRecovery}
              onCheckedChange={(checked) => setGenerateRecovery(checked === true)}
            />
            <Label htmlFor="generate-recovery" className="text-sm">
              Generate recovery phrase (recommended)
            </Label>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>This will:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Generate a unique Ed25519 key pair</li>
              <li>Store your private key securely on this device</li>
              <li>Register your public key with Whispr-Owl</li>
              {generateRecovery && <li>Create a 12-word recovery phrase</li>}
            </ul>
          </div>
        </div>

        <Button
          onClick={handleRegister}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Creating Identity...' : 'Create Crypto Identity'}
        </Button>
      </CardContent>
    </Card>
  );
};