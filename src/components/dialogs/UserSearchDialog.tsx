import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { useToast } from "@/hooks/use-toast";
import { useRateLimit } from "@/hooks/useRateLimit";

interface UserSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  user_id: string;
  username: string;
  display_name: string;
}

export const UserSearchDialog = ({ open, onOpenChange }: UserSearchDialogProps) => {
  const { user } = useAuth();
  const { addContact } = useContacts();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Rate limiting: 10 searches per minute
  const searchRateLimit = useRateLimit({
    maxAttempts: 10,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 30 * 1000 // 30 second block
  });

  useEffect(() => {
    if (searchTerm.trim()) {
      const timeoutId = setTimeout(() => searchUsers(searchTerm), 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const searchUsers = async (query: string) => {
    if (!query.trim() || !user) return;

    // Input validation and sanitization
    const sanitizedQuery = query.trim().slice(0, 50); // Limit length
    if (sanitizedQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    // Rate limiting check
    if (!searchRateLimit.checkRateLimit()) {
      toast({
        title: "Too Many Requests",
        description: `Please wait ${searchRateLimit.getRemainingTime()} seconds before searching again.`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('search_users_by_query_secure', { search_term: sanitizedQuery });

      if (error) {
        console.error('Search error:', error);
        toast({
          title: "Search Error",
          description: "Unable to search users. Please try again later.",
          variant: "destructive"
        });
        return;
      }

      setSearchResults(data || []);
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "Search Failed",
        description: "Network error. Please check your connection.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (contactUserId: string, username: string) => {
    const success = await addContact(contactUserId);
    if (success) {
      toast({
        title: "Contact Added",
        description: `${username} has been added to your contacts`,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>
            Search for users to add to your contacts.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username, name, or phone number..."
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value.slice(0, 50); // Limit input length
                setSearchTerm(value);
              }}
              className="pl-9"
              maxLength={50}
              disabled={searchRateLimit.isBlocked}
            />
            {searchRateLimit.isBlocked && (
              <div className="flex items-center gap-2 text-sm text-destructive mt-1">
                <AlertTriangle className="h-4 w-4" />
                Too many requests. Wait {searchRateLimit.getRemainingTime()}s
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {/* Search Results */}
          {!loading && searchResults.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map((result) => (
                <div
                  key={result.user_id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>
                        {result.display_name?.charAt(0) || result.username?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {result.display_name || result.username}
                      </p>
                      {result.display_name && (
                        <p className="text-sm text-muted-foreground">
                          @{result.username}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddContact(result.user_id, result.username)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {!loading && searchTerm && searchResults.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No users found
            </div>
          )}

          {/* Instructions */}
          {!searchTerm && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Search for users by username, display name, or phone number
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};