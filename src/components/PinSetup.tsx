import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Check, X } from 'lucide-react';
import { PinManager } from '@/lib/pinSecurity';
import { toast } from 'sonner';

interface PinSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

type SetupStep = 'create' | 'confirm';

export const PinSetup: React.FC<PinSetupProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<SetupStep>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const currentPin = step === 'create' ? pin : confirmPin;
  const setCurrentPin = step === 'create' ? setPin : setConfirmPin;

  const handleDigitClick = (digit: string) => {
    if (currentPin.length < 3) {
      setCurrentPin(prev => prev + digit);
      setError('');
    }
  };

  const handleBackspace = () => {
    setCurrentPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleContinue = () => {
    if (pin.length !== 3) {
      setError('PIN must be exactly 3 digits');
      return;
    }
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (confirmPin.length !== 3) {
      setError('PIN must be exactly 3 digits');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match');
      setConfirmPin('');
      return;
    }

    setLoading(true);
    try {
      const result = await PinManager.enablePin(pin);
      if (result.success) {
        toast.success('PIN enabled successfully');
        onComplete();
      } else {
        setError(result.error || 'Failed to enable PIN');
      }
    } catch (error) {
      setError('Failed to enable PIN');
    } finally {
      setLoading(false);
    }
  };

  const renderPinDots = () => {
    return (
      <div className="flex justify-center gap-4 mb-8">
        {[0, 1, 2].map(index => (
          <div
            key={index}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              index < currentPin.length
                ? 'bg-primary border-primary scale-110'
                : 'border-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderKeypad = () => {
    const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''];
    
    return (
      <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
        {digits.map((digit, index) => {
          if (digit === '') {
            if (index === 9) return <div key={index}></div>; // Empty space
            if (index === 11) {
              return (
                <Button
                  key={index}
                  variant="ghost"
                  size="lg"
                  onClick={handleBackspace}
                  className="h-16 w-16 rounded-full p-0 hover:bg-muted"
                  disabled={currentPin.length === 0}
                >
                  <X className="h-6 w-6" />
                </Button>
              );
            }
            return <div key={index}></div>;
          }
          
          return (
            <Button
              key={index}
              variant="ghost"
              size="lg"
              onClick={() => handleDigitClick(digit)}
              className="h-16 w-16 rounded-full p-0 text-xl font-semibold hover:bg-muted disabled:opacity-50"
              disabled={currentPin.length >= 3}
            >
              {digit}
            </Button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>
              {step === 'create' ? 'Create your PIN' : 'Confirm your PIN'}
            </CardTitle>
            <CardDescription>
              {step === 'create' 
                ? 'Choose a 3-digit PIN to secure your app' 
                : 'Enter your PIN again to confirm'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderPinDots()}
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {renderKeypad()}
            
            <div className="space-y-3 pt-4">
              {step === 'create' ? (
                <Button
                  onClick={handleContinue}
                  className="w-full"
                  disabled={pin.length !== 3}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleConfirm}
                  className="w-full"
                  disabled={confirmPin.length !== 3 || loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      Enabling PIN...
                    </div>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Enable PIN
                    </>
                  )}
                </Button>
              )}
              
              <Button
                variant="ghost"
                onClick={onCancel}
                className="w-full"
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Your PIN is stored locally and encrypted. It will never be sent to our servers.
                You can disable it anytime in Settings.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};