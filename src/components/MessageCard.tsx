import React, { useState, useEffect } from "react";
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
  recentMessages?: string[];
}

export const MessageCard: React.FC<MessageCardProps> = ({
  id,
  name,
  avatarUrl,
  lastMessage,
  lastMessageTime,
  selected,
  onClick,
  recentMessages = [],
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const messagesToShow = recentMessages.length > 0 ? recentMessages : [lastMessage || "No messages yet"];

  // Rotate through recent messages every 3 seconds
  useEffect(() => {
    if (messagesToShow.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messagesToShow.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [messagesToShow.length]);

  const displayMessage = messagesToShow[currentMessageIndex];
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 md:p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-all duration-200 touch-feedback",
        selected && "bg-muted"
      )}
      role="button"
      aria-label={`Open chat with ${name}`}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 md:h-12 md:w-12">
          <AvatarImage src={avatarUrl} alt={`${name} avatar`} />
          <AvatarFallback>{name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium truncate text-sm md:text-base">{name}</h3>
            {lastMessageTime && (
              <span className="text-xs text-muted-foreground">{lastMessageTime}</span>
            )}
          </div>
          <p className="text-xs md:text-sm text-muted-foreground truncate">
            {displayMessage}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageCard;
