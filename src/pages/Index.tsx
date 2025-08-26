import { useState, useRef, useEffect } from "react";
import { MessageCircle, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { useConversations } from "@/hooks/useConversations";
import BottomNavigation from "@/components/BottomNavigation";
import AppHeader from "@/components/AppHeader";
import { ChatWindow } from "@/components/ChatWindow";
import { formatDistanceToNow } from "date-fns";
import MessageCard from "@/components/MessageCard";


const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { conversations, loading, pendingSentRequests } = useConversations();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle mobile responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle navigation state from Contacts page to open chat
  useEffect(() => {
    // Prefer React Router state; fallback to history state for safety
    const routerState: any = (location.state as any) || (window.history.state && (window.history.state as any).usr);
    console.log('Index: nav state check -> location.state =', location.state, '; history.usr =', window.history.state && (window.history.state as any).usr);
    if (!routerState) return;

    if (routerState?.newConversation?.id) {
      console.log('Index: selecting chat by newConversation.id =', routerState.newConversation.id);
      setSelectedChat(routerState.newConversation.id);
      // Clear state so we don't reopen on refresh
      navigate('.', { replace: true, state: null });
      return;
    }

    if (routerState?.selectedContact?.id && user) {
      const contactId = routerState.selectedContact.id as string;
      const conv = conversations.find(c =>
        (c.participant_one === user.id && c.participant_two === contactId) ||
        (c.participant_two === user.id && c.participant_one === contactId)
      );
      console.log('Index: lookup by selectedContact.id =', contactId, '; found conversation =', conv?.id);
      if (conv) {
        setSelectedChat(conv.id);
        navigate('.', { replace: true, state: null });
      }
    }
  }, [conversations, user, location.state, navigate]);

  const getLastMessageTime = (conversation: any) => {
    if (!conversation.last_message_at) return "";
    
    try {
      const messageTime = new Date(conversation.last_message_at);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));
      
      if (diffMinutes < 1) return "now";
      if (diffMinutes < 60) return `${diffMinutes}m`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d`;
      
      return formatDistanceToNow(messageTime, { addSuffix: false });
    } catch {
      return "";
    }
  };

  // Combine accepted conversations with pending sent requests for display
  const allConversations = [...conversations, ...pendingSentRequests];
  
  const selectedConversation = allConversations.find(c => c.id === selectedChat);

  const filteredConversations = allConversations.filter(conv =>
    conv.otherParticipant?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherParticipant?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startNewChat = () => {
    navigate("/contacts");
  };
  return (
    <div className="h-screen flex bg-background page-enter">
      {/* Sidebar - Hidden on mobile when chat is selected */}
      <div className={`w-full md:w-80 m-1 md:m-2 rounded-3xl bg-card/90 backdrop-blur-sm border border-border/20 shadow-2xl flex flex-col overflow-hidden ${
        isMobile && selectedChat ? 'hidden' : 'flex'
      }`} aria-label="Chats list">
        {/* Header */}
        <AppHeader title="Whispr" />
        
        {/* Search */}
        <div className="p-3 md:p-4 border-b border-border/20">
          <div className="relative" role="search" aria-label="Search conversations">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 md:h-10 border-0 font-light bg-blue-50/50 dark:bg-blue-950/30"
              aria-label="Search conversations"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto relative">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-muted-foreground">Loading conversations...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 md:p-8 text-center fade-in" aria-live="polite">
              <MessageCircle className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2 text-sm md:text-base">No conversations yet</h3>
              <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">Start chatting with your contacts</p>
              <Button onClick={startNewChat} size="sm" className="touch-feedback" aria-label="Start new chat">
                <Plus className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          ) : (
            filteredConversations.map((conversation, index) => (
              <MessageCard
                key={conversation.id}
                id={conversation.id}
                name={
                  conversation.otherParticipant?.display_name ||
                  conversation.otherParticipant?.username ||
                  "Unknown User"
                }
                avatarUrl={conversation.otherParticipant?.avatar_url}
                lastMessage={conversation.last_message}
                lastMessageTime={getLastMessageTime(conversation)}
                selected={selectedChat === conversation.id}
                onClick={() => setSelectedChat(conversation.id)}
                isUnread={conversation.is_unread}
              />
            ))
          )}
          
          {/* Floating New Chat Button */}
          {filteredConversations.length > 0 && (
            <Button
              onClick={startNewChat}
              size="icon" 
              className="fixed bottom-6 md:bottom-6 left-3 md:left-4 z-40 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 touch-feedback shadow-lg"
              aria-label="Start new chat"
            >
              <Plus className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col ${
        isMobile && !selectedChat ? 'hidden' : 'flex'
      }`}>
        {selectedChat ? (
          <ChatWindow
            conversationId={selectedChat}
            conversationName={
              selectedConversation?.otherParticipant?.display_name || 
              selectedConversation?.otherParticipant?.username || 
              'New chat'
            }
            conversationAvatar={selectedConversation?.otherParticipant?.avatar_url}
            onBack={isMobile ? () => setSelectedChat(null) : undefined}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-4" aria-live="polite">
            <div className="text-center fade-in">
              <MessageCircle className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 md:mb-4 text-muted-foreground" />
              <h2 className="text-lg md:text-xl font-semibold mb-2">Welcome to Whispr</h2>
              <p className="text-sm md:text-base text-muted-foreground">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default Index;
