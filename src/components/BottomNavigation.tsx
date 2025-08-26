import React from "react";
import { MessageCircle, Users, DollarSign } from "lucide-react";
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
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
      <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl p-2">
        <div className="flex justify-around items-center">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={item.isSpecial ? "default" : "ghost"}
              size="lg"
              onClick={() => navigate(item.path)}
              className={`flex items-center justify-center h-12 w-12 touch-feedback transition-all duration-300 ${
                isActive(item.path) && !item.isSpecial
                  ? "text-primary bg-primary/10 scale-105 rounded-2xl"
                  : !item.isSpecial
                  ? "text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-2xl"
                  : ""
              } ${item.isSpecial ? 'rounded-2xl bg-foreground text-background hover:bg-foreground/90 scale-105' : ''}`}
            >
              <item.icon className={`h-6 w-6 ${item.isSpecial ? 'stroke-2' : ''}`} />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BottomNavigation;