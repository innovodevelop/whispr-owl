import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { Loader2, UserX } from "lucide-react";

interface BlockedUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BlockedUsersDialog = ({ open, onOpenChange }: BlockedUsersDialogProps) => {
  const { blockedUsers, loading, unblockUser } = useBlockedUsers();

  const handleUnblock = async (userId: string) => {
    await unblockUser(userId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-96">
        <DialogHeader>
          <DialogTitle>Blocked Users</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading blocked users...</span>
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No blocked users</p>
            </div>
          ) : (
            blockedUsers.map((blockedUser) => (
              <div key={blockedUser.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {blockedUser.blocked_user_id.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">User {blockedUser.blocked_user_id.substring(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      Blocked {new Date(blockedUser.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnblock(blockedUser.blocked_user_id)}
                >
                  Unblock
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};