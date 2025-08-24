import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useSignalProtocol } from '@/hooks/useSignalProtocol';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  encrypted_content?: string;
  message_type: string;
  created_at: string;
  updated_at: string;
  read_at?: string;
  expires_at?: string;
  burn_on_read_duration?: number;
  burn_on_read_starts_at?: string;
  sender?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const signalProtocol = useSignalProtocol();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user || !signalProtocol.initialized) return;
    
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

      // Filter out expired messages, decrypt content, and add sender data
      const validMessages = await Promise.all((data || []).filter(msg => {
        if (!msg.expires_at) return true;
        return new Date(msg.expires_at) > new Date();
      }).map(async msg => {
        const profile = profileMap.get(msg.sender_id);
        
        // Decrypt message content if it's encrypted using Signal Protocol
        let decryptedContent = msg.content;
        if (msg.encrypted_content && msg.sender_id !== user?.id) {
          try {
            const decrypted = await signalProtocol.decryptMessage(
              msg.encrypted_content,
              conversationId,
              msg.sender_id
            );
            decryptedContent = decrypted || '[Decryption failed]';
          } catch (error) {
            console.error('Failed to decrypt message:', error);
            decryptedContent = '[Decryption failed]';
          }
        } else if (msg.encrypted_content && msg.sender_id === user?.id) {
          // For our own messages, we can read the original content
          decryptedContent = msg.content || msg.encrypted_content;
        }

        return {
          ...msg,
          content: decryptedContent,
          sender: profile
        };
      }));

      setMessages(validMessages as Message[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user, signalProtocol.initialized, signalProtocol.decryptMessage]);

  const sendMessage = useCallback(async (
    content: string,
    burnOnReadDuration?: number,
    messageType: string = "text"
  ): Promise<boolean> => {
    if (!user || !conversationId || !signalProtocol.initialized) return false;

    try {
      setSending(true);
      
      // Get disappearing message settings if no burn duration specified
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
      } else if (settings?.disappearing_message_duration) {
        const now = new Date();
        const expiryMinutes = settings.disappearing_message_duration;
        expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000);
      }

      // For financial notifications, don't encrypt
      let encryptedContent = null;
      let finalContent = content;

      if (messageType !== "financial_notification") {
        // Get the other participant in the conversation
        const { data: conversationData } = await supabase
          .from('conversations')
          .select('participant_one, participant_two')
          .eq('id', conversationId)
          .single();

        if (conversationData) {
          const remoteUserId = conversationData.participant_one === user.id 
            ? conversationData.participant_two 
            : conversationData.participant_one;
          
          if (remoteUserId) {
            // Encrypt message using Signal Protocol
            const encrypted = await signalProtocol.encryptMessage(
              content,
              conversationId,
              remoteUserId
            );
            encryptedContent = encrypted;
            // Clear the plain text content for security
            finalContent = encrypted ? "[Encrypted Message]" : content;
          }
        }
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: finalContent,
          encrypted_content: encryptedContent,
          message_type: messageType,
          expires_at: expiresAt?.toISOString(),
          burn_on_read_duration: burnOnReadDuration || null,
          burn_on_read_starts_at: burnOnReadDuration ? new Date().toISOString() : null
        })
        .select(`
          *,
          sender:profiles(display_name, avatar_url)
        `)
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      console.log('Message sent successfully:', data);

      // Update conversation's last_message_at
      const { error: conversationError } = await supabase
        .from('conversations')
        .update({ 
          updated_at: new Date().toISOString(),
          last_message_content: messageType === "financial_notification" ? content : content.slice(0, 100),
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (conversationError) {
        console.error('Error updating conversation:', conversationError);
      }

      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    } finally {
      setSending(false);
    }
  }, [user, conversationId, settings, signalProtocol]);

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('Error deleting message:', error);
        return false;
      }

      // Remove from local state immediately
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  };

  const markAsRead = async (messageId: string) => {
    if (!user) return;

    try {
      // Find the message to check if it has burn_on_read
      const message = messages.find(msg => msg.id === messageId);
      const updateData: any = { read_at: new Date().toISOString() };
      
      // If it's a burn_on_read message from another user and no timer started yet, start receiver timer
      if (message?.burn_on_read_duration && message.sender_id !== user.id && !message.burn_on_read_starts_at) {
        updateData.burn_on_read_starts_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('messages')
        .update(updateData)
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

  // Mark messages as read when they come into view and start burn timers
  useEffect(() => {
    if (!user || messages.length === 0) return;

    const unreadMessages = messages.filter(msg => 
      !msg.read_at && msg.sender_id !== user.id
    );

    const burnMessages = messages.filter(msg => 
      msg.burn_on_read_duration && 
      msg.sender_id === user.id && 
      !msg.burn_on_read_starts_at &&
      msg.read_at // Message has been read by recipient
    );

    unreadMessages.forEach(msg => {
      markAsRead(msg.id);
    });

    // Start burn timers for sent messages that were just read
    burnMessages.forEach(msg => {
      const updateData = { burn_on_read_starts_at: new Date().toISOString() };
      supabase
        .from('messages')
        .update(updateData)
        .eq('id', msg.id)
        .then(() => fetchMessages()); // Refresh to show timer
    });
  }, [messages, user]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    markAsRead,
    fetchMessages,
    deleteMessage
  };
};