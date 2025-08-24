import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useTheme } from "@/hooks/useTheme";
import BottomNavigation from "@/components/BottomNavigation";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Phone, 
  Bell, 
  Shield, 
  Palette, 
  UserX, 
  UserPlus,
  ChevronRight,
  LogOut,
  Key
} from "lucide-react";
import { ProfileEditDialog } from "@/components/dialogs/ProfileEditDialog";
import { PhoneNumberDialog } from "@/components/dialogs/PhoneNumberDialog";
import { NotificationSettingsDialog } from "@/components/dialogs/NotificationSettingsDialog";
import { ThemeDialog } from "@/components/dialogs/ThemeDialog";
import { BlockedUsersDialog } from "@/components/dialogs/BlockedUsersDialog";
import { UserSearchDialog } from "@/components/dialogs/UserSearchDialog";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { settings } = useUserSettings();
  const { theme } = useTheme();
  
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showPhoneEdit, setShowPhoneEdit] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'dark': return 'Dark';
      case 'light': return 'Light';
      case 'system': return 'System';
      default: return 'System';
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background page-enter">
        <div className="max-w-2xl mx-auto">
          <AppHeader title="Settings" />
          <div className="p-4">
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-muted rounded-lg"></div>
              <div className="h-20 bg-muted rounded-lg"></div>
              <div className="h-20 bg-muted rounded-lg"></div>
            </div>
          </div>
          <div className="md:hidden h-20"></div>
          <BottomNavigation />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background page-enter">
      <div className="max-w-2xl mx-auto">
        <AppHeader title="Settings" />
        
        <div className="p-4 space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile Info */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="text-lg">
                    {profile?.display_name?.charAt(0) || profile?.username?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium">
                    {profile?.display_name || profile?.username || "No name set"}
                  </h3>
                  {profile?.username && profile?.display_name && (
                    <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  {profile?.bio && (
                    <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProfileEdit(true)}
                >
                  Edit
                </Button>
              </div>

              {/* Profile Actions */}
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-between"
                  onClick={() => setShowPhoneEdit(true)}
                >
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contacts Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => setShowUserSearch(true)}
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Contact
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => setShowBlockedUsers(true)}
              >
                <div className="flex items-center gap-2">
                  <UserX className="h-4 w-4" />
                  Blocked Users
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Notifications & Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => setShowNotifications(true)}
              >
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notification Settings
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>

              {/* Quick Settings */}
              {settings && (
                <div className="space-y-3">
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Label htmlFor="read-receipts-quick" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Read Receipts
                    </Label>
                    <Switch
                      id="read-receipts-quick"
                      checked={settings.read_receipts}
                      disabled
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="disappearing-quick" className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Disappearing Messages
                    </Label>
                    <Switch
                      id="disappearing-quick"
                      checked={settings.disappearing_messages}
                      disabled
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* App Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                App Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => setShowTheme(true)}
              >
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Theme
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{getThemeLabel()}</Badge>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded bg-green-50 dark:bg-green-900/20">
                  <Key className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-400">
                    Signal Protocol Encryption Active
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Card>
            <CardContent className="pt-6">
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:hidden h-20"></div>
        <BottomNavigation />
      </div>

      {/* Dialogs */}
      <ProfileEditDialog open={showProfileEdit} onOpenChange={setShowProfileEdit} />
      <PhoneNumberDialog open={showPhoneEdit} onOpenChange={setShowPhoneEdit} />
      <NotificationSettingsDialog open={showNotifications} onOpenChange={setShowNotifications} />
      <ThemeDialog open={showTheme} onOpenChange={setShowTheme} />
      <BlockedUsersDialog open={showBlockedUsers} onOpenChange={setShowBlockedUsers} />
      <UserSearchDialog open={showUserSearch} onOpenChange={setShowUserSearch} />
    </div>
  );
};

export default Settings;