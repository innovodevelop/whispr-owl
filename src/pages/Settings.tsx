import React, { useState } from "react";
import { useCryptoAuth } from "@/hooks/useCryptoAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "react-router-dom";
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
import { AutoDisplayNameSettings } from "@/components/AutoDisplayNameSettings";
import { CryptoAuthManager } from "@/lib/cryptoAuth";

const Settings = () => {
  const { user, logout } = useCryptoAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { settings } = useUserSettings();
  const { theme } = useTheme();
  const navigate = useNavigate();
  
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
      <div className="min-h-screen flex flex-col bg-background page-enter">
        <AppHeader title="Settings" />
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            <div className="animate-pulse space-y-6">
              <div className="h-32 bg-muted rounded-lg"></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64 bg-muted rounded-lg"></div>
                <div className="h-64 bg-muted rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background page-enter">
      <AppHeader title="Settings" />
      
      <div className="flex-1 overflow-auto">
        {/* User Profile Header */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 border-b border-border">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
                <AvatarImage src={`https://api.dicebear.com/7.x/shapes/svg?seed=${user?.userId}`} />
                <AvatarFallback className="text-2xl font-semibold">
                  {user?.username?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">
                  {user?.username || "Anonymous User"}
                </h2>
                <p className="text-muted-foreground">Device-based Identity</p>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="default" className="bg-green-500">
                    <Shield className="h-3 w-3 mr-1" />
                    Secured
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    {(CryptoAuthManager.getDeviceId() || 'unknown').substring(0, 8)}...
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="max-w-4xl mx-auto p-6 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Identity & Security Column */}
            <div className="space-y-6">
              {/* Cryptographic Identity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Identity Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Device ID</span>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {(CryptoAuthManager.getDeviceId() || 'unknown').substring(0, 12)}...
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
                </CardContent>
              </Card>

              {/* Security Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <Key className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">
                          Signal Protocol Encryption
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-500">Active</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <Fingerprint className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                          Device Authentication
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-500">Enabled</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                      <Shield className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-400">
                          End-to-End Encryption
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-500">Active</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Settings & Preferences Column */}
            <div className="space-y-6">
              {/* Contacts */}
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

              {/* Privacy & Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Privacy & Notifications
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
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-between"
                    onClick={() => navigate('/settings/devices')}
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Device Management
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
            </div>
          </div>

          {/* Auto Display Name Settings - Full Width */}
          <div className="mt-8">
            <AutoDisplayNameSettings />
          </div>

          {/* Sign Out Section - Full Width */}
          <div className="mt-8">
            <Card>
              <CardContent className="pt-6">
                <Button
                  variant="destructive"
                  className="w-full max-w-md mx-auto block"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Clear Identity & Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>
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