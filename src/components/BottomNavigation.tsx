import React from "react";
import { MessageCircle, Users, Settings, DollarSign } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: MessageCircle, label: "Chats", path: "/" },
    { icon: Users, label: "Contacts", path: "/contacts" },
    { 
      icon: DollarSign, 
      label: "Financial", 
      path: "/financial",
      isSpecial: true // Add special styling for financial icon
    },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border/50 z-50">
      <div className="flex justify-around items-center py-4 px-2">
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            size="sm"
            onClick={() => navigate(item.path)}
            className={`flex items-center justify-center h-12 w-12 rounded-xl touch-feedback transition-all duration-300 ${
              isActive(item.path) 
                ? "text-primary bg-primary/10 shadow-lg scale-110" 
                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            } ${item.isSpecial ? 'border-2 border-primary/30 hover:border-primary/60' : ''}`}
          >
            <item.icon className={`h-6 w-6 ${item.isSpecial ? 'stroke-2' : ''}`} />
          </Button>
        ))}
      </div>
    </div>
  );
};

export default BottomNavigation;