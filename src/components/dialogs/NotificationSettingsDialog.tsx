import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Separator } from "@/components/ui/separator";

interface NotificationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationSettingsDialog = ({ open, onOpenChange }: NotificationSettingsDialogProps) => {
  const { settings, updateSetting } = useUserSettings();

  if (!settings) return null;

  const handleToggle = async (key: "message_notifications" | "call_notifications" | "group_notifications" | "read_receipts" | "disappearing_messages" | "link_previews", value: boolean) => {
    await updateSetting(key, value);
  };

  const handleDurationChange = async (value: string) => {
    const duration = value === "never" ? null : parseInt(value);
    await updateSetting("disappearing_message_duration", duration);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Notification Settings</DialogTitle>
          <DialogDescription>
            Configure your notification preferences and privacy settings.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Message Notifications */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Message Notifications</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="message-notifications" className="flex-1">
                Message Notifications
              </Label>
              <Switch
                id="message-notifications"
                checked={settings.message_notifications}
                onCheckedChange={(checked) => handleToggle("message_notifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="call-notifications" className="flex-1">
                Call Notifications
              </Label>
              <Switch
                id="call-notifications"
                checked={settings.call_notifications}
                onCheckedChange={(checked) => handleToggle("call_notifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="group-notifications" className="flex-1">
                Group Notifications
              </Label>
              <Switch
                id="group-notifications"
                checked={settings.group_notifications}
                onCheckedChange={(checked) => handleToggle("group_notifications", checked)}
              />
            </div>
          </div>

          <Separator />

          {/* Privacy Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Privacy</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="read-receipts" className="flex-1">
                Read Receipts
              </Label>
              <Switch
                id="read-receipts"
                checked={settings.read_receipts}
                onCheckedChange={(checked) => handleToggle("read_receipts", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="link-previews" className="flex-1">
                Link Previews
              </Label>
              <Switch
                id="link-previews"
                checked={settings.link_previews}
                onCheckedChange={(checked) => handleToggle("link_previews", checked)}
              />
            </div>
          </div>

          <Separator />

          {/* Disappearing Messages */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Disappearing Messages</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="disappearing-messages" className="flex-1">
                Enable Disappearing Messages
              </Label>
              <Switch
                id="disappearing-messages"
                checked={settings.disappearing_messages}
                onCheckedChange={(checked) => handleToggle("disappearing_messages", checked)}
              />
            </div>

            {settings.disappearing_messages && (
              <div className="space-y-2">
                <Label htmlFor="disappearing-duration">Default Duration</Label>
                <Select
                  value={settings.disappearing_message_duration?.toString() || "never"}
                  onValueChange={handleDurationChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="3600">1 hour</SelectItem>
                    <SelectItem value="86400">1 day</SelectItem>
                    <SelectItem value="604800">1 week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};