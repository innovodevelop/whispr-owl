import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lock, Unlock, Trash2, RotateCcw } from 'lucide-react';

interface Device {
  id: string;
  device_id: string;
  device_name: string;
  status: string;
  locked_until: string | null;
}

interface DeviceActionDialogProps {
  device: Device;
  actionType: 'lock' | 'remove' | 'wipe';
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeviceActionDialog = ({ 
  device, 
  actionType, 
  open, 
  onClose, 
  onSuccess 
}: DeviceActionDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [lockDuration, setLockDuration] = useState('1');
  const [lockUnit, setLockUnit] = useState('hours');
  const [confirmText, setConfirmText] = useState('');

  const isLocked = device.locked_until && new Date(device.locked_until) > new Date();

  const handleLockDevice = async () => {
    setLoading(true);
    try {
      let lockedUntil = null;
      
      if (!isLocked) {
        // Lock the device
        const duration = parseInt(lockDuration);
        const now = new Date();
        
        switch (lockUnit) {
          case 'minutes':
            lockedUntil = new Date(now.getTime() + duration * 60 * 1000);
            break;
          case 'hours':
            lockedUntil = new Date(now.getTime() + duration * 60 * 60 * 1000);
            break;
          case 'days':
            lockedUntil = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
            break;
        }
      }

      const { error } = await supabase
        .from('crypto_devices')
        .update({ 
          locked_until: lockedUntil,
          status: lockedUntil ? 'locked' : 'active'
        })
        .eq('id', device.id);

      if (error) throw error;

      toast.success(isLocked ? 'Device unlocked successfully' : 'Device locked successfully');
      onSuccess();
    } catch (error) {
      console.error('Error updating device lock:', error);
      toast.error('Failed to update device lock status');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async () => {
    if (confirmText !== 'REMOVE') {
      toast.error('Please type REMOVE to confirm');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('crypto_devices')
        .delete()
        .eq('id', device.id);

      if (error) throw error;

      toast.success('Device removed successfully');
      onSuccess();
    } catch (error) {
      console.error('Error removing device:', error);
      toast.error('Failed to remove device');
    } finally {
      setLoading(false);
    }
  };

  const handleWipeDevice = async () => {
    if (confirmText !== 'WIPE') {
      toast.error('Please type WIPE to confirm');
      return;
    }

    setLoading(true);
    try {
      // Call edge function to wipe device data
      const { error } = await supabase.functions.invoke('wipe-device-data', {
        body: { deviceId: device.id }
      });

      if (error) throw error;

      toast.success('Device data wiped successfully');
      onSuccess();
    } catch (error) {
      console.error('Error wiping device data:', error);
      toast.error('Failed to wipe device data');
    } finally {
      setLoading(false);
    }
  };

  const getDialogContent = () => {
    switch (actionType) {
      case 'lock':
        return {
          icon: isLocked ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />,
          title: isLocked ? 'Unlock Device' : 'Lock Device',
          description: isLocked 
            ? 'This will unlock the device and allow access again.'
            : 'This will temporarily lock the device and prevent access.',
          action: handleLockDevice
        };
      case 'remove':
        return {
          icon: <Trash2 className="h-5 w-5" />,
          title: 'Remove Device',
          description: 'This will permanently remove the device from your account. The device will lose access to all conversations and data.',
          action: handleRemoveDevice
        };
      case 'wipe':
        return {
          icon: <RotateCcw className="h-5 w-5" />,
          title: 'Wipe Device Data',
          description: 'This will remove all conversations and messages from this device. Contacts will be preserved.',
          action: handleWipeDevice
        };
      default:
        return null;
    }
  };

  const content = getDialogContent();
  if (!content) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {content.icon}
            {content.title}
          </DialogTitle>
          <DialogDescription>
            Device: {device.device_name || 'Unknown Device'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {content.description}
          </p>

          {actionType === 'lock' && !isLocked && (
            <div className="space-y-3">
              <Label htmlFor="duration">Lock Duration</Label>
              <div className="flex gap-2">
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={lockDuration}
                  onChange={(e) => setLockDuration(e.target.value)}
                  className="flex-1"
                />
                <Select value={lockUnit} onValueChange={setLockUnit}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Min</SelectItem>
                    <SelectItem value="hours">Hrs</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {(actionType === 'remove' || actionType === 'wipe') && (
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <span className="font-mono font-bold">{actionType.toUpperCase()}</span> to confirm
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={actionType.toUpperCase()}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={content.action}
            disabled={loading || (actionType !== 'lock' && confirmText !== actionType.toUpperCase())}
            variant={actionType === 'remove' ? 'destructive' : 'default'}
          >
            {loading ? 'Processing...' : content.title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};