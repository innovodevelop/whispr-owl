import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { useEncryption } from "./useEncryption";
import { decryptMessage } from "@/lib/encryption";

interface Conversation {
  id: string;
  participant_one: string;
  participant_two: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_at?: string;
  recent_messages?: string[];
  otherParticipant?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export const useConversations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getConversationKey } = useEncryption();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();
      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          participant_one,
          participant_two,
          status,
          created_by,
          created_at,
          updated_at
        `)
        .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      const transformedConversations = await Promise.all((data || []).map(async (conv) => {
        const isParticipantOne = conv.participant_one === user.id;
        const otherUserId = isParticipantOne ? conv.participant_two : conv.participant_one;
        
        // Fetch profile data for the other participant
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('user_id', otherUserId)
          .maybeSingle();

        // Fetch latest message for preview (notification or regular)
        let lastMessage = null;
        let lastMessageAt = null;
        if (conv.status === 'accepted') {
          const { data: messageData } = await supabase
            .from('messages')
            .select('content, encrypted_content, created_at, message_type')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (messageData) {
            if (messageData.encrypted_content && !messageData.content) {
              try {
                const conversationKey = await getConversationKey(conv.id);
                if (conversationKey) {
                  lastMessage = decryptMessage(messageData.encrypted_content, conversationKey);
                } else if (messageData.message_type === 'financial_notification') {
                  lastMessage = "Financial activity";
                } else {
                  lastMessage = "New message";
                }
              } catch {
                lastMessage = messageData.message_type === 'financial_notification' ? "Financial activity" : "New message";
              }
            } else {
              lastMessage = messageData.content;
            }
            lastMessageAt = messageData.created_at;
          }
        }
        
        // Optional: recent messages (not used for UI rotation anymore)  
        let recentMessages: string[] = [];
        if (conv.status === 'accepted') {
          const { data: recentMessagesData } = await supabase
            .from('messages')
            .select('content, encrypted_content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(3);

          if (recentMessagesData) {
            recentMessages = await Promise.all(recentMessagesData.map(async (msg) => {
              if (msg.encrypted_content && !msg.content) {
                try {
                  const conversationKey = await getConversationKey(conv.id);
                  if (conversationKey) {
                    return decryptMessage(msg.encrypted_content, conversationKey);
                  }
                  return "New message";
                } catch {
                  return "New message";
                }
              }
              return msg.content;
            }));
          }
        }

        return {
          ...conv,
          status: conv.status as 'pending' | 'accepted' | 'rejected' | 'blocked',
          last_message: lastMessage,
          last_message_at: lastMessageAt,
          recent_messages: recentMessages,
          otherParticipant: profileData
        };
      }));

      // Separate accepted conversations from pending requests
      const accepted = transformedConversations.filter(c => c.status === 'accepted');
      const pending = transformedConversations.filter(c => c.status === 'pending' && c.created_by !== user.id);

      setConversations(accepted);
      setPendingRequests(pending);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant_one=eq.${user.id}`
        },
        () => fetchConversations()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant_two=eq.${user.id}`
        },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const startConversation = async (contactUserId: string) => {
    if (!user) return { success: false, conversationId: null };

    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .or(
          `and(participant_one.eq.${user.id},participant_two.eq.${contactUserId}),and(participant_one.eq.${contactUserId},participant_two.eq.${user.id})`
        )
        .maybeSingle();

      if (existing) {
        toast({
          title: "Conversation exists",
          description: "You already have a conversation with this user",
          variant: "destructive",
        });
        return { success: false, conversationId: existing.id };
      }

      // Create new conversation request
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_one: user.id,
          participant_two: contactUserId,
          created_by: user.id,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return { success: false, conversationId: null };
      }

      toast({
        title: "Chat request sent",
        description: "Your chat request has been sent successfully",
      });
      
      await fetchConversations();
      return { success: true, conversationId: data.id };
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
      return { success: false, conversationId: null };
    }
  };

  const acceptConversation = async (conversationId: string) => {
    if (!user) return false;

    try {
      // First, get the conversation to find both participants
      const { data: conversation, error: fetchError } = await supabase
        .from('conversations')
        .select('participant_one, participant_two')
        .eq('id', conversationId)
        .single();

      if (fetchError || !conversation) {
        toast({
          title: "Error",
          description: "Failed to find conversation",
          variant: "destructive",
        });
        return false;
      }

      // Update conversation status
      const { error } = await supabase
        .from('conversations')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      // Add both users to each other's contacts (if not already added)
      const contactInserts = [
        { user_id: conversation.participant_one, contact_user_id: conversation.participant_two },
        { user_id: conversation.participant_two, contact_user_id: conversation.participant_one }
      ];

      // Insert contacts (ignore duplicates)
      await supabase
        .from('contacts')
        .upsert(contactInserts, { 
          onConflict: 'user_id,contact_user_id',
          ignoreDuplicates: true 
        });

      // After creating contacts, ensure both users will see each other by refreshing contacts screen when they navigate there

      toast({
        title: "Chat request accepted",
        description: "You can now start chatting",
      });
      
      await fetchConversations();
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept conversation",
        variant: "destructive",
      });
      return false;
    }
  };

  const rejectConversation = async (conversationId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status: 'rejected' })
        .eq('id', conversationId);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Chat request rejected",
        description: "The chat request has been declined",
      });
      
      await fetchConversations();
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject conversation",
        variant: "destructive",
      });
      return false;
    }
  };

  const getConversationStatus = (contactUserId: string): {
    status: 'accepted' | 'pending_sent' | 'pending_received';
    conversation?: Conversation;
  } | null => {
    if (!user) return null;

    // Check in accepted conversations
    const accepted = conversations.find(c => 
      (c.participant_one === contactUserId && c.participant_two === user.id) ||
      (c.participant_one === user.id && c.participant_two === contactUserId)
    );
    
    if (accepted) return { status: 'accepted', conversation: accepted };

    // Check in all conversations (including pending ones we sent)
    const allConversations = [...conversations, ...pendingRequests];
    const pending = allConversations.find(c => 
      (c.participant_one === contactUserId && c.participant_two === user.id) ||
      (c.participant_one === user.id && c.participant_two === contactUserId)
    );

    if (pending) {
      const isPendingFromUs = pending.created_by === user.id;
      return { 
        status: isPendingFromUs ? 'pending_sent' : 'pending_received', 
        conversation: pending 
      } as { status: 'pending_sent' | 'pending_received'; conversation: Conversation };
    }

    return null;
  };

  return {
    conversations,
    pendingRequests,
    loading,
    startConversation,
    acceptConversation,
    rejectConversation,
    getConversationStatus,
    fetchConversations,
  };
};