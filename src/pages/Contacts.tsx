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
      contact.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase())
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
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Contacts</h1>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === "contacts" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("contacts")}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            My Contacts
          </Button>
          <Button
            variant={activeTab === "find" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("find")}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Find People
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "contacts" ? (
          <div className="p-4 space-y-4">
            {/* Add Contact Button */}
            <Card className="border-dashed border-2 hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Add New Contact</h3>
                    <p className="text-sm text-muted-foreground">Invite friends to Signal</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contacts List */}
            <div className="space-y-2">
              {filteredContacts.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="p-8">
                    <div className="text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <h3 className="font-medium mb-1">No contacts yet</h3>
                      <p className="text-sm text-muted-foreground">
                        Add contacts to start chatting
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredContacts.map((contact) => (
                  <Card key={contact.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={contact.profile?.avatar_url} />
                              <AvatarFallback>
                                {(contact.profile?.display_name || contact.profile?.username || "?").substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-medium">{contact.profile?.display_name || contact.profile?.username || "Unknown"}</h3>
                            {contact.profile?.username && (
                              <p className="text-sm text-muted-foreground">@{contact.profile.username}</p>
                            )}
                          </div>
                        </div>
    
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStartChat(contact.contact_user_id)}
                          className="shrink-0"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Search Results */}
            <div className="space-y-2">
              <h2 className="font-medium text-sm text-muted-foreground mb-3">
                {searchQuery ? `Search Results for "${searchQuery}"` : 'Search for people'}
              </h2>
              
              {searching && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm text-muted-foreground">Searching...</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!searching && searchResults.length === 0 && searchQuery && (
                <Card className="border-dashed border-2">
                  <CardContent className="p-8">
                    <div className="text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <h3 className="font-medium mb-1">No users found</h3>
                      <p className="text-sm text-muted-foreground">
                        Try searching with a different username
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {searchResults.map((user) => (
                <Card key={user.user_id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            {(user.display_name || user.username || "?").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <h3 className="font-medium">{user.display_name || user.username}</h3>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleAddContact(user.user_id)}
                        className="shrink-0"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {!searchQuery && (
                <Card className="border-dashed border-2">
                  <CardContent className="p-8">
                    <div className="text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <h3 className="font-medium mb-1">No suggestions yet</h3>
                      <p className="text-sm text-muted-foreground">
                        We'll suggest contacts when you start connecting with people
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Manual Search */}
            <Card className="border-dashed border-2">
              <CardContent className="p-4">
                <div className="text-center">
                  <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <h3 className="font-medium mb-1">Search by Username</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enter a username to find and add people
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