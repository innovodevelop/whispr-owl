import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowRight, Lock, Key, Users } from 'lucide-react';

interface LegacyUserMigrationProps {
  onStartMigration: () => void;
  loading?: boolean;
  error?: string;
}

export const LegacyUserMigration: React.FC<LegacyUserMigrationProps> = ({
  onStartMigration,
  loading = false,
  error
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Security Upgrade Required</CardTitle>
            <CardDescription>
              We've enhanced Whispr with stronger security features. Let's migrate your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Enhanced Privacy</h3>
                  <p className="text-sm text-muted-foreground">
                    Device-based encryption keys replace traditional passwords
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Key className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Cryptographic Identity</h3>
                  <p className="text-sm text-muted-foreground">
                    Your identity is now secured with advanced cryptography
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Preserved Contacts</h3>
                  <p className="text-sm text-muted-foreground">
                    All your existing contacts and conversations will be preserved
                  </p>
                </div>
              </div>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                This migration is required to continue using Whispr. Your existing data will be 
                safely transferred to the new secure system.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button 
                onClick={onStartMigration} 
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Starting Migration...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Continue with Enhanced Security
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                This process will take just a few minutes and requires your attention
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};