import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface Contact {
  id: string;
  user_id: string;
  contact_user_id: string;
  created_at: string;
  profile?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export const useContacts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Rate limiting for search to prevent enumeration attacks
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  const backfillContactsFromAcceptedConversations = async (existingContacts: Contact[]): Promise<boolean> => {
    if (!user) return false;
    try {
      const existingIds = new Set((existingContacts || []).map(c => c.contact_user_id));

      const { data: convs, error } = await supabase
        .from('conversations')
        .select('participant_one, participant_two, status')
        .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
        .eq('status', 'accepted');

      if (error) {
        console.error('Error fetching accepted conversations for backfill:', error);
        return false;
      }

      const toInsert = (convs || [])
        .map((c: any) => {
          const otherId = c.participant_one === user.id ? c.participant_two : c.participant_one;
          return otherId && !existingIds.has(otherId)
            ? { user_id: user.id, contact_user_id: otherId }
            : null;
        })
        .filter(Boolean) as { user_id: string; contact_user_id: string }[];

      if (toInsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('contacts')
          .upsert(toInsert, { onConflict: 'user_id,contact_user_id', ignoreDuplicates: true });
        if (upsertError) {
          console.error('Error backfilling contacts:', upsertError);
          return false;
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('Backfill contacts error:', e);
      return false;
    }
  };

  const fetchContacts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, user_id, contact_user_id, created_at')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching contacts:', error);
        return;
      }

      const contactsData = (data || []);
      if (contactsData.length === 0) {
        setContacts([]);
        // Even if no contacts, attempt to backfill from accepted conversations
        const backfilled = await backfillContactsFromAcceptedConversations([]);
        if (backfilled) {
          await fetchContacts();
          return;
        }
        return;
      }

      // Fetch profiles for all contact_user_id in a single query
      const contactIds = Array.from(new Set(contactsData.map(c => c.contact_user_id).filter(Boolean)));

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', contactIds);

      if (profilesError) {
        console.error('Error fetching profiles for contacts:', profilesError);
      }

      const profileMap = new Map<string, { username?: string; display_name?: string; avatar_url?: string }>();
      (profilesData || []).forEach((p: any) => {
        profileMap.set(p.user_id, {
          username: p.username ?? undefined,
          display_name: p.display_name ?? undefined,
          avatar_url: p.avatar_url ?? undefined,
        });
      });

      // Transform the data to match our interface
      const transformedContacts = contactsData.map((contact: any) => ({
        ...contact,
        profile: profileMap.get(contact.contact_user_id) || undefined,
      }));

      setContacts(transformedContacts as Contact[]);

      // Backfill contacts from any accepted conversations that don't yet exist
      const backfilled = await backfillContactsFromAcceptedConversations(transformedContacts as Contact[]);
      if (backfilled) {
        // Refresh to include newly created contact rows
        await fetchContacts();
        return;
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const addContact = async (contactUserId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('contacts')
        .insert({
          user_id: user.id,
          contact_user_id: contactUserId,
        });

      if (error) {
        // Handle unique constraint violation gracefully (already added)
        // Postgres error code 23505 = unique_violation
        // Treat as success: refresh list and notify
        // @ts-ignore - supabase error has 'code'
        const code = (error as any)?.code;
        if (code === '23505') {
          await fetchContacts();
          toast({
            title: "Already in contacts",
            description: "This user is already in your contacts.",
          });
          return true;
        }
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Contact Added",
        description: "Contact has been added successfully",
      });
      
      await fetchContacts(); // Refresh the list
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add contact",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeContact = async (contactUserId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('user_id', user.id)
        .eq('contact_user_id', contactUserId);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Contact Removed",
        description: "Contact has been removed",
      });
      
      await fetchContacts(); // Refresh the list
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove contact",
        variant: "destructive",
      });
      return false;
    }
  };

  const searchUsersByUsername = async (searchTerm: string) => {
    // Input validation and sanitization
    const sanitizedTerm = searchTerm.trim().slice(0, 50); // Limit length
    if (sanitizedTerm.length < 2) return []; // Minimum search length

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);

    return new Promise<any[]>((resolve) => {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const { data, error } = await supabase
            .rpc('search_users_by_query_secure', { search_term: sanitizedTerm });

          if (error) {
            console.error('Search error occurred');
            resolve([]);
            return;
          }

          resolve(data || []);
        } catch (error) {
          console.error('Search error occurred');
          resolve([]);
        } finally {
          setIsSearching(false);
        }
      }, 300); // 300ms debounce
    });
  };

  return {
    contacts,
    loading,
    addContact,
    removeContact,
    searchUsersByUsername,
    fetchContacts,
    isSearching,
  };
};