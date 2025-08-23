import { useState, useEffect } from "react";
import { useUserSettings } from "./useUserSettings";
import { useToast } from "./use-toast";

export const useNotifications = () => {
  const { settings, updateSetting } = useUserSettings();
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Not supported",
        description: "This browser doesn't support notifications",
        variant: "destructive"
      });
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission === "denied") {
      toast({
        title: "Notifications blocked",
        description: "Please enable notifications in your browser settings",
        variant: "destructive"
      });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === "granted") {
        await updateSetting("message_notifications", true);
        toast({
          title: "Notifications enabled",
          description: "You'll now receive message notifications"
        });
        return true;
      } else {
        await updateSetting("message_notifications", false);
        toast({
          title: "Notifications disabled",
          description: "Notification permission was denied",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request notification permission",
        variant: "destructive"
      });
      return false;
    }
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (Notification.permission === "granted" && settings?.message_notifications) {
      new Notification(title, options);
    }
  };

  return {
    permission,
    requestNotificationPermission,
    showNotification,
    isSupported: 'Notification' in window
  };
};