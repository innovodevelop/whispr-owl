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
  const { conversations, pendingRequests, startConversation, acceptConversation, rejectConversation, getConversationStatus, fetchConversations } = useConversations();
  const { user } = useAuth();
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Use the conversation status function from the hook
  const getContactConversationStatus = (contactUserId: string) => {
    return getConversationStatus(contactUserId);
  };

  const handleStartChat = (contactUserId: string) => {
    console.log('Contacts: handleStartChat called with contactUserId:', contactUserId);

    const status = getConversationStatus(contactUserId);
    if (status?.conversation?.id) {
      console.log('Contacts: Navigating to conversation from status:', status);
      navigate('/', { state: { newConversation: { id: status.conversation.id } } });
      return;
    }

    // As a fallback, try to find any matching conversation and open it
    const conversation = conversations.find(conv => 
      (conv.participant_one === user?.id && conv.participant_two === contactUserId) ||
      (conv.participant_two === user?.id && conv.participant_one === contactUserId)
    );
    if (conversation?.id) {
      console.log('Contacts: Navigating to conversation from fallback:', conversation.id);
      navigate('/', { state: { newConversation: { id: conversation.id } } });
    } else {
      console.log('Contacts: No conversation found; starting a new one');
      handleStartConversation(contactUserId);
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

    // Refresh lists so pending/accepted states appear instantly
    fetchConversations?.();

    // Navigate immediately to the conversation if we have an ID (accepted or pending)
    if (result?.conversationId) {
      console.log('Contacts: Navigating to conversation id from result:', result.conversationId);
      navigate('/', { state: { newConversation: { id: result.conversationId } } });
      return;
    }

    // Fallback: Only navigate if conversation is accepted and found via status lookup
    const status = getConversationStatus(contactUserId);
    console.log('Contacts: post-start status:', status);
    if (status?.status === 'accepted' && status.conversation?.id) {
      navigate('/', { state: { newConversation: { id: status.conversation.id } } });
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
    <div className="h-screen flex bg-background page-enter">
      <div className="w-full m-1 md:m-2 rounded-3xl bg-card/90 backdrop-blur-sm shadow-2xl flex flex-col overflow-hidden">
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
      </div>

      {/* User Search Dialog */}
      <UserSearchDialog 
        open={searchDialogOpen} 
        onOpenChange={setSearchDialogOpen} 
      />
      
      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default Contacts;