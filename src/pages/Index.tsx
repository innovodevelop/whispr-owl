import { useState, useRef, useEffect } from "react";
import { MessageCircle, Search, Plus, ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCryptoAuth } from "@/hooks/useCryptoAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { useConversations } from "@/hooks/useConversations";
import { useContacts } from "@/hooks/useContacts";
import { useRateLimit } from "@/hooks/useRateLimit";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNavigation from "@/components/BottomNavigation";
import AppHeader from "@/components/AppHeader";
import { ChatWindow } from "@/components/ChatWindow";
import { formatDistanceToNow } from "date-fns";
import MessageCard from "@/components/MessageCard";


interface SearchResult {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

const Index = () => {
  const { user } = useCryptoAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { conversations, loading, pendingSentRequests } = useConversations();
  const { addContact } = useContacts();
  const { checkRateLimit } = useRateLimit({ maxAttempts: 10, windowMs: 60000 }); // 10 searches per minute
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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
        (c.participant_one === user.userId && c.participant_two === contactId) ||
        (c.participant_two === user.userId && c.participant_one === contactId)
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

  // Search users function
  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    if (!checkRateLimit()) {
      toast.error("Rate limit exceeded. Please wait a moment before searching again.");
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_users_by_query_secure', {
        search_term: searchTerm.trim()
      });

      if (error) {
        console.error('Error searching users:', error);
        toast.error("Failed to search users");
        return;
      }

      setSearchResults(data || []);
    } catch (error) {
      console.error('Error in searchUsers:', error);
      toast.error("Failed to search users");
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce user search
  useEffect(() => {
    if (!isSearchMode) return;
    
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isSearchMode]);

  // Handle adding contact and starting conversation
  const handleAddContact = async (contactUserId: string) => {
    try {
      const success = await addContact(contactUserId);
      if (success) {
        toast.success("Contact added successfully!");
        setIsSearchMode(false);
        setSearchQuery("");
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error("Failed to add contact");
    }
  };

  const startNewChat = () => {
    setIsSearchMode(true);
    setSearchQuery("");
  };

  const exitSearchMode = () => {
    setIsSearchMode(false);
    setSearchQuery("");
    setSearchResults([]);
  };
  
  return (
    <div className="h-screen flex bg-background page-enter">
      {/* Sidebar - Hidden on mobile when chat is selected */}
      <div className={`w-full md:w-80 lg:w-96 m-1 md:m-2 rounded-3xl bg-card/90 backdrop-blur-sm border border-border/20 shadow-2xl flex flex-col overflow-hidden ${
        isMobile && selectedChat ? 'hidden' : 'flex'
      }`} aria-label="Chats list">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          {isSearchMode ? (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={exitSearchMode}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold">Find Users</h2>
            </div>
          ) : (
            <AppHeader title="Whispr" />
          )}
        </div>
        
        {/* Search */}
        <div className="p-4 border-b border-border/20">
          <div className="relative" role="search" aria-label={isSearchMode ? "Search users" : "Search conversations"}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isSearchMode ? "Search users..." : "Search conversations..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 border-0 font-light bg-blue-50/30 dark:bg-blue-950/20"
              aria-label={isSearchMode ? "Search users" : "Search conversations"}
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto relative">
          {isSearchMode ? (
            /* User Search Results */
            <div className="p-4">
              {isSearching ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                  <p className="text-muted-foreground">Searching users...</p>
                </div>
              ) : searchQuery.length < 2 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Type at least 2 characters to search for users</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No users found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.user_id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={result.avatar_url} />
                        <AvatarFallback>
                          {result.display_name?.[0] || result.username?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {result.display_name || result.username}
                        </p>
                        {result.display_name && (
                          <p className="text-sm text-muted-foreground truncate">
                            @{result.username}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => handleAddContact(result.user_id)}
                        size="sm"
                        className="shrink-0"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Conversations List */
            <>
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
            </>
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
