import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, X, AlertTriangle } from 'lucide-react';
import { PinManager } from '@/lib/pinSecurity';

interface PinPromptProps {
  onSuccess: () => void;
  onForgotPin: () => void;
  title?: string;
  description?: string;
}

export const PinPrompt: React.FC<PinPromptProps> = ({ 
  onSuccess, 
  onForgotPin, 
  title = 'Enter your PIN',
  description = 'Enter your 3-digit PIN to continue'
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [blockStatus, setBlockStatus] = useState<{ isBlocked: boolean; remainingMs?: number }>({ isBlocked: false });

  // Check block status on mount and update countdown
  useEffect(() => {
    const updateBlockStatus = () => {
      const status = PinManager.getBlockStatus();
      setBlockStatus(status);
      
      if (status.isBlocked && status.remainingMs) {
        const timer = setTimeout(updateBlockStatus, 1000);
        return () => clearTimeout(timer);
      }
    };

    updateBlockStatus();
  }, []);

  const formatTimeRemaining = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  const handleDigitClick = (digit: string) => {
    if (pin.length < 3 && !blockStatus.isBlocked) {
      setPin(prev => prev + digit);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleSubmit = async () => {
    if (pin.length !== 3) {
      setError('PIN must be exactly 3 digits');
      return;
    }

    setLoading(true);
    try {
      const result = await PinManager.verifyPin(pin);
      
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Incorrect PIN');
        setPin('');
        
        // Update block status if blocked
        if (result.blockedUntil) {
          setBlockStatus({ isBlocked: true, remainingMs: result.blockedUntil - Date.now() });
        }
      }
    } catch (error) {
      setError('Failed to verify PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when 3 digits are entered
  useEffect(() => {
    if (pin.length === 3 && !blockStatus.isBlocked) {
      handleSubmit();
    }
  }, [pin, blockStatus.isBlocked]);

  const renderPinDots = () => {
    return (
      <div className="flex justify-center gap-4 mb-8">
        {[0, 1, 2].map(index => (
          <div
            key={index}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              index < pin.length
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
    const isDisabled = blockStatus.isBlocked || loading;
    
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
                  disabled={pin.length === 0 || isDisabled}
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
              disabled={pin.length >= 3 || isDisabled}
            >
              {digit}
            </Button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderPinDots()}
          
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {blockStatus.isBlocked && blockStatus.remainingMs && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Too many failed attempts. Try again in {formatTimeRemaining(blockStatus.remainingMs)}.
              </AlertDescription>
            </Alert>
          )}
          
          {renderKeypad()}
          
          <div className="pt-4">
            <Button
              variant="ghost"
              onClick={onForgotPin}
              className="w-full text-sm"
              disabled={loading}
            >
              Forgot PIN?
            </Button>
          </div>
          
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {loading && 'Verifying PIN...'}
              {!loading && 'Enter your 3-digit PIN to unlock the app'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};