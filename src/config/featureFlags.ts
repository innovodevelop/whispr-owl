// Feature flags and configuration for Whispr
export interface FeatureFlags {
  REG_FLOW_MODE: 'live' | 'dry_run';
  SHOW_DEV_TOOLS: boolean;
  PIN_REQUIRED_SCREENS: string[];
  APP_RESUME_PIN_THRESHOLD_MIN: number;
}

// Default configuration
const defaultFlags: FeatureFlags = {
  REG_FLOW_MODE: 'live',
  SHOW_DEV_TOOLS: false,
  PIN_REQUIRED_SCREENS: ['Finance', 'KeyBackup', 'DeviceList'],
  APP_RESUME_PIN_THRESHOLD_MIN: 5,
};

// Get feature flags from localStorage with fallbacks
export const getFeatureFlags = (): FeatureFlags => {
  try {
    const stored = localStorage.getItem('whispr_feature_flags');
    if (stored) {
      return { ...defaultFlags, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to parse feature flags from localStorage:', error);
  }
  return defaultFlags;
};

// Update feature flags in localStorage
export const updateFeatureFlags = (updates: Partial<FeatureFlags>): void => {
  try {
    const current = getFeatureFlags();
    const updated = { ...current, ...updates };
    localStorage.setItem('whispr_feature_flags', JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to update feature flags:', error);
  }
};

// Check if in dry run mode
export const isDryRun = (): boolean => {
  return getFeatureFlags().REG_FLOW_MODE === 'dry_run';
};

// Check if dev tools should be shown
export const shouldShowDevTools = (): boolean => {
  return getFeatureFlags().SHOW_DEV_TOOLS;
};

// Check if PIN is required for a screen
export const isPinRequiredForScreen = (screenName: string): boolean => {
  return getFeatureFlags().PIN_REQUIRED_SCREENS.includes(screenName);
};

// Get PIN timeout threshold
export const getPinTimeoutThreshold = (): number => {
  return getFeatureFlags().APP_RESUME_PIN_THRESHOLD_MIN;
};