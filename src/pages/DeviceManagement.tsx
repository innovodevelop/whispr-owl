import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CryptoAuthManager } from '@/lib/cryptoAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import AppHeader from '@/components/AppHeader';
import { DeviceMap } from '@/components/DeviceMap';
import { DeviceActionDialog } from '@/components/dialogs/DeviceActionDialog';
import { toast } from 'sonner';
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  Lock, 
  Unlock,
  Trash2,
  RotateCcw,
  MapPin,
  Wifi,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Device {
  id: string;
  device_id: string;
  device_name: string;
  public_key: string;
  linked_at: string;
  last_used_at: string;
  device_fingerprint: any;
  status: string;
  locked_until: string | null;
  last_ip: string | null;
  location_permission: boolean;
}

export default function DeviceManagement() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [actionType, setActionType] = useState<'lock' | 'remove' | 'wipe' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      initialize();
    }
  }, [user]);

  const initialize = async () => {
    setLoading(true);
    await ensureCurrentDeviceRecord();
    await fetchDevices();
  };

  const ensureCurrentDeviceRecord = async () => {
    if (!user) return;
    try {
      const localId = CryptoAuthManager.getDeviceId() || await CryptoAuthManager.generateDeviceId();
      const { data: existing } = await supabase
        .from('crypto_devices')
        .select('id')
        .eq('user_id', user.id)
        .eq('device_id', localId)
        .maybeSingle();

      if (!existing) {
        const { data: cryptoUser } = await supabase
          .from('crypto_users')
          .select('public_key, device_fingerprint')
          .eq('user_id', user.id)
          .maybeSingle();

        const fingerprint =
          (cryptoUser?.device_fingerprint as any) ??
          CryptoAuthManager.getDeviceFingerprint() ??
          CryptoAuthManager.generateDeviceFingerprint();

        const deviceName =
          (fingerprint as any)?.platform || 'This device';

        // Get user's IP address
        let userIP = null;
        try {
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipResponse.json();
          userIP = ipData.ip;
        } catch (ipError) {
          console.log('Could not fetch IP address:', ipError);
        }

        await supabase.from('crypto_devices').insert({
          user_id: user.id,
          device_id: localId,
          device_name: deviceName,
          public_key: (cryptoUser as any)?.public_key || '',
          device_fingerprint: fingerprint,
          last_ip: userIP
        } as any);
      }
    } catch (e) {
      console.error('Error ensuring current device record:', e);
    }
  };
  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('crypto_devices')
        .select('*')
        .eq('user_id', user?.id)
        .order('last_used_at', { ascending: false });

      if (error) throw error;
      setDevices((data as Device[]) || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (fingerprint: any) => {
    const userAgent = fingerprint?.userAgent?.toLowerCase() || '';
    
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      return <Smartphone className="h-5 w-5" />;
    } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
      return <Tablet className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const getDeviceType = (fingerprint: any) => {
    const userAgent = fingerprint?.userAgent?.toLowerCase() || '';
    
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      return 'Mobile';
    } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
      return 'Tablet';
    }
    return 'Desktop';
  };

  const getStatusBadge = (device: Device) => {
    if (device.locked_until && new Date(device.locked_until) > new Date()) {
      return <Badge variant="destructive">Locked</Badge>;
    }
    
    const lastUsed = new Date(device.last_used_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUsed.getTime()) / (1000 * 60);
    
    if (diffMinutes < 5) {
      return <Badge variant="default" className="bg-green-500">Active</Badge>;
    } else if (diffMinutes < 60) {
      return <Badge variant="secondary">Recently Active</Badge>;
    }
    return <Badge variant="outline">Offline</Badge>;
  };

  const handleDeviceAction = (device: Device, action: 'lock' | 'remove' | 'wipe') => {
    setSelectedDevice(device);
    setActionType(action);
  };

  const maskIP = (ip: string | null) => {
    if (!ip) return 'Unknown';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return ip.substring(0, 8) + '...';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
      <AppHeader title="Device Management" />
        <main className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading devices...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Device Management" />
      
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Device Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage all devices linked to your account with encrypted location tracking
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Device List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Linked Devices ({devices.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {devices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No devices found
                </div>
              ) : (
                devices.map((device) => (
                  <Card key={device.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          {getDeviceIcon(device.device_fingerprint)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">
                              {device.device_name || 'Unknown Device'}
                            </h4>
                            {getStatusBadge(device)}
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Monitor className="h-3 w-3" />
                              {getDeviceType(device.device_fingerprint)}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Wifi className="h-3 w-3" />
                              IP: {maskIP(device.last_ip)}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(device.last_used_at), { addSuffix: true })}
                            </div>
                            
                            {device.location_permission && (
                              <div className="flex items-center gap-1 text-green-600">
                                <MapPin className="h-3 w-3" />
                                Location enabled
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeviceAction(device, 'lock')}
                          className="h-8 w-8 p-0"
                        >
                          {device.locked_until && new Date(device.locked_until) > new Date() ? 
                            <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />
                          }
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeviceAction(device, 'wipe')}
                          className="h-8 w-8 p-0"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeviceAction(device, 'remove')}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Live Map */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Live Device Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DeviceMap devices={devices} />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Device Action Dialog */}
      {selectedDevice && actionType && (
        <DeviceActionDialog
          device={selectedDevice}
          actionType={actionType}
          open={true}
          onClose={() => {
            setSelectedDevice(null);
            setActionType(null);
          }}
          onSuccess={() => {
            fetchDevices();
            setSelectedDevice(null);
            setActionType(null);
          }}
        />
      )}
    </div>
  );
}