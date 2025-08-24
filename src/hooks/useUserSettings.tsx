import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface UserSettings {
  user_id: string;
  message_notifications: boolean;
  call_notifications: boolean;
  group_notifications: boolean;
  read_receipts: boolean;
  disappearing_messages: boolean;
  disappearing_message_duration: number | null;
  link_previews: boolean;
  notification_permission: string;
  theme: string;
  created_at: string;
  updated_at: string;
}

export const useUserSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
        return;
      }

      if (!data) {
        // Create default settings if they don't exist
        await createDefaultSettings();
      } else {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          message_notifications: true,
          call_notifications: true,
          group_notifications: true,
          read_receipts: true,
          disappearing_messages: false,
          disappearing_message_duration: null,
          link_previews: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating default settings:', error);
        return;
      }

      setSettings(data);
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  };

  const updateSetting = async (key: keyof Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'>, value: boolean | string | number | null) => {
    if (!user || !settings) return false;

    const previous = settings;
    // Optimistic update for snappy UI
    setSettings({ ...settings, [key]: value } as UserSettings);

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .update({ [key]: value })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        setSettings(previous);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      setSettings(data);
      return true;
    } catch (error) {
      setSettings(previous);
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    settings,
    loading,
    updateSetting,
    fetchSettings,
  };
};