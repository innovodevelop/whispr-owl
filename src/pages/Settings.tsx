import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import BottomNavigation from "@/components/BottomNavigation";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background page-enter">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <AppHeader title="Settings" />
        
        {/* Content */}
        <div className="p-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Profile settings will be available in the avatar menu.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bottom spacing for mobile navigation */}
        <div className="md:hidden h-20"></div>

        {/* Mobile Bottom Navigation */}
        <BottomNavigation />
      </div>
    </div>
  );
};

export default Settings;