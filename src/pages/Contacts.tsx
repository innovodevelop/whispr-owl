import { useState, useEffect } from "react";
import BottomNavigation from "@/components/BottomNavigation";
import { ArrowLeft, Search, Plus, UserPlus, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { useConversations } from "@/hooks/useConversations";
import { useNavigate } from "react-router-dom";
import ContactCard from "@/components/ContactCard";
import ChatRequestCard from "@/components/ChatRequestCard";

const Contacts = () => {
  const { user } = useAuth();
  const { contacts, addContact, removeContact, searchUsersByUsername } = useContacts();
  const { 
    conversations, 
    pendingRequests, 
    startConversation, 
    acceptConversation, 
    rejectConversation, 
    getConversationStatus 
  } = useConversations();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"contacts" | "find" | "requests">("contacts");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (activeTab === "find" && searchQuery.trim()) {
      performSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, activeTab]);

  const performSearch = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    console.log('Starting search for:', term);
    const results = await searchUsersByUsername(term);
    console.log('Search results received:', results);
    const safeResults = Array.isArray(results) ? results : [];
    setSearchResults(safeResults);
    setActiveTab('find');
    setSearching(false);
  };

  const filteredContacts = contacts.filter(
    contact =>
      contact.profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartChat = (contactId: string) => {
    const contact = contacts.find(c => c.contact_user_id === contactId);
    if (contact) {
      // Navigate to chat with this contact
      navigate("/", { 
        state: { 
          selectedContact: {
            id: contactId,
            name: contact.profile?.display_name || contact.profile?.username || "Unknown",
            avatar: contact.profile?.avatar_url
          }
        }
      });
    }
  };

  const handleAddContact = async (userId: string) => {
    const success = await addContact(userId);
    if (success) {
      // Remove from search results
      setSearchResults(prev => prev.filter(u => u.user_id !== userId));
    }
  };

  const handleStartConversation = async (contactUserId: string) => {
    await startConversation(contactUserId);
  };

  const handleAcceptRequest = async (conversationId: string) => {
    await acceptConversation(conversationId);
  };

  const handleRejectRequest = async (conversationId: string) => {
    await rejectConversation(conversationId);
  };

  return (
    <div className="h-screen flex flex-col bg-background page-enter">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-border slide-down">
        <div className="flex items-center gap-3 mb-3 md:mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="touch-feedback h-8 w-8 md:h-10 md:w-10">
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <h1 className="text-lg md:text-xl font-semibold">Contacts</h1>
        </div>

        {/* Search */}
        <div className="relative mb-3 md:mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by username or name..."
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              if (val.trim().length >= 2) setActiveTab("find");
              if (val.trim().length === 0) setActiveTab("contacts");
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (searchQuery.trim().length >= 2) {
                  setActiveTab('find');
                  performSearch(searchQuery);
                }
              }
            }}
            className="pl-10 h-9 md:h-10"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 md:gap-2">
          <Button
            variant={activeTab === "contacts" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("contacts")}
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm h-7 md:h-8 touch-feedback"
          >
            <Users className="h-3 w-3 md:h-4 md:w-4" />
            My Contacts
          </Button>
          <Button
            variant={activeTab === "find" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("find")}
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm h-7 md:h-8 touch-feedback"
          >
            <UserPlus className="h-3 w-3 md:h-4 md:w-4" />
            Find People
          </Button>
          <Button
            variant={activeTab === "requests" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("requests")}
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm h-7 md:h-8 touch-feedback relative"
          >
            <MessageCircle className="h-3 w-3 md:h-4 md:w-4" />
            Requests
            {pendingRequests.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-red-500">
                {pendingRequests.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "contacts" ? (
          <div className="p-3 md:p-4 space-y-3 md:space-y-4">
            {/* Add Contact Button */}
            <Card className="border-dashed border-2 hover:bg-muted/50 transition-colors cursor-pointer hover-lift touch-feedback scale-in">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm md:text-base">Add New Contact</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">Invite friends to Whispr</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contacts List */}
            <div className="space-y-2">
              {filteredContacts.length === 0 ? (
                <Card className="border-dashed border-2 fade-in">
                  <CardContent className="p-6 md:p-8">
                    <div className="text-center">
                      <Users className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-muted-foreground" />
                      <h3 className="font-medium mb-1 text-sm md:text-base">No contacts yet</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Add contacts to start chatting
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredContacts.map((contact, index) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    conversationStatus={getConversationStatus(contact.contact_user_id)}
                    onStartChat={handleStartChat}
                    onAcceptRequest={handleAcceptRequest}
                    onRejectRequest={handleRejectRequest}
                    onStartConversation={handleStartConversation}
                  />
                ))
              )}
            </div>
          </div>
        ) : activeTab === "requests" ? (
          <div className="p-3 md:p-4 space-y-3 md:space-y-4">
            <h2 className="font-medium text-sm text-muted-foreground mb-3">
              Chat Requests ({pendingRequests.length})
            </h2>
            
            {pendingRequests.length === 0 ? (
              <Card className="border-dashed border-2 fade-in">
                <CardContent className="p-6 md:p-8">
                  <div className="text-center">
                    <MessageCircle className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-muted-foreground" />
                    <h3 className="font-medium mb-1 text-sm md:text-base">No chat requests</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      When someone wants to chat with you, their request will appear here
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request, index) => (
                  <ChatRequestCard
                    key={request.id}
                    request={request}
                    onAccept={handleAcceptRequest}
                    onReject={handleRejectRequest}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 md:p-4 space-y-3 md:space-y-4 slide-left">
            {/* Search Results */}
            <div className="space-y-2">
              <h2 className="font-medium text-xs md:text-sm text-muted-foreground mb-3">
                {searchQuery ? `Search Results for "${searchQuery}"` : 'Search for people'}
              </h2>
              
              {searching && (
                <Card className="loading-pulse">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-xs md:text-sm text-muted-foreground">Searching...</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Results count */}
              {searchResults.length > 0 && (
                <p className="text-xs md:text-sm text-muted-foreground">Found {searchResults.length} {searchResults.length === 1 ? 'user' : 'users'}</p>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && searchResults.map((user, index) => (
                <Card key={user.user_id} className="border hover:bg-muted/50 transition-colors hover-lift touch-feedback" style={{ animationDelay: `${index * 0.05}s` }}>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 md:h-12 md:w-12">
                          <AvatarFallback>
                            {(user.display_name || user.username || "?").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                         <div className="flex-1">
                           <h3 className="font-medium text-sm md:text-base">{user.display_name || user.username}</h3>
                           <p className="text-xs md:text-sm text-muted-foreground">
                             {user.username && `@${user.username}`}
                           </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleAddContact(user.user_id)}
                        className="shrink-0 touch-feedback btn-press"
                      >
                        <UserPlus className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* No search results */}
              {!searching && searchResults.length === 0 && searchQuery && (
                <Card className="border-dashed border-2 fade-in">
                  <CardContent className="p-6 md:p-8">
                    <div className="text-center">
                      <Users className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-muted-foreground" />
                       <h3 className="font-medium mb-1 text-sm md:text-base">No users found</h3>
                       <p className="text-xs md:text-sm text-muted-foreground">
                         Try searching with a different username or display name
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {!searchQuery && (
                <Card className="border-dashed border-2 scale-in">
                  <CardContent className="p-6 md:p-8">
                    <div className="text-center">
                      <Users className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-muted-foreground" />
                      <h3 className="font-medium mb-1 text-sm md:text-base">Start searching</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Enter a username or display name to find people
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Manual Search */}
            <Card className="border-dashed border-2 scale-in">
              <CardContent className="p-3 md:p-4">
                <div className="text-center">
                  <Search className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-muted-foreground" />
                    <h3 className="font-medium mb-1 text-sm md:text-base">Search by Username</h3>
                    <p className="text-xs md:text-sm text-muted-foreground mb-3">
                      Enter a username or display name to find people
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* Bottom spacing for mobile navigation */}
      <div className="md:hidden h-16"></div>
      
      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default Contacts;