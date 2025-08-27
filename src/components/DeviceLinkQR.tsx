import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import QRCode from 'qrcode';
import { Smartphone, RefreshCw, Clock } from 'lucide-react';

interface DeviceLinkQRProps {
  onSuccess: () => void;
}

export const DeviceLinkQR: React.FC<DeviceLinkQRProps> = ({ onSuccess }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [requestData, setRequestData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    generateQRCode();
  }, []);

  useEffect(() => {
    if (requestData) {
      // Set up polling to check if device was linked
      const pollInterval = setInterval(checkLinkStatus, 2000);
      
      // Set up countdown timer
      const countdownInterval = setInterval(() => {
        const expiresAt = new Date(requestData.expires_at).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          clearInterval(pollInterval);
          clearInterval(countdownInterval);
          setError('QR code expired. Please generate a new one.');
        }
      }, 1000);

      return () => {
        clearInterval(pollInterval);
        clearInterval(countdownInterval);
      };
    }
  }, [requestData]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      setError(null);

      // Generate a unique device ID for this request
      const deviceId = crypto.randomUUID();
      
      // Request a new device link request
      const { data, error } = await supabase.functions.invoke('new-device-request', {
        body: {
          requesting_device_id: deviceId,
          use_device_code: false
        }
      });

      if (error) {
        setError('Failed to generate QR code');
        return;
      }

      setRequestData(data);

      // Create QR code data
      const qrData = JSON.stringify({
        type: 'device_link',
        request_id: data.request_id,
        challenge: data.challenge_string,
        device_id: deviceId
      });

      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      setQrDataUrl(qrDataUrl);

      // Set initial countdown
      const expiresAt = new Date(data.expires_at).getTime();
      const now = Date.now();
      setTimeLeft(Math.max(0, Math.ceil((expiresAt - now) / 1000)));

    } catch (error) {
      console.error('QR generation error:', error);
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const checkLinkStatus = async () => {
    if (!requestData) return;

    try {
      // For now, just simulate checking - in production this would poll the backend
      // The actual linking would be handled by the edge functions
      console.log('Checking link status for request:', requestData.request_id);
    } catch (error) {
      console.error('Error checking link status:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Smartphone className="w-6 h-6 text-primary" />
        </div>
        <CardTitle>Link New Device</CardTitle>
        <CardDescription>
          Scan this QR code with your existing Whispr-Owl device to link this device to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {qrDataUrl && !error && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg">
                <img 
                  src={qrDataUrl} 
                  alt="Device Link QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>

            {timeLeft > 0 && (
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Expires in {formatTime(timeLeft)}</span>
              </div>
            )}

            <div className="text-center text-sm text-muted-foreground">
              <p>Waiting for authorization from your existing device...</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={generateQRCode}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Generating...' : 'Generate New QR Code'}
          </Button>
        </div>

        <Alert>
          <Smartphone className="h-4 w-4" />
          <AlertDescription>
            <strong>Instructions:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Open Whispr-Owl on your existing device</li>
              <li>Go to Settings → Link Device</li>
              <li>Scan this QR code</li>
              <li>Authorize the new device</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};