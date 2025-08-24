import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft, Phone, Video, Settings, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { ChatSettingsDrawer } from "./ChatSettingsDrawer";
import { BurnOnReadSelector } from "./BurnOnReadSelector";
import { BurnTimer } from "./BurnTimer";
import { useBurnMessages } from "@/hooks/useBurnMessages";

interface ChatWindowProps {
  conversationId: string;
  conversationName: string;
  conversationAvatar?: string;
  onBack?: () => void;
  className?: string;
}

export const ChatWindow = ({ 
  conversationId, 
  conversationName, 
  conversationAvatar,
  onBack,
  className 
}: ChatWindowProps) => {
  const { user } = useAuth();
  const { messages, loading, sendMessage, deleteMessage } = useMessages(conversationId);
  const { visibleMessages, hideMessageForSender } = useBurnMessages(messages, user?.id);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [burnOnReadDuration, setBurnOnReadDuration] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const success = await sendMessage(newMessage, burnOnReadDuration || undefined);
    if (success) {
      setNewMessage("");
      setBurnOnReadDuration(null); // Clear burn setting after sending
    }
    setSending(false);
  };

  const handleBurnExpire = async (messageId: string, isOwnMessage: boolean) => {
    if (isOwnMessage) {
      // For sender: just hide from view, don't delete from database
      hideMessageForSender(messageId);
    } else {
      // For receiver: delete from database (which removes for everyone)
      await deleteMessage(messageId);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const isExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const expiry = new Date(expiresAt);
    const now = new Date();
    const timeLeft = expiry.getTime() - now.getTime();
    return timeLeft < 5 * 60 * 1000; // Less than 5 minutes
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Chat Header */}
      <div className="p-3 md:p-4 border-b border-border bg-card slide-down">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="touch-feedback md:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversationAvatar} />
            <AvatarFallback>
              {conversationName.split(" ").map(n => n[0]).join("").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm md:text-base truncate">{conversationName}</h2>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
          
          <div className="flex items-center gap-1" role="toolbar" aria-label="Chat actions">
            <Button variant="ghost" size="icon" className="touch-feedback h-8 w-8 md:h-10 md:w-10" aria-label="Audio call">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="touch-feedback h-8 w-8 md:h-10 md:w-10" aria-label="Video call">
              <Video className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSettingsOpen(true)}
              className="touch-feedback h-8 w-8 md:h-10 md:w-10" 
              aria-label="Chat settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center fade-in" aria-live="polite">
            <div>
              <p className="text-muted-foreground mb-2">No messages yet</p>
              <p className="text-sm text-muted-foreground">Start the conversation!</p>
            </div>
          </div>
        ) : (
          visibleMessages.map((message, index) => {
            const isOwn = message.sender_id === user?.id;
            const showAvatar = !isOwn && (index === 0 || visibleMessages[index - 1]?.sender_id !== message.sender_id);
            const isExpiring = isExpiringSoon(message.expires_at);
            
            return (
              <div
                key={message.id}
                className={cn(
                  "flex items-end gap-2 message-bubble",
                  isOwn ? "justify-end" : "justify-start"
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {!isOwn && (
                  <div className="w-8">
                    {showAvatar && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.sender?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {message.sender?.display_name?.[0] || message.sender?.username?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}
                
                <div
                  className={cn(
                    "max-w-[75%] md:max-w-[60%] px-3 py-2 rounded-2xl shadow-sm transition-all duration-200",
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border rounded-bl-md",
                    isExpiring && "ring-2 ring-destructive/50 animate-pulse"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  
                  <div className={cn(
                    "flex items-center gap-1 mt-1 text-xs",
                    isOwn ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
                  )}>
                    <span>{formatMessageTime(message.created_at)}</span>
                    
                    {isOwn && (
                      <span className="ml-1">
                        {message.read_at ? "✓✓" : "✓"}
                      </span>
                    )}
                    
                    {isExpiring && (
                      <span className="text-destructive text-xs ml-1">
                        Expires in {formatDistanceToNow(new Date(message.expires_at!))}
                      </span>
                    )}
                  </div>
                  
                  {/* Burn on Read Timer */}
                  {message.burn_on_read_duration && (
                    (message.burn_on_read_starts_at ? (
                      <BurnTimer
                        startsAt={message.burn_on_read_starts_at}
                        duration={message.burn_on_read_duration}
                        onExpire={() => handleBurnExpire(message.id, isOwn)}
                        isOwnMessage={isOwn}
                        className={isOwn ? "justify-end" : "justify-start"}
                      />
                    ) : message.sender_id === user?.id ? (
                      <div className={cn(
                        "flex items-center gap-1 text-xs mt-1 text-orange-400",
                        isOwn ? "justify-end" : "justify-start"
                      )}>
                        <Flame className="h-3 w-3" />
                        <span>Burns when read</span>
                      </div>
                    ) : null)
                  )}
                </div>
                
                {isOwn && <div className="w-8" />}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-3 md:p-4 border-t border-border bg-card slide-up">
        <div className="flex items-center gap-2">
          <BurnOnReadSelector
            onSelect={setBurnOnReadDuration}
            selectedDuration={burnOnReadDuration}
          />
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="flex-1 min-h-[40px] resize-none"
            aria-label="Message input"
          />
          <Button 
            onClick={handleSendMessage} 
            size="icon" 
            disabled={!newMessage.trim() || sending}
            className="touch-feedback btn-press h-10 w-10 shrink-0"
            aria-label="Send message"
            title="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Settings Drawer */}
      <ChatSettingsDrawer
        conversationId={conversationId}
        isOpen={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
};