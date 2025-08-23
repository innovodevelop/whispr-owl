import { useState, useEffect } from "react";
import { ArrowLeft, Search, Plus, UserPlus, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { useNavigate } from "react-router-dom";

const Contacts = () => {
  const { user } = useAuth();
  const { contacts, addContact, removeContact, searchUsersByUsername } = useContacts();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"contacts" | "find">("contacts");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (activeTab === "find" && searchQuery.trim()) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, activeTab]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const results = await searchUsersByUsername(searchQuery);
    setSearchResults(results);
    setSearching(false);
  };

  const filteredContacts = contacts.filter(
    contact =>
      contact.profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.profile?.phone_number?.includes(searchQuery)
  );

  const handleStartChat = (contactId: string) => {
    const contact = contacts.find(c => c.contact_user_id === contactId);
    if (contact) {
      // Create new conversation and navigate back
      navigate("/", { 
        state: { 
          newConversation: {
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
            placeholder="Search by username, name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
                  <Card key={contact.id} className="hover:bg-muted/50 transition-colors hover-lift touch-feedback stagger-item" style={{ animationDelay: `${index * 0.05}s` }}>
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10 md:h-12 md:w-12">
                              <AvatarImage src={contact.profile?.avatar_url} />
                              <AvatarFallback>
                                {(contact.profile?.display_name || contact.profile?.username || "?").substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-medium text-sm md:text-base">{contact.profile?.display_name || contact.profile?.username || "Unknown"}</h3>
                            {contact.profile?.username && (
                              <p className="text-xs md:text-sm text-muted-foreground">@{contact.profile.username}</p>
                            )}
                          </div>
                        </div>
    
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStartChat(contact.contact_user_id)}
                          className="shrink-0 touch-feedback h-8 w-8 md:h-10 md:w-10"
                        >
                          <MessageCircle className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
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

              {!searching && searchResults.length === 0 && searchQuery && (
                <Card className="border-dashed border-2 fade-in">
                  <CardContent className="p-6 md:p-8">
                    <div className="text-center">
                      <Users className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-muted-foreground" />
                       <h3 className="font-medium mb-1 text-sm md:text-base">No users found</h3>
                       <p className="text-xs md:text-sm text-muted-foreground">
                         Try searching with a different username, name, or phone number
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {searchResults.map((user, index) => (
                <Card key={user.user_id} className="hover:bg-muted/50 transition-colors hover-lift touch-feedback stagger-item" style={{ animationDelay: `${index * 0.05}s` }}>
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
                             {user.phone_number && user.username && " • "}
                             {user.phone_number}
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

              {!searchQuery && (
                <Card className="border-dashed border-2 fade-in">
                  <CardContent className="p-6 md:p-8">
                    <div className="text-center">
                      <Users className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-muted-foreground" />
                      <h3 className="font-medium mb-1 text-sm md:text-base">No suggestions yet</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        We'll suggest contacts when you start connecting with people
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
                   <h3 className="font-medium mb-1 text-sm md:text-base">Search by Username or Phone</h3>
                   <p className="text-xs md:text-sm text-muted-foreground mb-3">
                     Enter a username, name, or phone number to find people
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contacts;