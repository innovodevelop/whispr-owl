import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserSettings } from "@/hooks/useUserSettings";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  updated_at: string;
  read_at?: string;
  expires_at?: string;
  sender?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      // Fetch sender profiles separately
      const senderIds = [...new Set((data || []).map(msg => msg.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', senderIds);

      const profileMap = new Map();
      (profiles || []).forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      // Filter out expired messages and add sender data
      const validMessages = (data || []).filter(msg => {
        if (!msg.expires_at) return true;
        return new Date(msg.expires_at) > new Date();
      }).map(msg => ({
        ...msg,
        sender: profileMap.get(msg.sender_id)
      }));

      setMessages(validMessages as Message[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user]);

  const sendMessage = async (content: string) => {
    if (!conversationId || !user || !content.trim()) return false;

    try {
      // Check for conversation-specific disappearing message settings
      const key = `chat_settings_${conversationId}_${user.id}`;
      const stored = localStorage.getItem(key);
      let expiresAt = null;
      
      if (stored) {
        const chatSettings = JSON.parse(stored);
        if (chatSettings.disappearing_enabled && chatSettings.disappearing_duration) {
          const now = new Date();
          const expiryMinutes = chatSettings.disappearing_duration;
          expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000);
        }
      } else {
        // Fallback to user-wide settings
        if (settings?.disappearing_message_duration) {
          const now = new Date();
          const expiryMinutes = settings.disappearing_message_duration;
          expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000);
        }
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: 'text',
          expires_at: expiresAt?.toISOString()
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return false;
      }

      // Update conversation's updated_at timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  };

  const markAsRead = async (messageId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .neq('sender_id', user.id); // Don't mark own messages as read

      if (error) {
        console.error('Error marking message as read:', error);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('New message received:', payload);
          // Refetch messages to get the message with sender profile data
          fetchMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Message updated:', payload);
          // Update the specific message
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id 
              ? { ...msg, ...payload.new }
              : msg
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchMessages]);

  // Mark messages as read when they come into view
  useEffect(() => {
    if (!user || messages.length === 0) return;

    const unreadMessages = messages.filter(msg => 
      !msg.read_at && msg.sender_id !== user.id
    );

    unreadMessages.forEach(msg => {
      markAsRead(msg.id);
    });
  }, [messages, user]);

  return {
    messages,
    loading,
    sendMessage,
    markAsRead,
    fetchMessages
  };
};