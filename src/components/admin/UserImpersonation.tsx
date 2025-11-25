import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";

export function UserImpersonation() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isSuperAdmin } = useRole();
  const { startImpersonation } = useImpersonation();

  if (!isSuperAdmin) {
    return null;
  }

  const handleImpersonate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      setLoading(true);

      // Check if user exists
      const { data: userData, error: userError } = await supabase
        .rpc("get_user_by_email", { user_email: email.trim().toLowerCase() });

      if (userError || !userData || userData.length === 0) {
        toast.error("User not found");
        return;
      }

      const targetUser = userData[0];

      // Start server-side impersonation session
      const success = await startImpersonation(targetUser.id, email.trim().toLowerCase());
      
      if (success) {
        setOpen(false);
        setEmail("");
        navigate("/");
        window.location.reload();
      }
    } catch (error) {
      console.error("Error impersonating user:", error);
      toast.error("Failed to impersonate user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserCircle className="h-4 w-4" />
          Login As User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Impersonate User
          </DialogTitle>
          <DialogDescription>
            Login as any user to test their experience. All actions will be logged.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Warning: You will be viewing and acting as this user. Use responsibly and only for testing purposes.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleImpersonate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-email">User Email</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Impersonating..." : "Impersonate User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
