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
        "p-3 md:p-4 glass-card hover:neon-card cursor-pointer transition-all duration-300 touch-feedback interactive-glow",
        selected && "neon-card scale-[1.02]"
      )}
      role="button"
      aria-label={`Open chat with ${name}`}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 md:h-12 md:w-12 ring-2 ring-primary/20">
          <AvatarImage src={avatarUrl} alt={`${name} avatar`} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground font-medium">
            {name?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold truncate text-sm md:text-base text-foreground">{name}</h3>
            {lastMessageTime && (
              <span className="text-xs text-muted-foreground font-medium">{lastMessageTime}</span>
            )}
          </div>
          <p className="text-xs md:text-sm text-muted-foreground truncate">
            {lastMessage || "No messages yet"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageCard;
