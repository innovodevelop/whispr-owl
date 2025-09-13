import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, UserPlus, CheckCircle, X, Loader2 } from 'lucide-react';
import { isDryRun } from '@/config/featureFlags';
import { mockCheckUsernameAvailability } from '@/lib/dryRunStubs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MigrationUsernameSetupProps {
  onComplete: (username: string, displayName: string) => void;
  initialUsername?: string;
  initialDisplayName?: string;
}

type ValidationState = 'idle' | 'checking' | 'valid' | 'invalid';

export const MigrationUsernameSetup: React.FC<MigrationUsernameSetupProps> = ({ 
  onComplete, 
  initialUsername = '',
  initialDisplayName = ''
}) => {
  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [usernameValidation, setUsernameValidation] = useState<ValidationState>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const dryRun = isDryRun();

  // Debounced username validation
  useEffect(() => {
    if (!username) {
      setUsernameValidation('idle');
      setUsernameMessage('');
      return;
    }

    const validateUsername = async () => {
      // Format validation
      if (username.length < 3) {
        setUsernameValidation('invalid');
        setUsernameMessage('Too short (minimum 3 characters)');
        return;
      }

      if (username.length > 24) {
        setUsernameValidation('invalid');
        setUsernameMessage('Too long (maximum 24 characters)');
        return;
      }

      if (!/^[a-z0-9_]+$/.test(username)) {
        setUsernameValidation('invalid');
        setUsernameMessage('Only lowercase letters, numbers, and underscores allowed');
        return;
      }

      // Check availability
      setUsernameValidation('checking');
      setUsernameMessage('Checking availability...');

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
          setUsernameValidation('valid');
          setUsernameMessage('Username is available');
        } else {
          setUsernameValidation('invalid');
          setUsernameMessage('Username is already taken');
        }
      } catch (error) {
        console.error('Username validation failed:', error);
        setUsernameValidation('invalid');
        setUsernameMessage('Failed to check availability');
      }
    };

    const timeoutId = setTimeout(validateUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [username, dryRun]);

  const handleUsernameChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
    setError('');
  };

  const handleDisplayNameChange = (value: string) => {
    // Allow more flexible display names
    const cleaned = value.replace(/[<>]/g, ''); // Remove potentially dangerous characters
    setDisplayName(cleaned);
    setError('');
  };

  const isFormValid = () => {
    return usernameValidation === 'valid' && 
           displayName.trim().length >= 2 && 
           displayName.trim().length <= 50;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      setError('Please complete both username and display name fields correctly');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const trimmedDisplayName = displayName.trim();
      toast.success(`Welcome, @${username}!`);
      onComplete(username, trimmedDisplayName);
    } catch (error) {
      console.error('Form submission failed:', error);
      setError('Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUsernameIcon = () => {
    switch (usernameValidation) {
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

  const getUsernameColor = () => {
    switch (usernameValidation) {
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
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">MIGRATION DRY RUN</span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Username and display name will be simulated
            </p>
          </div>
        )}

        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Set your username and display name to finish the migration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
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
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {getUsernameIcon()}
                  </div>
                </div>
                
                {usernameMessage && (
                  <p className={`text-xs ${getUsernameColor()}`}>
                    {usernameMessage}
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground">
                  3–24 characters • Letters, numbers, and underscores only
                </p>
              </div>

              {/* Display Name Field */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => handleDisplayNameChange(e.target.value)}
                    placeholder="Your Display Name"
                    className="pl-10"
                    maxLength={50}
                    autoComplete="name"
                  />
                </div>
                
                {displayName && (
                  <p className={`text-xs ${
                    displayName.trim().length >= 2 && displayName.trim().length <= 50 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-destructive'
                  }`}>
                    {displayName.trim().length < 2 && 'Too short (minimum 2 characters)'}
                    {displayName.trim().length > 50 && 'Too long (maximum 50 characters)'}
                    {displayName.trim().length >= 2 && displayName.trim().length <= 50 && 'Looks good!'}
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground">
                  2–50 characters • This is how others will see your name
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
                disabled={!isFormValid() || isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Completing Migration...
                  </div>
                ) : (
                  'Complete Migration'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};