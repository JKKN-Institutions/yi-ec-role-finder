import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { 
  Users, 
  Loader2, 
  Shield, 
  UserPlus, 
  UserMinus,
  Mail,
  Calendar
} from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppRole, ROLE_LABELS } from "@/lib/roleHierarchy";
import { format } from "date-fns";

type UserWithRoles = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: AppRole[];
};

const UserManagement = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"assign" | "revoke">("assign");
  const [processing, setProcessing] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { activeRole, isSuperAdmin, isLoading: roleLoading } = useRole();

  useEffect(() => {
    // Check permissions - only check activeRole to respect impersonation
    if (!roleLoading && activeRole !== "super_admin") {
      toast({
        title: "Access Denied",
        description: "Only Super Admins can access user management",
        variant: "destructive",
      });
      navigate("/admin");
    }
  }, [activeRole, roleLoading, navigate, toast]);

  useEffect(() => {
    // Only load data if actively viewing as super_admin (respects impersonation)
    if (activeRole === "super_admin") {
      loadUsers();

      // Subscribe to realtime updates
      const channel = supabase
        .channel("user-management-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_roles",
          },
          () => {
            loadUsers();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
          },
          () => {
            loadUsers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Get auth users to get emails
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error("Not authenticated");
      }

      // Fetch user emails using the edge function
      const userEmails: Record<string, string> = {};
      
      for (const profile of profiles || []) {
        const { data, error } = await supabase.functions.invoke("manage-user-roles", {
          body: { 
            action: "get_user_email",
            userId: profile.id 
          },
        });

        if (!error && data?.email) {
          userEmails[profile.id] = data.email;
        }
      }

      // Combine data
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => {
        const roles = (userRoles || [])
          .filter((ur) => ur.user_id === profile.id)
          .map((ur) => ur.role as AppRole);

        return {
          id: profile.id,
          email: userEmails[profile.id] || "Unknown",
          full_name: profile.full_name,
          created_at: profile.created_at,
          roles,
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast({
        title: "Error loading users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (user: UserWithRoles, type: "assign" | "revoke") => {
    setSelectedUser(user);
    setActionType(type);
    setSelectedRole(null);
    setDialogOpen(true);
  };

  const handleRoleAction = async () => {
    if (!selectedUser || !selectedRole) return;

    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke("manage-user-roles", {
        body: {
          action: actionType === "assign" ? "assign_role" : "revoke_role",
          userId: selectedUser.id,
          role: selectedRole,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role ${actionType === "assign" ? "assigned" : "revoked"} successfully`,
      });

      setDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      console.error("Error managing role:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (activeRole !== "super_admin") {
    return null;
  }

  const availableRoles: AppRole[] = ["admin", "chair", "co_chair", "em", "user", "super_admin"];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader breadcrumb="User Management" />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Users className="h-8 w-8 text-primary" />
                    User Management
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Manage user roles and permissions
                  </p>
                </div>
                <Badge className="bg-red-600 text-white">Super Admin Only</Badge>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>
                    View and manage user roles and permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.full_name || "No name"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              {user.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {user.roles.length === 0 ? (
                                <Badge variant="outline">No roles</Badge>
                              ) : (
                                user.roles.map((role) => (
                                  <Badge
                                    key={role}
                                    variant={role === "super_admin" ? "default" : "secondary"}
                                  >
                                    {ROLE_LABELS[role]}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(user.created_at), "MMM dd, yyyy")}
                            </div>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDialog(user, "assign")}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Assign Role
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDialog(user, "revoke")}
                              disabled={user.roles.length === 0}
                            >
                              <UserMinus className="h-4 w-4 mr-1" />
                              Revoke Role
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {actionType === "assign" ? "Assign Role" : "Revoke Role"}
                    </DialogTitle>
                    <DialogDescription>
                      {actionType === "assign"
                        ? `Assign a new role to ${selectedUser?.full_name || selectedUser?.email}`
                        : `Revoke a role from ${selectedUser?.full_name || selectedUser?.email}`}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">User</label>
                      <div className="p-3 bg-muted rounded-md">
                        <div className="font-medium">{selectedUser?.full_name || "No name"}</div>
                        <div className="text-sm text-muted-foreground">{selectedUser?.email}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {actionType === "assign" ? "Role to Assign" : "Role to Revoke"}
                      </label>
                      <Select
                        value={selectedRole || ""}
                        onValueChange={(value) => setSelectedRole(value as AppRole)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {(actionType === "assign"
                            ? availableRoles.filter((r) => !selectedUser?.roles.includes(r))
                            : selectedUser?.roles || []
                          ).map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      disabled={processing}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRoleAction}
                      disabled={!selectedRole || processing}
                    >
                      {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {actionType === "assign" ? "Assign" : "Revoke"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default UserManagement;
