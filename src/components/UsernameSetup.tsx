import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, CheckCircle, X, Loader2 } from 'lucide-react';
import { isDryRun } from '@/config/featureFlags';
import { mockCheckUsernameAvailability, mockCreateUsername } from '@/lib/dryRunStubs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsernameSetupProps {
  onComplete: (username: string) => void;
}

type ValidationState = 'idle' | 'checking' | 'valid' | 'invalid';

export const UsernameSetup: React.FC<UsernameSetupProps> = ({ onComplete }) => {
  const [username, setUsername] = useState('');
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [validationMessage, setValidationMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const dryRun = isDryRun();

  // Debounced username validation
  useEffect(() => {
    if (!username) {
      setValidationState('idle');
      setValidationMessage('');
      return;
    }

    const validateUsername = async () => {
      // Format validation
      if (username.length < 3) {
        setValidationState('invalid');
        setValidationMessage('Too short (minimum 3 characters)');
        return;
      }

      if (username.length > 24) {
        setValidationState('invalid');
        setValidationMessage('Too long (maximum 24 characters)');
        return;
      }

      if (!/^[a-z0-9_]+$/.test(username)) {
        setValidationState('invalid');
        setValidationMessage('Only lowercase letters, numbers, and underscores allowed');
        return;
      }

      // Check availability
      setValidationState('checking');
      setValidationMessage('Checking availability...');

      try {
        let result;
        if (dryRun) {
          result = await mockCheckUsernameAvailability(username);
        } else {
          // In live mode, call actual API
          const { data, error } = await supabase.functions.invoke('check-username', {
            body: { username }
          });
          
          if (error) throw error;
          result = data;
        }

        if (result.available) {
          setValidationState('valid');
          setValidationMessage('Username is available');
        } else {
          setValidationState('invalid');
          setValidationMessage('Username is already taken');
        }
      } catch (error) {
        console.error('Username validation failed:', error);
        setValidationState('invalid');
        setValidationMessage('Failed to check availability');
      }
    };

    const timeoutId = setTimeout(validateUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [username, dryRun]);

  const handleUsernameChange = (value: string) => {
    // Convert to lowercase and filter allowed characters
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validationState !== 'valid') {
      setError('Please enter a valid username');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let result;
      if (dryRun) {
        result = await mockCreateUsername(username);
      } else {
        // In live mode, call actual API
        const { data, error } = await supabase.functions.invoke('create-username', {
          body: { username }
        });
        
        if (error) throw error;
        result = data;
      }

      if (result.success) {
        // Store username locally
        localStorage.setItem('whispr_username', username);
        toast.success(`Welcome, @${username}!`);
        onComplete(username);
      } else {
        throw new Error(result.error || 'Failed to create username');
      }
    } catch (error) {
      console.error('Username creation failed:', error);
      setError('Failed to create username. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getValidationIcon = () => {
    switch (validationState) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getValidationColor = () => {
    switch (validationState) {
      case 'valid':
        return 'text-green-600 dark:text-green-400';
      case 'invalid':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md mx-auto space-y-6">
        {dryRun && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">DRY RUN</span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Username will be simulated, not saved
            </p>
          </div>
        )}

        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Choose your username</CardTitle>
            <CardDescription>
              This is how others will find and identify you on Whispr
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    @
                  </div>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="your_username"
                    className="pl-8 pr-10"
                    maxLength={24}
                    autoComplete="username"
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {getValidationIcon()}
                  </div>
                </div>
                
                {validationMessage && (
                  <p className={`text-xs ${getValidationColor()}`}>
                    {validationMessage}
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground">
                  3–24 characters • Letters, numbers, and underscores only
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={validationState !== 'valid' || isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </div>
                ) : (
                  'Save & Continue'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};