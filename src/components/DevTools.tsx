import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Trash2, RefreshCw } from 'lucide-react';
import { getFeatureFlags, updateFeatureFlags, FeatureFlags } from '@/config/featureFlags';
import { clearDryRunData } from '@/lib/dryRunStubs';
import { PinManager } from '@/lib/pinSecurity';
import { CryptoAuthManager } from '@/lib/cryptoAuth';
import { toast } from 'sonner';

interface DevToolsProps {
  onClose: () => void;
}

export const DevTools: React.FC<DevToolsProps> = ({ onClose }) => {
  const [flags, setFlags] = useState<FeatureFlags>(getFeatureFlags());

  const handleFlagUpdate = (key: keyof FeatureFlags, value: any) => {
    const newFlags = { ...flags, [key]: value };
    setFlags(newFlags);
    updateFeatureFlags({ [key]: value });
    toast.success(`${key} updated`);
  };

  const handleClearLocalState = () => {
    const confirmed = window.confirm(
      'This will clear ALL local data including keys, PIN, and settings. Continue?'
    );
    
    if (confirmed) {
      // Clear all Whispr data
      CryptoAuthManager.clearStoredData();
      
      // Clear PIN data
      if (PinManager.isPinEnabled()) {
        localStorage.removeItem('whispr_pin_storage');
        localStorage.removeItem('whispr_session_unlock');
        localStorage.removeItem('whispr_pin_attempts');
        localStorage.removeItem('whispr_last_activity');
      }
      
      // Clear dry run data
      clearDryRunData();
      
      // Clear feature flags
      localStorage.removeItem('whispr_feature_flags');
      
      toast.success('Local state cleared');
      
      // Reload page to reset everything
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleResetDryRun = () => {
    clearDryRunData();
    toast.success('Dry run data cleared');
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Development Tools
              </CardTitle>
              <CardDescription>
                Runtime configuration and testing utilities
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Registration Flow Mode */}
          <div className="space-y-2">
            <Label>Registration Flow Mode</Label>
            <Select 
              value={flags.REG_FLOW_MODE} 
              onValueChange={(value: 'live' | 'dry_run') => handleFlagUpdate('REG_FLOW_MODE', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="live">Live (real server calls)</SelectItem>
                <SelectItem value="dry_run">Dry Run (simulated)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {flags.REG_FLOW_MODE === 'live' 
                ? 'Real user accounts will be created' 
                : 'All registration calls will be simulated'
              }
            </p>
          </div>

          {/* Dev Tools Visibility */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Dev Tools</Label>
              <p className="text-xs text-muted-foreground">
                Toggle dev tools visibility in the app
              </p>
            </div>
            <Switch
              checked={flags.SHOW_DEV_TOOLS}
              onCheckedChange={(checked) => handleFlagUpdate('SHOW_DEV_TOOLS', checked)}
            />
          </div>

          {/* PIN Timeout */}
          <div className="space-y-2">
            <Label>PIN Timeout (minutes)</Label>
            <Select 
              value={flags.APP_RESUME_PIN_THRESHOLD_MIN.toString()} 
              onValueChange={(value) => handleFlagUpdate('APP_RESUME_PIN_THRESHOLD_MIN', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 minute</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Current State Info */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Current State</h4>
            <div className="text-xs space-y-1 text-muted-foreground">
              <div>Mode: <span className="font-mono">{flags.REG_FLOW_MODE}</span></div>
              <div>PIN Enabled: <span className="font-mono">{PinManager.isPinEnabled() ? 'Yes' : 'No'}</span></div>
              <div>Has Keys: <span className="font-mono">{CryptoAuthManager.hasStoredKeys() ? 'Yes' : 'No'}</span></div>
              <div>User ID: <span className="font-mono">{CryptoAuthManager.getUserId() || 'None'}</span></div>
              <div>Device ID: <span className="font-mono">{CryptoAuthManager.getDeviceId() || 'None'}</span></div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium">Actions</h4>
            
            {flags.REG_FLOW_MODE === 'dry_run' && (
              <Button
                variant="outline"
                onClick={handleResetDryRun}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Dry Run Data
              </Button>
            )}
            
            <Button
              variant="destructive"
              onClick={handleClearLocalState}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Local State
            </Button>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <strong>Development Only:</strong> These tools are for testing and development. 
              Use with caution as they can clear all user data.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};