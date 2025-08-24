import { useState, useCallback } from 'react';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs?: number;
}

interface RateLimitState {
  attempts: number;
  firstAttemptTime: number;
  blockedUntil?: number;
}

export const useRateLimit = (config: RateLimitConfig) => {
  const [state, setState] = useState<RateLimitState>({
    attempts: 0,
    firstAttemptTime: Date.now()
  });

  const checkRateLimit = useCallback((identifier: string = 'default'): boolean => {
    const now = Date.now();
    
    // Check if currently blocked
    if (state.blockedUntil && now < state.blockedUntil) {
      return false;
    }

    // Reset window if enough time has passed
    if (now - state.firstAttemptTime > config.windowMs) {
      setState({
        attempts: 1,
        firstAttemptTime: now
      });
      return true;
    }

    // Check if within rate limit
    if (state.attempts < config.maxAttempts) {
      setState(prev => ({
        ...prev,
        attempts: prev.attempts + 1
      }));
      return true;
    }

    // Rate limit exceeded - block if configured
    if (config.blockDurationMs) {
      setState(prev => ({
        ...prev,
        blockedUntil: now + config.blockDurationMs!
      }));
    }

    return false;
  }, [state, config]);

  const getRemainingTime = useCallback((): number => {
    const now = Date.now();
    if (state.blockedUntil && now < state.blockedUntil) {
      return Math.ceil((state.blockedUntil - now) / 1000);
    }
    return 0;
  }, [state.blockedUntil]);

  const reset = useCallback(() => {
    setState({
      attempts: 0,
      firstAttemptTime: Date.now()
    });
  }, []);

  return {
    checkRateLimit,
    getRemainingTime,
    reset,
    isBlocked: state.blockedUntil ? Date.now() < state.blockedUntil : false
  };
};