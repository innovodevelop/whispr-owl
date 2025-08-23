import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface BlockedUser {
  id: string;
  user_id: string;
  blocked_user_id: string;
  created_at: string;
  profile?: {
    username: string;
    display_name: string;
  };
}

export const useBlockedUsers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBlockedUsers();
    }
  }, [user]);

  const fetchBlockedUsers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select(`
          id,
          user_id,
          blocked_user_id,
          created_at
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching blocked users:', error);
        return;
      }

      setBlockedUsers(data || []);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  const blockUser = async (blockedUserId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          user_id: user.id,
          blocked_user_id: blockedUserId,
        });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      await fetchBlockedUsers();
      toast({
        title: "User blocked",
        description: "The user has been blocked successfully",
      });
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive",
      });
      return false;
    }
  };

  const unblockUser = async (blockedUserId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('user_id', user.id)
        .eq('blocked_user_id', blockedUserId);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      await fetchBlockedUsers();
      toast({
        title: "User unblocked",
        description: "The user has been unblocked successfully",
      });
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unblock user",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    blockedUsers,
    loading,
    blockUser,
    unblockUser,
    fetchBlockedUsers,
  };
};