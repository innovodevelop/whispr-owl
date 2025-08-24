import React from "react";
import { Check, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChatRequestCardProps {
  request: {
    id: string;
    created_by: string;
    otherParticipant?: {
      username?: string;
      display_name?: string;
      avatar_url?: string;
    };
    created_at: string;
  };
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export const ChatRequestCard: React.FC<ChatRequestCardProps> = ({
  request,
  onAccept,
  onReject,
}) => {
  const displayName = request.otherParticipant?.display_name || 
                     request.otherParticipant?.username || 
                     "Unknown User";
  const avatarText = displayName.substring(0, 2).toUpperCase();

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader className="pb-3 p-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageCircle className="h-4 w-4 text-blue-600" />
          Chat Request
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={request.otherParticipant?.avatar_url} />
              <AvatarFallback>{avatarText}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h3 className="font-medium text-sm">{displayName}</h3>
              {request.otherParticipant?.username && (
                <p className="text-xs text-muted-foreground">@{request.otherParticipant.username}</p>
              )}
              <p className="text-xs text-muted-foreground">wants to start a chat</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onAccept(request.id)}
              className="shrink-0 touch-feedback btn-press bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-3 w-3 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(request.id)}
              className="shrink-0 touch-feedback btn-press"
            >
              <X className="h-3 w-3 mr-1" />
              Decline
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatRequestCard;