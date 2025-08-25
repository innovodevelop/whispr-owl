import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNavigation from "@/components/BottomNavigation";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Search, Loader2, Check, X } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { useConversations } from "@/hooks/useConversations";
import { useAuth } from "@/hooks/useAuth";
import ContactCard from "@/components/ContactCard";
import { UserSearchDialog } from "@/components/dialogs/UserSearchDialog";

const Contacts = () => {
  const navigate = useNavigate();
  const { contacts, loading } = useContacts();
  const { conversations, pendingRequests, startConversation, acceptConversation, rejectConversation, getConversationStatus } = useConversations();
  const { user } = useAuth();
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Use the conversation status function from the hook
  const getContactConversationStatus = (contactUserId: string) => {
    return getConversationStatus(contactUserId);
  };

  const handleStartChat = (contactUserId: string) => {
    console.log('Contacts: handleStartChat called with contactUserId:', contactUserId);
    console.log('Contacts: Available conversations:', conversations);

    // Prefer status-derived conversation (already computed in hook)
    const status = getConversationStatus(contactUserId);
    if (status?.status === 'accepted' && status.conversation?.id) {
      console.log('Contacts: Using status.conversation to navigate, id:', status.conversation.id);
      navigate('/', { state: { newConversation: { id: status.conversation.id } } });
      return;
    }
    
    // Fallback: find conversation by participants
    const conversation = conversations.find(conv => 
      (conv.participant_one === user?.id && conv.participant_two === contactUserId) ||
      (conv.participant_two === user?.id && conv.participant_one === contactUserId)
    );
    
    console.log('Contacts: Found conversation via fallback:', conversation);
    
    if (conversation?.status === 'accepted') {
      console.log('Contacts: Navigating to chat with conversation ID (fallback):', conversation.id);
      // Navigate to main page with conversation selected
      navigate('/', { state: { newConversation: { id: conversation.id } } });
    } else {
      console.log('Contacts: No accepted conversation found, status:', conversation?.status);
    }
  };
  const handleAcceptRequest = async (conversationId: string) => {
    await acceptConversation(conversationId);
  };

  const handleRejectRequest = async (conversationId: string) => {
    await rejectConversation(conversationId);
  };

  const handleStartConversation = async (contactUserId: string) => {
    console.log('Contacts: handleStartConversation called with userId:', contactUserId);
    const result = await startConversation(contactUserId);
    console.log('Contacts: startConversation result:', result);
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
      <AppHeader title="Contacts" showBackButton={true} />
      
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
          {pendingRequests.length > 0 && (
            <Badge variant="default" className="flex items-center gap-2 bg-blue-500/20 text-blue-700 dark:text-blue-300">
              Requests: {pendingRequests.length}
            </Badge>
          )}
        </div>

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Incoming Chat Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="border-blue-200 dark:border-blue-800">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 md:h-12 md:w-12">
                          <AvatarImage src={request.otherParticipant?.avatar_url} />
                          <AvatarFallback>
                            {(request.otherParticipant?.display_name || request.otherParticipant?.username || "U").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium text-sm md:text-base">
                            {request.otherParticipant?.display_name || request.otherParticipant?.username || "Unknown User"}
                          </h3>
                          {request.otherParticipant?.username && (
                            <p className="text-xs md:text-sm text-muted-foreground">@{request.otherParticipant.username}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Wants to start a conversation
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptRequest(request.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectRequest(request.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

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