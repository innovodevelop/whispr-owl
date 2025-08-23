import { useState } from "react";
import { ArrowLeft, Search, Plus, UserPlus, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const Contacts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"contacts" | "find">("contacts");

  // Contact data will be loaded from backend in the future
  const [contacts, setContacts] = useState<any[]>([]);

  const [suggestedUsers, setSuggestedUsers] = useState([]);

  const filteredContacts = contacts.filter(
    contact =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuggested = suggestedUsers.filter(
    user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartChat = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      // Create new conversation and navigate back
      navigate("/", { 
        state: { 
          newConversation: {
            id: contactId,
            name: contact.name,
            avatar: contact.avatar
          }
        }
      });
    }
  };

  const handleAddContact = (userId: string) => {
    const userToAdd = suggestedUsers.find(u => u.id === userId);
    if (userToAdd) {
      setContacts(prev => [...prev, {
        id: userToAdd.id,
        name: userToAdd.name,
        username: userToAdd.username,
        avatar: userToAdd.avatar,
        isOnline: false,
        lastSeen: "Just added"
      }]);
      setSuggestedUsers(prev => prev.filter(u => u.id !== userId));
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
                              <AvatarImage src={contact.avatar} />
                              <AvatarFallback>
                                {contact.name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            {contact.isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-medium">{contact.name}</h3>
                            <p className="text-sm text-muted-foreground">{contact.username}</p>
                            <p className="text-xs text-muted-foreground">{contact.lastSeen}</p>
                          </div>
                        </div>
    
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStartChat(contact.id)}
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
            {/* No suggested users message */}
            <div className="space-y-2">
              <h2 className="font-medium text-sm text-muted-foreground mb-3">Suggested Contacts</h2>
              
              {filteredSuggested.length === 0 && (
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
                    Enter a Signal username to find and add people
                  </p>
                  <div className="flex gap-2">
                    <Input placeholder="@username" className="flex-1" />
                    <Button>Search</Button>
                  </div>
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