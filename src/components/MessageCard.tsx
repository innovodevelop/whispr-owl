import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MessageCardProps {
  id: string;
  name: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  selected?: boolean;
  onClick?: () => void;
  
}

export const MessageCard: React.FC<MessageCardProps> = ({
  id,
  name,
  avatarUrl,
  lastMessage,
  lastMessageTime,
  selected,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-4 border border-border/50 rounded-2xl bg-card hover:bg-accent/50 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-sm",
        selected && "bg-accent border-primary/30 shadow-sm"
      )}
      role="button"
      aria-label={`Open chat with ${name}`}
    >
      <div className="flex items-start gap-4">
        <div className="relative">
          <Avatar className="h-14 w-14 ring-2 ring-border group-hover:ring-primary/20 transition-all duration-300">
            <AvatarImage src={avatarUrl} alt={`${name} avatar`} />
            <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold text-lg">
              {name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator placeholder */}
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-card opacity-80"></div>
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base text-foreground truncate group-hover:text-primary transition-colors duration-200">
              {name}
            </h3>
            {lastMessageTime && (
              <span className="text-xs text-muted-foreground font-medium shrink-0 mt-1">
                {lastMessageTime}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground truncate flex-1">
              {lastMessage || "Start a conversation..."}
            </p>
            {lastMessage && (
              <div className="w-2 h-2 bg-primary rounded-full opacity-60 shrink-0"></div>
            )}
          </div>
        </div>
      </div>
      
      {/* Subtle hover border effect */}
      <div className="absolute inset-0 rounded-2xl border border-primary/0 group-hover:border-primary/10 transition-all duration-300 pointer-events-none"></div>
    </div>
  );
};

export default MessageCard;
