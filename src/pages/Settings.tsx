import React, { useState } from "react";
import { useCryptoAuth } from "@/hooks/useCryptoAuth";
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
  Key,
  Smartphone,
  Fingerprint
} from "lucide-react";
import { ProfileEditDialog } from "@/components/dialogs/ProfileEditDialog";
import { PhoneNumberDialog } from "@/components/dialogs/PhoneNumberDialog";
import { NotificationSettingsDialog } from "@/components/dialogs/NotificationSettingsDialog";
import { ThemeDialog } from "@/components/dialogs/ThemeDialog";
import { BlockedUsersDialog } from "@/components/dialogs/BlockedUsersDialog";
import { UserSearchDialog } from "@/components/dialogs/UserSearchDialog";
import { CryptoAuthManager } from "@/lib/cryptoAuth";

const Settings = () => {
  const { user, logout } = useCryptoAuth();
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
    logout();
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
      <div className="h-screen flex bg-background page-enter">
        <div className="w-full max-w-2xl mx-auto m-1 md:m-2 rounded-3xl bg-card/90 backdrop-blur-sm shadow-2xl flex flex-col overflow-hidden">
          <AppHeader title="Settings" />
          <div className="p-4 flex-1 overflow-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-muted rounded-lg"></div>
              <div className="h-20 bg-muted rounded-lg"></div>
              <div className="h-20 bg-muted rounded-lg"></div>
            </div>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background page-enter">
      <div className="w-full max-w-2xl mx-auto m-1 md:m-2 rounded-3xl bg-card/90 backdrop-blur-sm shadow-2xl flex flex-col overflow-hidden">
        <AppHeader title="Settings" />
        
        <div className="p-4 space-y-6 flex-1 overflow-auto">
          {/* Cryptographic Identity Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Cryptographic Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Identity Info */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={`https://api.dicebear.com/7.x/shapes/svg?seed=${user?.userId}`} />
                  <AvatarFallback className="text-lg">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium">
                    {user?.username || "Anonymous User"}
                  </h3>
                  <p className="text-xs text-muted-foreground">Device-based Identity</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="default" className="bg-green-500">
                      <Shield className="h-3 w-3 mr-1" />
                      Secured
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Identity Details */}
              <div className="space-y-3">
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Device ID</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {(CryptoAuthManager.getDeviceId() || 'unknown').substring(0, 8)}...
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Authentication</span>
                  </div>
                  <Badge variant="secondary">Cryptographic Keys</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Recovery</span>
                  </div>
                  <Badge variant="outline">Mnemonic Phrase</Badge>
                </div>
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
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <Key className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-400">
                    Signal Protocol Encryption Active
                  </span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Fingerprint className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700 dark:text-blue-400">
                    Device-Based Authentication
                  </span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-purple-700 dark:text-purple-400">
                    End-to-End Encrypted
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
                Clear Identity & Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Keep some dialogs for contacts and theme */}
      <NotificationSettingsDialog open={showNotifications} onOpenChange={setShowNotifications} />
      <ThemeDialog open={showTheme} onOpenChange={setShowTheme} />
      <BlockedUsersDialog open={showBlockedUsers} onOpenChange={setShowBlockedUsers} />
      <UserSearchDialog open={showUserSearch} onOpenChange={setShowUserSearch} />
      
      <BottomNavigation />
    </div>
  );
};

export default Settings;