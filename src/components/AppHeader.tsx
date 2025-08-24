import React from "react";
import { Settings, UserPlus, LogOut, Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "react-router-dom";

interface AppHeaderProps {
  title: string;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  title, 
  showSearch = false, 
  searchValue = "", 
  onSearchChange 
}) => {
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const getThemeIcon = () => {
    switch (theme) {
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'light':
        return <Sun className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-3 md:p-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <h1 className="text-lg md:text-xl font-semibold">{title}</h1>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 w-10 rounded-full p-0 hover:bg-accent">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url} alt="Profile" />
                <AvatarFallback className="text-sm bg-muted">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover/95 backdrop-blur-sm border shadow-lg">
            <DropdownMenuItem onClick={() => navigate("/contacts")} className="cursor-pointer">
              <UserPlus className="h-4 w-4 mr-3" />
              Add Contact
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
              <Settings className="h-4 w-4 mr-3" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
              className="cursor-pointer"
            >
              {getThemeIcon()}
              <span className="ml-3">
                Theme: {theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default AppHeader;