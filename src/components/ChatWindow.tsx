import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft, Settings, Flame, DollarSign, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useEncryption } from "@/hooks/useEncryption";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { ChatSettingsDrawer } from "./ChatSettingsDrawer";
import { BurnOnReadSelector } from "./BurnOnReadSelector";
import { BurnTimer } from "./BurnTimer";
import { useBurnMessages } from "@/hooks/useBurnMessages";
import { FinancialSheetDrawer } from "./FinancialSheetDrawer";
import { EncryptionStatus } from "./EncryptionStatus";
import type { FinancialEntry } from "@/hooks/useFinancialSheet";

interface ChatWindowProps {
  conversationId: string;
  conversationName: string;
  conversationAvatar?: string;
  onBack?: () => void;
  className?: string;
}

const ChatWindow = ({ 
  conversationId, 
  conversationName, 
  conversationAvatar,
  onBack,
  className 
}: ChatWindowProps) => {
  const { user } = useAuth();
  const { messages, loading, sendMessage, deleteMessage } = useMessages(conversationId);
  const { isReady: encryptionReady, getEncryptionStatus } = useEncryption();
  const { visibleMessages, hideMessageForSender } = useBurnMessages(messages, user?.id);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [financialSheetOpen, setFinancialSheetOpen] = useState(false);
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

  const handleSheetCreated = async () => {
    await sendMessage("📊 created a new financial sheet", undefined, "financial_sheet_created");
  };

  const handleEntryAdded = async (entries: FinancialEntry[]) => {
    const latestEntry = entries[entries.length - 1];
    if (latestEntry) {
      await sendMessage(
        `💰 added ${latestEntry.name} ($${latestEntry.amount.toFixed(2)}) to the financial sheet`,
        undefined,
        "financial_entry_added"
      );
    }
  };

  const handleEntryRemoved = async (removedEntry: FinancialEntry) => {
    await sendMessage(
      `🗑️ removed ${removedEntry.name} ($${removedEntry.amount.toFixed(2)}) from the financial sheet`,
      undefined,
      "financial_entry_removed"
    );
  };

  return (
    <div className={cn("flex flex-col h-full rounded-tl-3xl rounded-bl-3xl p-4 bg-card/90 backdrop-blur-sm", className)}>
      {/* Chat Header */}
      <div className="p-3 md:p-4 rounded-2xl slide-down bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="touch-feedback md:hidden hover:bg-primary/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <Avatar className="h-10 w-10 ring-2 ring-primary/20 shadow-md">
            <AvatarImage src={conversationAvatar} />
            <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
              {conversationName.split(" ").map(n => n[0]).join("").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm md:text-base truncate text-foreground">{conversationName}</h2>
            <div className="flex items-center gap-2">
              <EncryptionStatus 
                showText 
                className="shrink-0"
                loading={!encryptionReady}
                initialized={encryptionReady}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-1" role="toolbar" aria-label="Chat actions">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSettingsOpen(true)}
              className="touch-feedback h-8 w-8 md:h-10 md:w-10 hover:bg-primary/10 hover:text-primary transition-all duration-300" 
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
            <div className="loading-pulse rounded-full h-8 w-8 border-2 border-primary bg-primary/20"></div>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center fade-in" aria-live="polite">
            <div className="glass-card p-8 max-w-sm">
              <p className="text-muted-foreground mb-2 font-medium">No messages yet</p>
              <p className="text-sm text-muted-foreground">Start the conversation!</p>
            </div>
          </div>
        ) : (
          visibleMessages.map((message, index) => {
            const isOwn = message.sender_id === user?.id;
            const showAvatar = !isOwn && (index === 0 || visibleMessages[index - 1]?.sender_id !== message.sender_id);
            const isExpiring = isExpiringSoon(message.expires_at);
            
            // Special rendering for financial notifications
            if (message.message_type === "financial_notification") {
              return (
                <div
                  key={message.id}
                  className="flex justify-center my-4"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="max-w-sm mx-auto bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 shadow-lg backdrop-blur-sm animate-fade-in">
                    <div className="flex items-start gap-2">
                      <div className="relative">
                        <Avatar className="h-7 w-7 border-2 border-amber-300 dark:border-amber-600 shadow-sm">
                          <AvatarImage src={message.sender?.avatar_url} />
                          <AvatarFallback className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-medium">
                            {message.sender?.display_name?.[0] || message.sender?.username?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 bg-amber-400 dark:bg-amber-500 rounded-full p-0.5 shadow-sm">
                          <Banknote className="h-2.5 w-2.5 text-amber-900 dark:text-amber-100" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-amber-900 dark:text-amber-100 truncate">
                            {message.sender?.display_name || message.sender?.username || "Unknown User"}
                          </span>
                          <span className="text-xs text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded-full font-medium">
                            Finance
                          </span>
                        </div>
                        <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                          {message.content}
                        </p>
                        <span className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 block opacity-75">
                          {formatMessageTime(message.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

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
                    "max-w-[75%] md:max-w-[60%] px-3 py-1.5 shadow-sm transition-all duration-300 message-bubble",
                    isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground border border-muted-foreground/10 hover:bg-muted/90",
                    isExpiring && "ring-2 ring-destructive/50 animate-pulse"
                  )}
                  style={{ borderRadius: '1.2rem' }}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  
                  <div className={cn(
                    "flex items-center gap-1 mt-0.5 text-xs text-muted-foreground",
                    isOwn ? "justify-end" : ""
                  )}>
                    <span>{formatMessageTime(message.created_at)}</span>
                    {/* Show read receipt for sent messages */}
                    {isOwn && message.message_type !== "financial_notification" && (
                      <span className="ml-1 text-primary-foreground/90">
                        {message.read_at ? "✓✓" : "✓"}
                      </span>
                    )}
                    
                    {isExpiring && (
                      <span className="text-destructive text-xs ml-1 font-semibold">
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
      <div className="p-2 md:p-3 bg-muted/80 backdrop-blur-xl rounded-full slide-up mb-16 md:mb-0">
        <div className="flex items-center gap-2">
          <BurnOnReadSelector
            onSelect={setBurnOnReadDuration}
            selectedDuration={burnOnReadDuration}
          />
          <div className="relative flex-1">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              className="flex-1 min-h-[40px] resize-none text-sm md:text-base rounded-full border-0 placeholder:text-sm placeholder:font-light flex items-center pr-12 bg-background/80 border border-border/20"
              aria-label="Message input"
            />
            <Button 
              onClick={handleSendMessage} 
              size="icon" 
              disabled={!newMessage.trim() || sending}
              className="btn-neon absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shrink-0"
              aria-label="Send message"
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFinancialSheetOpen(true)}
            className="touch-feedback h-9 w-9 md:h-10 md:w-10 shrink-0 border border-primary/30 hover:border-primary/60 hover:bg-primary/10 rounded-full"
            aria-label="Financial sheet"
            title="Financial sheet"
          >
            <DollarSign className="h-4 w-4 stroke-2" />
          </Button>
        </div>
      </div>

      {/* Financial Sheet Drawer */}
      <FinancialSheetDrawer
        conversationId={conversationId}
        isOpen={financialSheetOpen}
        onOpenChange={setFinancialSheetOpen}
        onSheetCreated={handleSheetCreated}
        onEntryAdded={handleEntryAdded}
        onEntryRemoved={handleEntryRemoved}
        sendMessage={async (content: string, burnOnReadDuration?: number, messageType?: string) => {
          return await sendMessage(content, burnOnReadDuration, messageType);
        }}
      />

      {/* Chat Settings Drawer */}
      <ChatSettingsDrawer
        conversationId={conversationId}
        isOpen={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
};

export { ChatWindow };