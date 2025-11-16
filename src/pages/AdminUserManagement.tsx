import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Mail, Shield } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Chapter {
  id: string;
  name: string;
  chapter_type: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  chapter_id: string | null;
  email: string;
  chapter_name?: string;
}

const AdminUserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRole[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("admin");
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([loadUsers(), loadChapters()]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load user management data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const { data: rolesData, error } = await supabase
      .from("user_roles" as any)
      .select(`
        id,
        user_id,
        role,
        chapter_id
      `)
      .order("role");

    if (error) throw error;

    // Get user emails
    const userIds = [...new Set((rolesData as any || []).map((r: any) => r.user_id))];
    const { data: usersData } = await supabase.auth.admin.listUsers();
    
    const userMap = new Map(
      (usersData?.users || []).map(u => [u.id, u.email || "Unknown"])
    );

    // Get chapter names
    const chapterIds = (rolesData as any || [])
      .filter((r: any) => r.chapter_id)
      .map((r: any) => r.chapter_id);
    
    const { data: chaptersData } = await supabase
      .from("chapters" as any)
      .select("id, name")
      .in("id", chapterIds);

    const chapterMap = new Map(
      (chaptersData as any || []).map(c => [c.id, c.name])
    );

    const enrichedUsers = (rolesData as any || []).map((role: any) => ({
      ...role,
      email: userMap.get(role.user_id) || "Unknown",
      chapter_name: role.chapter_id ? chapterMap.get(role.chapter_id) : "All Chapters"
    }));

    setUsers(enrichedUsers);
  };

  const loadChapters = async () => {
    const { data, error } = await supabase
      .from("chapters" as any)
      .select("id, name, chapter_type")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    setChapters((data as any) || []);
  };

  const handleInviteUser = async () => {
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please provide email and password",
        variant: "destructive"
      });
      return;
    }

    if (selectedRole !== "super_admin" && !selectedChapter) {
      toast({
        title: "Missing Chapter",
        description: "Please select a chapter for this role",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Create user using edge function
      const response = await supabase.functions.invoke("manage-user-roles", {
        body: {
          action: "update_roles",
          email,
          password,
          roles: [{ role: selectedRole, chapter_id: selectedRole === "super_admin" ? null : selectedChapter }]
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: "User invited successfully"
      });

      setIsDialogOpen(false);
      resetForm();
      await loadUsers();
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to invite user",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveUser = async (userId: string, email: string) => {
    try {
      const response = await supabase.functions.invoke("manage-user-roles", {
        body: {
          action: "remove_roles",
          email
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: "User access removed"
      });

      await loadUsers();
    } catch (error: any) {
      console.error("Error removing user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove user",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setSelectedRole("admin");
    setSelectedChapter("");
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin": return "default";
      case "admin": return "secondary";
      case "chair": return "outline";
      case "co_chair": return "outline";
      default: return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: "Super Admin",
      admin: "Admin",
      chair: "Chair",
      co_chair: "Co-Chair",
      em: "EM"
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground mt-1">
            Manage admin users and their permissions
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>
                Create a new admin user and assign their role and chapter
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="password">Temporary Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="chair">Chair</SelectItem>
                    <SelectItem value="co_chair">Co-Chair</SelectItem>
                    <SelectItem value="em">EM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedRole !== "super_admin" && (
                <div>
                  <Label htmlFor="chapter">Chapter</Label>
                  <Select value={selectedChapter} onValueChange={setSelectedChapter}>
                    <SelectTrigger id="chapter">
                      <SelectValue placeholder="Select a chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters.map(chapter => (
                        <SelectItem key={chapter.id} value={chapter.id}>
                          {chapter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                onClick={handleInviteUser}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? "Inviting..." : "Send Invitation"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Users</CardTitle>
          <CardDescription>
            All users with administrative access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        <Shield className="h-3 w-3 mr-1" />
                        {getRoleLabel(user.role)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        • {user.chapter_name}
                      </span>
                    </div>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove User Access</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove {user.email}'s access?
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRemoveUser(user.user_id, user.email)}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Remove Access
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUserManagement;