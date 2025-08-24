import React from "react";
import { Check, X, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

interface ContactCardProps {
  contact: {
    id: string;
    contact_user_id: string;
    profile?: {
      username?: string;
      display_name?: string;
      avatar_url?: string;
    };
  };
  conversationStatus: {
    status: 'accepted' | 'pending_sent' | 'pending_received';
    conversation?: any;
  } | null;
  onStartChat: (contactId: string) => void;
  onAcceptRequest: (conversationId: string) => void;
  onRejectRequest: (conversationId: string) => void;
  onStartConversation: (contactUserId: string) => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  conversationStatus,
  onStartChat,
  onAcceptRequest,
  onRejectRequest,
  onStartConversation,
}) => {
  const displayName = contact.profile?.display_name || contact.profile?.username || "Unknown";
  const avatarText = displayName.substring(0, 2).toUpperCase();

  const renderActionButton = () => {
    if (!conversationStatus) {
      // No conversation exists - show "Start Chat" button
      return (
        <Button
          size="sm"
          onClick={() => {
            console.log('ContactCard: Start chat button clicked for user:', contact.contact_user_id);
            onStartConversation(contact.contact_user_id);
          }}
          className="shrink-0 touch-feedback btn-press"
          aria-label="Start chat"
        >
          <MessageCircle className="h-3 w-3 md:h-4 md:w-4 mr-2" />
          Start Chat
        </Button>
      );
    }

    switch (conversationStatus.status) {
      case 'accepted':
        return (
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-500/20 text-green-700 dark:text-green-300">
              <Check className="h-3 w-3 mr-1" />
              Connected
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onStartChat(contact.contact_user_id)}
              className="shrink-0 touch-feedback h-8 w-8"
              aria-label="Open chat"
              title="Open chat"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        );

      case 'pending_sent':
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );

      case 'pending_received':
        return (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              onClick={() => onAcceptRequest(conversationStatus.conversation.id)}
              className="shrink-0 touch-feedback btn-press bg-green-600 hover:bg-green-700"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRejectRequest(conversationStatus.conversation.id)}
              className="shrink-0 touch-feedback btn-press"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="hover:bg-muted/50 transition-colors hover-lift touch-feedback">
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 md:h-12 md:w-12">
                <AvatarImage src={contact.profile?.avatar_url} />
                <AvatarFallback>{avatarText}</AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex-1">
              <h3 className="font-medium text-sm md:text-base">{displayName}</h3>
              {contact.profile?.username && (
                <p className="text-xs md:text-sm text-muted-foreground">@{contact.profile.username}</p>
              )}
            </div>
          </div>

          {renderActionButton()}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactCard;