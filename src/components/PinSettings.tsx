import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { PinManager } from '@/lib/pinSecurity';
import { PinSetup } from './PinSetup';
import { PinPrompt } from './PinPrompt';
import { toast } from 'sonner';

export const PinSettings: React.FC = () => {
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const isPinEnabled = PinManager.isPinEnabled();

  const handleTogglePin = async (enabled: boolean) => {
    if (enabled) {
      setShowPinSetup(true);
    } else {
      setShowPinPrompt(true);
    }
  };

  const handleDisablePin = async (pin: string) => {
    setLoading(true);
    const result = await PinManager.disablePin(pin);
    setLoading(false);
    
    if (result.success) {
      toast.success('PIN disabled');
      setShowPinPrompt(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>App PIN</CardTitle>
          <CardDescription>
            Add a 3-digit PIN for quick app security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable PIN</p>
              <p className="text-sm text-muted-foreground">
                PIN is stored locally and never sent to servers
              </p>
            </div>
            <Switch
              checked={isPinEnabled}
              onCheckedChange={handleTogglePin}
            />
          </div>
        </CardContent>
      </Card>

      {showPinSetup && (
        <PinSetup
          onComplete={() => {
            setShowPinSetup(false);
            toast.success('PIN enabled successfully');
          }}
          onCancel={() => setShowPinSetup(false)}
        />
      )}

      {showPinPrompt && (
        <PinPrompt
          title="Enter PIN to disable"
          description="Enter your current PIN to disable it"
          onSuccess={() => handleDisablePin}
          onForgotPin={() => {
            setShowPinPrompt(false);
            // Handle forgot PIN flow
          }}
        />
      )}
    </>
  );
};