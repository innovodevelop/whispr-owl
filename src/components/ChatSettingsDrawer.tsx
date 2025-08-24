import React, { useState, useEffect } from "react";
import { Settings, X, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ChatSettingsDrawerProps {
  conversationId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ConversationSettings {
  disappearing_enabled: boolean;
  disappearing_duration: number | null; // minutes
}

const DISAPPEARING_OPTIONS = [
  { value: null, label: "Do not disappear" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 360, label: "6 hours" },
  { value: 1440, label: "1 day" },
  { value: 2880, label: "2 days" },
];

export const ChatSettingsDrawer: React.FC<ChatSettingsDrawerProps> = ({
  conversationId,
  isOpen,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ConversationSettings>({
    disappearing_enabled: false,
    disappearing_duration: null,
  });

  useEffect(() => {
    if (isOpen && conversationId) {
      fetchConversationSettings();
    }
  }, [isOpen, conversationId]);

  const fetchConversationSettings = async () => {
    if (!user || !conversationId) return;

    try {
      // For now, use localStorage until types are updated
      const key = `chat_settings_${conversationId}_${user.id}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(parsed);
      }
    } catch (error) {
      console.error('Error fetching conversation settings:', error);
    }
  };

  const updateConversationSettings = async (newSettings: Partial<ConversationSettings>) => {
    if (!user || !conversationId) return;

    setLoading(true);
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      // Store in localStorage for now
      const key = `chat_settings_${conversationId}_${user.id}`;
      localStorage.setItem(key, JSON.stringify(updatedSettings));

      setSettings(updatedSettings);
      toast({
        title: "Settings updated",
        description: "Chat settings have been saved",
      });
    } catch (error) {
      console.error('Error updating conversation settings:', error);
      toast({
        title: "Error",
        description: "Failed to update chat settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisappearingToggle = (enabled: boolean) => {
    updateConversationSettings({
      disappearing_enabled: enabled,
      disappearing_duration: enabled ? (settings.disappearing_duration || 60) : null,
    });
  };

  const handleDurationChange = (value: string) => {
    const duration = value === "null" ? null : parseInt(value);
    updateConversationSettings({
      disappearing_duration: duration,
      disappearing_enabled: duration !== null,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat Settings
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-6">
          {/* Disappearing Messages */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Disappearing Messages
              </CardTitle>
              <CardDescription className="text-sm">
                Messages will automatically disappear after the set time for this chat only
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="disappearing-toggle" className="text-sm font-medium">
                  Enable disappearing messages
                </Label>
                <Switch
                  id="disappearing-toggle"
                  checked={settings.disappearing_enabled}
                  onCheckedChange={handleDisappearingToggle}
                  disabled={loading}
                />
              </div>

              {settings.disappearing_enabled && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Message duration</Label>
                  <Select
                    value={settings.disappearing_duration?.toString() || "null"}
                    onValueChange={handleDurationChange}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISAPPEARING_OPTIONS.map((option) => (
                        <SelectItem
                          key={option.value?.toString() || "null"}
                          value={option.value?.toString() || "null"}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    New messages will disappear after {" "}
                    {DISAPPEARING_OPTIONS.find(opt => 
                      opt.value?.toString() === settings.disappearing_duration?.toString()
                    )?.label.toLowerCase() || "the selected time"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Future settings can be added here */}
          <Card className="opacity-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">More Settings</CardTitle>
              <CardDescription className="text-sm">
                Additional chat settings coming soon
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ChatSettingsDrawer;