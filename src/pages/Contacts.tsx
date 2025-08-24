import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNavigation from "@/components/BottomNavigation";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search, Loader2 } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { useConversations } from "@/hooks/useConversations";
import ContactCard from "@/components/ContactCard";
import { UserSearchDialog } from "@/components/dialogs/UserSearchDialog";

const Contacts = () => {
  const navigate = useNavigate();
  const { contacts, loading } = useContacts();
  const { conversations, pendingRequests, startConversation, acceptConversation, rejectConversation, getConversationStatus } = useConversations();
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Use the conversation status function from the hook
  const getContactConversationStatus = (contactUserId: string) => {
    return getConversationStatus(contactUserId);
  };

  const handleStartChat = (contactUserId: string) => {
    const conversation = conversations.find(conv => 
      conv.participant_one === contactUserId || conv.participant_two === contactUserId
    );
    
    if (conversation?.status === 'accepted') {
      // Navigate to main page with conversation selected
      navigate('/', { state: { newConversation: { id: conversation.id } } });
    }
  };

  const handleAcceptRequest = async (conversationId: string) => {
    await acceptConversation(conversationId);
  };

  const handleRejectRequest = async (conversationId: string) => {
    await rejectConversation(conversationId);
  };

  const handleStartConversation = async (contactUserId: string) => {
    const result = await startConversation(contactUserId);
    if (result.success && result.conversationId) {
      // Navigate to main page with conversation selected (whether new or existing)
      navigate('/', { state: { newConversation: { id: result.conversationId } } });
    }
  };

  // Filter contacts based on search term
  const filteredContacts = contacts.filter(contact => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const displayName = contact.profile?.display_name?.toLowerCase() || "";
    const username = contact.profile?.username?.toLowerCase() || "";
    return displayName.includes(searchLower) || username.includes(searchLower);
  });

  return (
    <div className="h-screen flex flex-col bg-background page-enter">
      {/* Header */}
      <AppHeader title="Contacts" />
      
      {/* Content */}
      <div className="p-4 flex-1 overflow-auto">
        {/* Header Actions */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button 
            onClick={() => setSearchDialogOpen(true)}
            className="shrink-0"
            size="icon"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>

        {/* Contact Stats */}
        <div className="flex gap-4 mb-6">
          <Badge variant="secondary" className="flex items-center gap-2">
            Total: {contacts.length}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-2">
            Connected: {contacts.filter(c => getContactConversationStatus(c.contact_user_id)?.status === 'accepted').length}
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-2">
            Pending: {contacts.filter(c => {
              const status = getContactConversationStatus(c.contact_user_id)?.status;
              return status === 'pending_sent' || status === 'pending_received';
            }).length}
          </Badge>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading contacts...
          </div>
        )}

        {/* Empty State */}
        {!loading && contacts.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No contacts yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Start building your network by adding your first contact.
              </p>
              <Button onClick={() => setSearchDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Your First Contact
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Contact List */}
        {!loading && filteredContacts.length > 0 && (
          <div className="space-y-3">
            {filteredContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                conversationStatus={getContactConversationStatus(contact.contact_user_id)}
                onStartChat={handleStartChat}
                onAcceptRequest={handleAcceptRequest}
                onRejectRequest={handleRejectRequest}
                onStartConversation={handleStartConversation}
              />
            ))}
          </div>
        )}

        {/* No Search Results */}
        {!loading && searchTerm && filteredContacts.length === 0 && contacts.length > 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                No contacts found matching "{searchTerm}"
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom spacing for mobile navigation */}
      <div className="md:hidden h-20"></div>
      
      {/* Mobile Bottom Navigation */}
      <BottomNavigation />

      {/* User Search Dialog */}
      <UserSearchDialog 
        open={searchDialogOpen} 
        onOpenChange={setSearchDialogOpen} 
      />
    </div>
  );
};

export default Contacts;