import { useState, useRef, useEffect } from "react";
import { MessageCircle, Users, Settings, Search, Plus, LogOut, UserPlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
  sender?: string;
}

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  isGroup?: boolean;
  participants?: string[];
}

const Index = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [chatId: string]: Message[] }>({});
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle new conversation from contacts page
  useEffect(() => {
    const state = window.history.state?.usr;
    if (state?.newConversation) {
      const newConv = state.newConversation;
      setConversations(prev => {
        const exists = prev.find(c => c.id === newConv.id);
        if (!exists) {
          return [...prev, newConv];
        }
        return prev;
      });
      setSelectedChat(newConv.id);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChat]);

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return;

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage,
      timestamp: new Date(),
      isOwn: true,
      sender: user?.email || "You"
    };

    setMessages(prev => ({
      ...prev,
      [selectedChat]: [...(prev[selectedChat] || []), message]
    }));

    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getLastMessage = (chatId: string) => {
    const chatMessages = messages[chatId] || [];
    const lastMessage = chatMessages[chatMessages.length - 1];
    return lastMessage ? lastMessage.content : "No messages yet";
  };

  const getLastMessageTime = (chatId: string) => {
    const chatMessages = messages[chatId] || [];
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (!lastMessage) return "";
    
    const now = new Date();
    const messageTime = lastMessage.timestamp;
    const diffMs = now.getTime() - messageTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return "now";
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`;
    return `${Math.floor(diffMinutes / 1440)}d`;
  };

  const selectedConversation = conversations.find(c => c.id === selectedChat);

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startNewChat = () => {
    navigate("/contacts");
  };

  return (
    <div className="h-screen flex bg-background page-enter">
      {/* Sidebar - Mobile First Responsive */}
      <div className="w-full md:w-80 border-r border-border flex flex-col md:flex-none">
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-border slide-down">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h1 className="text-lg md:text-xl font-semibold">Signal</h1>
            <div className="flex items-center gap-1 md:gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")} className="touch-feedback h-8 w-8 md:h-10 md:w-10">
                <UserPlus className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={startNewChat} className="touch-feedback h-8 w-8 md:h-10 md:w-10">
                <Plus className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="touch-feedback h-8 w-8 md:h-10 md:w-10">
                <Settings className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut} className="touch-feedback h-8 w-8 md:h-10 md:w-10">
                <LogOut className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 md:h-10"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-6 md:p-8 text-center fade-in">
              <MessageCircle className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2 text-sm md:text-base">No conversations yet</h3>
              <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">Start chatting with your contacts</p>
              <Button onClick={startNewChat} size="sm" className="touch-feedback">
                <Plus className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          ) : (
            filteredConversations.map((conversation, index) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedChat(conversation.id)}
                className={`p-3 md:p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-all duration-200 touch-feedback stagger-item ${
                  selectedChat === conversation.id ? "bg-muted" : ""
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 md:h-12 md:w-12">
                    <AvatarImage src={conversation.avatar} />
                    <AvatarFallback>
                      {conversation.isGroup ? (
                        <Users className="h-4 w-4 md:h-6 md:w-6" />
                      ) : (
                        conversation.name.split(" ").map(n => n[0]).join("")
                      )}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate text-sm md:text-base">{conversation.name}</h3>
                      <span className="text-xs text-muted-foreground">{getLastMessageTime(conversation.id)}</span>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">{getLastMessage(conversation.id)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area - Hidden on mobile when no chat selected */}
      <div className={`flex-1 flex flex-col ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-3 md:p-4 border-b border-border slide-down">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 md:h-10 md:w-10">
                  <AvatarImage src={selectedConversation?.avatar} />
                  <AvatarFallback>
                    {selectedConversation?.isGroup ? (
                      <Users className="h-4 w-4 md:h-6 md:w-6" />
                    ) : (
                      selectedConversation?.name.split(" ").map(n => n[0]).join("")
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold text-sm md:text-base">{selectedConversation?.name}</h2>
                  <p className="text-xs md:text-sm text-muted-foreground">Online</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
              {(messages[selectedChat] || []).map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.isOwn ? "justify-end" : "justify-start"} message-bubble`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[70%] p-2 md:p-3 rounded-2xl shadow-sm ${
                      message.isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-3 md:p-4 border-t border-border slide-up">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 h-9 md:h-10"
                />
                <Button onClick={sendMessage} size="icon" disabled={!newMessage.trim()} className="touch-feedback btn-press h-9 w-9 md:h-10 md:w-10">
                  <Send className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center fade-in">
              <MessageCircle className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 md:mb-4 text-muted-foreground" />
              <h2 className="text-lg md:text-xl font-semibold mb-2">Welcome to Signal</h2>
              <p className="text-sm md:text-base text-muted-foreground">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
