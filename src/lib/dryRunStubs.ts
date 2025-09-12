// Dry run stubs for testing registration flow without server calls
import { CryptoUser, Challenge, DeviceLinkRequest } from '@/lib/cryptoAuth';

// Generate deterministic fake user ID for dry run
export const generateDryRunUserId = (): string => {
  return 'sim-user-' + Math.random().toString(36).substring(2, 15);
};

// Generate deterministic fake device ID for dry run
export const generateDryRunDeviceId = (): string => {
  return 'sim-device-' + Math.random().toString(36).substring(2, 15);
};

// Simulate user registration (no server call)
export const mockRegisterUser = async (
  publicKey: CryptoKey,
  recoveryPhrase?: string[]
): Promise<{ success: boolean; error?: string; username?: string }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
  
  // Generate fake username
  const adjectives = ['swift', 'bright', 'wise', 'bold', 'calm', 'quick', 'keen', 'noble'];
  const nouns = ['falcon', 'tiger', 'eagle', 'wolf', 'bear', 'fox', 'hawk', 'lion'];
  const adjIndex = Math.floor(Math.random() * adjectives.length);
  const nounIndex = Math.floor(Math.random() * nouns.length);
  const number = Math.floor(Math.random() * 99) + 1;
  const username = `${adjectives[adjIndex]}-${nouns[nounIndex]}-${number}`;
  
  return {
    success: true,
    username: `sim-${username}`
  };
};

// Simulate challenge request (no server call)
export const mockRequestChallenge = async (userId: string): Promise<Challenge | null> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  
  return {
    challenge_id: 'sim-challenge-' + Math.random().toString(36).substring(2, 15),
    challenge_string: 'simulate-challenge-' + Date.now(),
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
  };
};

// Simulate challenge verification (no server call)
export const mockVerifyChallenge = async (
  challengeId: string,
  signature: string
): Promise<{ success: boolean; token?: string; error?: string }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
  
  return {
    success: true,
    token: 'sim-token-' + Math.random().toString(36).substring(2, 20)
  };
};

// Simulate device confirmation (no server call)
export const mockConfirmDevice = async (deviceId: string): Promise<{ success: boolean; confirmed_at?: string }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 300));
  
  return {
    success: true,
    confirmed_at: new Date().toISOString()
  };
};

// Simulate username availability check (no server call)
export const mockCheckUsernameAvailability = async (username: string): Promise<{ available: boolean }> => {
  // Simulate API delay with throttling
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
  
  // Some fake taken usernames for testing
  const takenUsernames = ['admin', 'test', 'user', 'whispr', 'demo', 'sample'];
  const available = !takenUsernames.includes(username.toLowerCase()) && username.length >= 3;
  
  return { available };
};

// Simulate username creation (no server call)
export const mockCreateUsername = async (username: string): Promise<{ success: boolean; error?: string }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));
  
  const available = await mockCheckUsernameAvailability(username);
  if (!available.available) {
    return { success: false, error: 'Username is already taken' };
  }
  
  return { success: true };
};

// Clear all dry run data
export const clearDryRunData = (): void => {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('whispr_') && !key.includes('feature_flags')) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear simulated session data
  sessionStorage.clear();
};