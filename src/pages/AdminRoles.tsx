import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Edit, Trash2, Download, Info, Copy, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

type UserWithRoles = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
};

const ROLE_COLORS: { [key: string]: string } = {
  super_admin: "bg-red-600",
  admin: "bg-red-500",
  chair: "bg-blue-500",
  co_chair: "bg-purple-500",
  em: "bg-green-500",
  user: "bg-gray-500",
};

const ROLE_DESCRIPTIONS = {
  super_admin: {
    title: "Super Admin",
    description: "Ultimate system access. Can manage all users, roles, chapters, and system settings. Can impersonate any role.",
  },
  admin: {
    title: "Admin",
    description: "Full system access. Can manage users, verticals, all candidates, export data, and modify settings.",
  },
  chair: {
    title: "Chair",
    description: "Dashboard access to all tabs. Can review candidates, update statuses, add feedback and tracking. Cannot manage users or verticals.",
  },
  co_chair: {
    title: "Co-Chair",
    description: "Same as Chair. Typically 2-3 Co-Chairs per term.",
  },
  em: {
    title: "EM (Executive Member)",
    description: "Dashboard view access. Can view candidates and analytics. Read-only access, cannot modify data or settings.",
  },
  user: {
    title: "User",
    description: "Basic access. Can take assessments and view own results.",
  },
};

const AdminRoles = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [addingUser, setAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [removingUser, setRemovingUser] = useState<UserWithRoles | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [generatedPassword, setGeneratedPassword] = useState<string>("");
  const [resetPassword, setResetPassword] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get all users who have submitted assessments
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from("assessments")
        .select("user_email, user_name, created_at");

      if (assessmentsError) throw assessmentsError;

      // Get unique emails and their earliest submission
      const emailMap = new Map<string, { email: string; name: string; created_at: string }>();
      assessmentsData?.forEach((assessment: any) => {
        if (!emailMap.has(assessment.user_email)) {
          emailMap.set(assessment.user_email, {
            email: assessment.user_email,
            name: assessment.user_name,
            created_at: assessment.created_at,
          });
        }
      });

      // Get all roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Get all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, created_at");

      if (profilesError) throw profilesError;

      // Create a map of email -> user_id from profiles (we need to match by name since we don't have email in profiles)
      const profilesByName = new Map(profilesData?.map((p: any) => [p.full_name, p]) || []);

      // Combine the data
      const usersArray: UserWithRoles[] = Array.from(emailMap.values()).map(({ email, name, created_at }) => {
        const profile = profilesByName.get(name);
        const userId = profile?.id || "";
        const userRoles = rolesData?.filter(r => r.user_id === userId).map(r => r.role) || [];

        return {
          id: userId,
          email,
          full_name: name,
          created_at,
          last_sign_in_at: null,
          roles: userRoles,
        };
      });

      setUsers(usersArray);

      // Load audit log
      const { data: auditData } = await supabase
        .from("user_role_audit")
        .select("*, profiles!user_role_audit_affected_user_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(50);

      setAuditLog(auditData || []);
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const generatePassword = () => {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setGeneratedPassword(password);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    toast({ title: "Password copied to clipboard" });
  };

  const generateResetPassword = () => {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setResetPassword(password);
  };

  const copyResetPassword = () => {
    navigator.clipboard.writeText(resetPassword);
    toast({ title: "Password copied to clipboard" });
  };

  const sendPasswordResetEmail = async (userEmail: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({ 
        title: "Password reset email sent", 
        description: `A password reset link has been sent to ${userEmail}` 
      });
    } catch (error: any) {
      toast({ 
        title: "Error sending reset email", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const resetUserPassword = async () => {
    if (!editingUser || !resetPassword) {
      toast({ title: "Error", description: "Please generate a password first", variant: "destructive" });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-user-roles', {
        body: {
          action: 'reset_password',
          email: editingUser.email,
          password: resetPassword
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Failed to reset password');

      toast({ title: "Password reset successfully! Share the new password with the user." });
      setResetPassword("");
    } catch (error: any) {
      toast({ title: "Error resetting password", description: error.message, variant: "destructive" });
    }
  };

  const addUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const fullName = formData.get("full_name") as string;
    const password = formData.get("password") as string;
    const roles: string[] = [];

    if (formData.get("role_admin")) roles.push("admin");
    if (formData.get("role_chair")) roles.push("chair");
    if (formData.get("role_co_chair")) roles.push("co_chair");
    if (formData.get("role_em")) roles.push("em");

    if (roles.length === 0) {
      toast({ title: "Error", description: "Select at least one role", variant: "destructive" });
      return;
    }

    if (!password) {
      toast({ title: "Error", description: "Please generate a password", variant: "destructive" });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-user-roles', {
        body: {
          action: 'update_roles',
          email,
          fullName,
          password,
          roles
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Failed to create user');

      toast({ title: "User created successfully! Share the password with them." });
      loadData();
      setAddingUser(false);
      setGeneratedPassword("");
    } catch (error: any) {
      toast({ title: "Error creating user", description: error.message, variant: "destructive" });
    }
  };

  const updateUserRoles = async () => {
    if (!editingUser) return;

    const formElement = document.querySelector("form[data-edit-roles]") as HTMLFormElement;
    if (!formElement) return;

    const formData = new FormData(formElement);
    const newRoles: string[] = [];

    if (formData.get("role_admin")) newRoles.push("admin");
    if (formData.get("role_chair")) newRoles.push("chair");
    if (formData.get("role_co_chair")) newRoles.push("co_chair");
    if (formData.get("role_em")) newRoles.push("em");

    try {
      const { data, error } = await supabase.functions.invoke('manage-user-roles', {
        body: {
          action: 'update_roles',
          email: editingUser.email,
          fullName: editingUser.full_name,
          roles: newRoles
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Failed to update roles');

      toast({ title: `Roles updated for ${editingUser.full_name || editingUser.email}` });
      loadData();
      setEditingUser(null);
    } catch (error: any) {
      toast({ title: "Error updating roles", description: error.message, variant: "destructive" });
    }
  };

  const removeAccess = async () => {
    if (!removingUser) return;

    try {
      const { data, error } = await supabase.functions.invoke('manage-user-roles', {
        body: {
          action: 'remove_roles',
          email: removingUser.email
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Failed to remove roles');

      toast({ title: `${removingUser.full_name || removingUser.email} removed from admin access` });
      loadData();
      setRemovingUser(null);
    } catch (error: any) {
      toast({ title: "Error removing access", description: error.message, variant: "destructive" });
    }
  };

  const exportUsers = () => {
    const csvData = [
      ["Name", "Email", "Roles", "Created Date"],
      ...users.map(u => [
        u.full_name || "",
        u.email,
        u.roles.join("; "),
        format(new Date(u.created_at), "yyyy-MM-dd"),
      ]),
    ]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "admin-users.csv";
    a.click();
    toast({ title: "Users exported" });
  };

  const getSortedUsers = () => {
    let filtered = [...users];

    if (roleFilter !== "all") {
      if (roleFilter === "none") {
        filtered = filtered.filter(u => u.roles.length === 0);
      } else {
        filtered = filtered.filter(u => u.roles.includes(roleFilter));
      }
    }

    filtered.sort((a, b) => {
      if (sortBy === "name") return (a.full_name || a.email).localeCompare(b.full_name || b.email);
      if (sortBy === "email") return a.email.localeCompare(b.email);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return filtered;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sortedUsers = getSortedUsers();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Roles Management</h1>
          <p className="text-muted-foreground">Assign admin roles to assessment submitters</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={addingUser} onOpenChange={(open) => {
            setAddingUser(open);
            if (!open) setGeneratedPassword("");
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Admin User</DialogTitle>
                <DialogDescription>Create a new admin user with dashboard access</DialogDescription>
              </DialogHeader>
              <form onSubmit={addUser}>
                <div className="space-y-4">
                  <div>
                    <Label>Email *</Label>
                    <Input name="email" type="email" required placeholder="admin@example.com" />
                  </div>
                  <div>
                    <Label>Full Name *</Label>
                    <Input name="full_name" required placeholder="John Doe" />
                  </div>
                  <div>
                    <Label>Password *</Label>
                    <div className="flex gap-2">
                      <Input 
                        name="password" 
                        type="text" 
                        value={generatedPassword}
                        onChange={(e) => setGeneratedPassword(e.target.value)}
                        required 
                        placeholder="Click Generate to create password"
                        className="font-mono"
                      />
                      <Button type="button" variant="outline" onClick={generatePassword}>
                        Generate
                      </Button>
                      {generatedPassword && (
                        <Button type="button" variant="outline" onClick={copyPassword} size="icon">
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {generatedPassword && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Copy this password and share it with the user. They can change it after logging in.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Initial Roles (select 1+) *</Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox name="role_admin" id="add-role-admin" />
                        <Label htmlFor="add-role-admin" className="font-normal">
                          Admin - Full system access
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox name="role_chair" id="add-role-chair" />
                        <Label htmlFor="add-role-chair" className="font-normal">
                          Chair - Dashboard access, no user management
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox name="role_co_chair" id="add-role-co-chair" />
                        <Label htmlFor="add-role-co-chair" className="font-normal">
                          Co-Chair - Same as Chair
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox name="role_em" id="add-role-em" />
                        <Label htmlFor="add-role-em" className="font-normal">
                          EM - Read-only dashboard access
                        </Label>
                      </div>
                    </div>
                  </div>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Generate a secure password and share it with the user directly
                    </AlertDescription>
                  </Alert>
                </div>
                <DialogFooter className="mt-4">
                  <Button type="submit">Create Admin User</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={exportUsers}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{users.filter(u => u.roles.includes("admin")).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Chairs & Co-Chairs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {users.filter(u => u.roles.includes("chair") || u.roles.includes("co_chair")).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>EMs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{users.filter(u => u.roles.includes("em")).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Descriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(ROLE_DESCRIPTIONS).map(([key, desc]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={ROLE_COLORS[key]}>{desc.title}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{desc.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-4">
        <div>
          <Label>Filter by Role</Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="none">No Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="chair">Chair</SelectItem>
              <SelectItem value="co_chair">Co-Chair</SelectItem>
              <SelectItem value="em">EM</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Sort by</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="created_at">Created Date</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="email">Email (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                  <TableCell>{user.email || "—"}</TableCell>
                   <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.length > 0 ? (
                        user.roles.map(role => (
                          <Badge key={role} className={ROLE_COLORS[role]}>
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No roles</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(user.created_at), "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => sendPasswordResetEmail(user.email)}
                        title="Send password reset email"
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Reset
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Manage
                      </Button>
                      {user.roles.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRemovingUser(user)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Roles Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => {
        setEditingUser(null);
        setResetPassword("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Roles</DialogTitle>
            <DialogDescription>
              Update roles for {editingUser?.full_name || editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form data-edit-roles>
               <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Current roles:</p>
                  <div className="flex gap-1 flex-wrap">
                    {editingUser.roles.length > 0 ? (
                      editingUser.roles.map(role => (
                        <Badge key={role} className={ROLE_COLORS[role]}>
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No roles assigned</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Update Roles</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        name="role_admin"
                        id="edit-role-admin"
                        defaultChecked={editingUser.roles.includes("admin")}
                      />
                      <Label htmlFor="edit-role-admin" className="font-normal">
                        Admin
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        name="role_chair"
                        id="edit-role-chair"
                        defaultChecked={editingUser.roles.includes("chair")}
                      />
                      <Label htmlFor="edit-role-chair" className="font-normal">
                        Chair
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        name="role_co_chair"
                        id="edit-role-co-chair"
                        defaultChecked={editingUser.roles.includes("co_chair")}
                      />
                      <Label htmlFor="edit-role-co-chair" className="font-normal">
                        Co-Chair
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        name="role_em"
                        id="edit-role-em"
                        defaultChecked={editingUser.roles.includes("em")}
                      />
                      <Label htmlFor="edit-role-em" className="font-normal">
                        EM
                      </Label>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <Label>Password Management</Label>
                  <p className="text-xs text-muted-foreground mb-3">Choose how to reset the user's password</p>
                  
                  <div className="mb-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => sendPasswordResetEmail(editingUser.email)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send Password Reset Email
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      User will receive an email with a secure reset link
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or set manually</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Generate and set a new password directly</p>
                    <div className="flex gap-2">
                      <Input 
                        type="text" 
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="Click Generate to create password"
                        className="font-mono"
                      />
                      <Button type="button" variant="outline" onClick={generateResetPassword}>
                        Generate
                      </Button>
                      {resetPassword && (
                        <>
                          <Button type="button" variant="outline" onClick={copyResetPassword} size="icon">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button type="button" onClick={resetUserPassword}>
                            Reset
                          </Button>
                        </>
                      )}
                    </div>
                    {resetPassword && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Click Reset to update the password, then share it with the user.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" onClick={updateUserRoles}>
                  Update Roles
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Access Confirmation */}
      <AlertDialog open={!!removingUser} onOpenChange={() => setRemovingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove All Roles?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke all admin roles for {removingUser?.full_name || removingUser?.email}.
              <br />
              <br />
              They will no longer have access to the admin dashboard, but can still complete assessments as a candidate.
              <br />
              <br />
              You can re-assign roles to them at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removeAccess}>Remove Access</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Audit Log */}
      {auditLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Audit log of role management actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLog.slice(0, 10).map(log => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.created_at), "MMM dd, yyyy HH:mm")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {log.action.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.profiles?.full_name || "Unknown"}</TableCell>
                    <TableCell>{log.role_name || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminRoles;
