import { useState, useEffect } from "react";
import { Message } from "./useMessages";

export const useBurnMessages = (messages: Message[], userId: string | undefined) => {
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(new Set());

  const hideMessageForSender = (messageId: string) => {
    setHiddenMessageIds(prev => new Set([...prev, messageId]));
  };

  // Filter out messages that should be hidden for the current user
  const visibleMessages = messages.filter(msg => {
    // If message is hidden for sender, don't show it
    if (hiddenMessageIds.has(msg.id)) {
      return false;
    }
    return true;
  });

  return {
    visibleMessages,
    hideMessageForSender
  };
};