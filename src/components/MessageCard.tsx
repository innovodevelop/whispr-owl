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
  isUnread?: boolean;
}

export const MessageCard: React.FC<MessageCardProps> = ({
  id,
  name,
  avatarUrl,
  lastMessage,
  lastMessageTime,
  selected,
  onClick,
  isUnread = false,
}) => {
  return (
    <div className="mx-2 mt-2">
      <div
        onClick={onClick}
        className={cn(
          "group relative p-4 bg-card hover:bg-muted cursor-pointer transition-colors duration-200 hover:rounded-3xl",
          (selected || isUnread) && "bg-accent/30 rounded-3xl"
        )}
        role="button"
        aria-label={`Open chat with ${name}`}
      >
      <div className="flex items-start gap-4">
        <div className="relative">
          <Avatar className="h-12 w-12 ring-1 ring-border/50 group-hover:ring-primary/30 transition-all duration-200">
            <AvatarImage src={avatarUrl} alt={`${name} avatar`} />
            <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
              {name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn(
              "font-semibold text-sm text-foreground truncate transition-colors duration-200",
              isUnread && "font-bold"
            )}>
              {name}
            </h3>
            {lastMessageTime && (
              <span className={cn(
                "text-xs font-medium shrink-0 mt-0.5",
                isUnread ? "text-primary" : "text-muted-foreground"
              )}>
                {lastMessageTime}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-sm truncate flex-1",
              isUnread ? "text-foreground font-medium" : "text-muted-foreground",
              !lastMessage && "italic"
            )}>
              {lastMessage || "Start a conversation..."}
            </p>
            {lastMessage && isUnread && (
              <div className="w-2 h-2 bg-primary rounded-full shrink-0 animate-pulse"></div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default MessageCard;
