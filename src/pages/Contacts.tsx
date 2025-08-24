import React from "react";
import { useNavigate } from "react-router-dom";
import BottomNavigation from "@/components/BottomNavigation";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Contacts = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-background page-enter">
      {/* Header */}
      <AppHeader title="Contacts" />
      
      {/* Content */}
      <div className="p-4 flex-1">
        <Card>
          <CardHeader>
            <CardTitle>Contact Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Contact features will be available here.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom spacing for mobile navigation */}
      <div className="md:hidden h-20"></div>
      
      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default Contacts;