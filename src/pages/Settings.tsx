import { useState, useEffect } from "react";
import { ArrowLeft, User, Lock, Bell, Palette, Shield, HelpCircle, LogOut, Camera, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { user, signOut } = useAuth();
  const { profile, updateProfile, checkUsernameAvailable } = useProfile();
  const { settings, updateSetting } = useUserSettings();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  
  // Form states
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || user?.email || "");
      setBio(profile.bio || "");
      setUsername(profile.username || "");
    }
  }, [profile, user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const saveProfile = async () => {
    const success = await updateProfile({
      display_name: displayName,
      bio: bio,
    });

    if (success) {
      setIsEditingProfile(false);
    }
  };

  const saveUsername = async () => {
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Username cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (usernameAvailable === false) {
      toast({
        title: "Error",
        description: "Username is not available",
        variant: "destructive",
      });
      return;
    }

    const success = await updateProfile({
      username: username.trim(),
    });

    if (success) {
      setIsEditingUsername(false);
    }
  };

  const checkUsername = async (newUsername: string) => {
    if (!newUsername.trim() || newUsername === profile?.username) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    const available = await checkUsernameAvailable(newUsername.trim());
    setUsernameAvailable(available);
    setCheckingUsername(false);
  };

  const handleToggleSetting = async (key: string, value: boolean) => {
    await updateSetting(key as any, value);
  };

  const settingsSections = [
    {
      title: "Account",
      icon: User,
      items: [
        { name: "Profile", description: "Update your profile information", action: () => setIsEditingProfile(true) },
        { name: "Phone Number", description: user?.phone || "Add phone number", action: () => {} },
        { name: "Username", description: profile?.username || "Set a unique username", action: () => setIsEditingUsername(true) },
      ]
    },
    {
      title: "Privacy & Security",
      icon: Lock,
      items: [
        { name: "Two-Factor Authentication", description: "Add an extra layer of security", action: () => {} },
        { name: "Blocked Users", description: "Manage blocked contacts", action: () => {} },
        { name: "Privacy Settings", description: "Control who can see your information", action: () => {} },
      ]
    },
    {
      title: "Notifications",
      icon: Bell,
      items: [
        { name: "Message Notifications", description: "Get notified of new messages", toggle: settings?.message_notifications || false, onToggle: (value: boolean) => handleToggleSetting('message_notifications', value) },
        { name: "Call Notifications", description: "Get notified of incoming calls", toggle: settings?.call_notifications || false, onToggle: (value: boolean) => handleToggleSetting('call_notifications', value) },
        { name: "Group Notifications", description: "Notifications for group messages", toggle: settings?.group_notifications || false, onToggle: (value: boolean) => handleToggleSetting('group_notifications', value) },
      ]
    },
    {
      title: "Messaging",
      icon: Shield,
      items: [
        { name: "Read Receipts", description: "Let others know when you've read their messages", toggle: settings?.read_receipts || false, onToggle: (value: boolean) => handleToggleSetting('read_receipts', value) },
        { name: "Disappearing Messages", description: "Messages disappear after a set time", toggle: settings?.disappearing_messages || false, onToggle: (value: boolean) => handleToggleSetting('disappearing_messages', value) },
        { name: "Link Previews", description: "Show previews for shared links", toggle: settings?.link_previews || false, onToggle: (value: boolean) => handleToggleSetting('link_previews', value) },
      ]
    },
    {
      title: "Appearance",
      icon: Palette,
      items: [
        { name: "Theme", description: "Choose your preferred theme", action: () => {} },
        { name: "Chat Wallpaper", description: "Customize your chat background", action: () => {} },
        { name: "Font Size", description: "Adjust text size", action: () => {} },
      ]
    },
    {
      title: "Help & Support",
      icon: HelpCircle,
      items: [
        { name: "Help Center", description: "Get help and support", action: () => {} },
        { name: "Contact Support", description: "Report issues or get assistance", action: () => {} },
        { name: "About Signal", description: "App version and information", action: () => {} },
      ]
    },
  ];

  if (isEditingUsername) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setIsEditingUsername(false)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">Edit Username</h1>
            </div>
            <Button onClick={saveUsername} disabled={usernameAvailable === false || checkingUsername}>
              Save
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-md mx-auto space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        checkUsername(e.target.value);
                      }}
                      placeholder="Enter your username"
                      className="pr-10"
                    />
                    {checkingUsername && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      </div>
                    )}
                    {!checkingUsername && usernameAvailable !== null && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {usernameAvailable ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {usernameAvailable === false && (
                    <p className="text-sm text-red-500 mt-1">Username is not available</p>
                  )}
                  {usernameAvailable === true && (
                    <p className="text-sm text-green-500 mt-1">Username is available</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    This is how others can find and message you
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (isEditingProfile) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setIsEditingProfile(false)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">Edit Profile</h1>
            </div>
            <Button onClick={saveProfile}>Save</Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-md mx-auto space-y-6">
            {/* Profile Picture */}
            <div className="text-center">
              <div className="relative inline-block">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-2xl">
                    {displayName.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-2 -right-2 rounded-full h-8 w-8"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Profile Info */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Input
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Add a bio (optional)"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Profile Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="" />
              <AvatarFallback className="text-xl">
                {user?.email?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{profile?.display_name || user?.email}</h2>
              <p className="text-sm text-muted-foreground">{profile?.username ? `@${profile.username}` : "No username set"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsEditingProfile(true)}>
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="p-4 space-y-6">
          {settingsSections.map((section) => (
            <Card key={section.title}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <section.icon className="h-5 w-5" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.items.map((item) => (
                  <div key={item.name} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    {item.toggle !== undefined ? (
                      <Switch
                        checked={item.toggle}
                        onCheckedChange={item.onToggle}
                      />
                    ) : (
                      <Button variant="ghost" size="sm" onClick={item.action}>
                        Configure
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {/* Sign Out */}
          <Card className="border-destructive/20">
            <CardContent className="p-4">
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-3" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;