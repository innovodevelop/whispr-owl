// Hook for PIN gating functionality
import { useState, useEffect } from 'react';
import { PinManager } from '@/lib/pinSecurity';
import { isPinRequiredForScreen, getPinTimeoutThreshold } from '@/config/featureFlags';

interface UsePinGateOptions {
  screenName?: string;
  checkOnMount?: boolean;
}

export const usePinGate = (options: UsePinGateOptions = {}) => {
  const [isLocked, setIsLocked] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);

  const checkPinStatus = () => {
    if (!PinManager.isPinEnabled()) {
      setIsLocked(false);
      setShowPinPrompt(false);
      return;
    }

    // Check if session is unlocked
    if (!PinManager.isSessionUnlocked()) {
      setIsLocked(true);
      setShowPinPrompt(true);
    } else {
      setIsLocked(false);
      setShowPinPrompt(false);
      // Update activity timestamp
      PinManager.updateLastActivity();
    }
  };

  const requestPin = (screenName?: string) => {
    if (!PinManager.isPinEnabled()) return;

    // Check if PIN is required for this screen
    if (screenName && !isPinRequiredForScreen(screenName)) {
      return;
    }

    if (!PinManager.isSessionUnlocked()) {
      setShowPinPrompt(true);
      setIsLocked(true);
    }
  };

  const handlePinSuccess = () => {
    setShowPinPrompt(false);
    setIsLocked(false);
    PinManager.updateLastActivity();
  };

  const handleForgotPin = async () => {
    const result = await PinManager.resetPin();
    if (result.success) {
      setShowPinPrompt(false);
      setIsLocked(false);
    }
  };

  // Check on mount and when coming back from background
  useEffect(() => {
    if (options.checkOnMount !== false) {
      checkPinStatus();
    }

    // Check when app becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkPinStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return {
    isLocked,
    showPinPrompt,
    requestPin,
    handlePinSuccess,
    handleForgotPin,
    checkPinStatus
  };
};