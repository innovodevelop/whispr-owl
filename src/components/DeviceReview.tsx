import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { isDryRun } from '@/config/featureFlags';
import { mockConfirmDevice } from '@/lib/dryRunStubs';
import { CryptoAuthManager } from '@/lib/cryptoAuth';
import { toast } from 'sonner';

interface DeviceReviewProps {
  onConfirm: () => void;
  onReject: () => void;
}

export const DeviceReview: React.FC<DeviceReviewProps> = ({ onConfirm, onReject }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Get device information
  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';
    
    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    
    // Detect browser
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    return { os, browser };
  };

  const getDeviceFingerprint = () => {
    const deviceId = CryptoAuthManager.getDeviceId();
    if (!deviceId) return 'unknown';
    
    // Show first 6 and last 6 characters
    return `${deviceId.substring(0, 6)}...${deviceId.substring(deviceId.length - 6)}`;
  };

  const deviceInfo = getDeviceInfo();
  const deviceFingerprint = getDeviceFingerprint();
  const creationTime = new Date().toLocaleString();
  const dryRun = isDryRun();

  const handleConfirmDevice = async () => {
    setLoading(true);
    setError('');

    try {
      const deviceId = CryptoAuthManager.getDeviceId();
      if (!deviceId) {
        throw new Error('Device ID not found');
      }

      let result;
      if (dryRun) {
        result = await mockConfirmDevice(deviceId);
      } else {
        // In live mode, call actual API endpoint
        // This would be implemented as a Supabase function
        result = { success: true, confirmed_at: new Date().toISOString() };
      }

      if (result.success) {
        toast.success('Device confirmed successfully');
        onConfirm();
      } else {
        throw new Error('Failed to confirm device');
      }
    } catch (error) {
      console.error('Device confirmation failed:', error);
      setError('Failed to confirm device. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectDevice = () => {
    const confirmed = window.confirm(
      'This will permanently delete all cryptographic keys and credentials from this device. This action cannot be undone. Continue?'
    );

    if (confirmed) {
      // Clear all local data
      CryptoAuthManager.clearStoredData();
      toast.success('Device data cleared');
      onReject();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md mx-auto space-y-6">
        {dryRun && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">DRY RUN</span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              No real device data will be saved
            </p>
          </div>
        )}

        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Review this device</CardTitle>
            <CardDescription>
              Confirm or reject this device registration before proceeding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Device Information */}
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Device</span>
                  <span className="text-sm font-medium">
                    {deviceInfo.os} • Whispr 1.0.0
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Browser</span>
                  <span className="text-sm font-medium">{deviceInfo.browser}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Key FP</span>
                  <span className="text-sm font-mono">{deviceFingerprint}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">{creationTime}</span>
                </div>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  This device will be authorized for secure access to your Whispr account. 
                  Only confirm if you recognize this device and initiated this registration.
                </AlertDescription>
              </Alert>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleConfirmDevice}
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    Confirming...
                  </div>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Device
                  </>
                )}
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleRejectDevice}
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={loading}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Reject & Wipe
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Navigation is blocked until you make a choice
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};