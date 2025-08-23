import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  const fetchContacts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          id,
          user_id,
          contact_user_id,
          created_at,
          profiles!contacts_contact_user_id_fkey(
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching contacts:', error);
        return;
      }

      // Transform the data to match our interface
      const transformedContacts = (data || []).map(contact => ({
        ...contact,
        profile: contact.profiles
      }));

      setContacts(transformedContacts as Contact[]);
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
    if (!searchTerm.trim()) return [];

    try {
      const { data, error } = await supabase
        .rpc('search_users_by_username', { search_term: searchTerm });

      if (error) {
        console.error('Error searching users:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  };

  return {
    contacts,
    loading,
    addContact,
    removeContact,
    searchUsersByUsername,
    fetchContacts,
  };
};