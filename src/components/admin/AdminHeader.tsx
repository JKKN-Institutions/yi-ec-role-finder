import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LogOut, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { RoleSwitcher } from "./RoleSwitcher";
import { UserImpersonation } from "./UserImpersonation";
import { useRole } from "@/contexts/RoleContext";
import { ROLE_LABELS } from "@/lib/roleHierarchy";

interface AdminHeaderProps {
  breadcrumb: string;
}

export function AdminHeader({ breadcrumb }: AdminHeaderProps) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const { activeRole, isSuperAdmin } = useRole();

  useEffect(() => {
    const loadUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.email?.split("@")[0] || "Admin");
      }
    };

    loadUserInfo();
  }, []);

  const handleLogout = async () => {
    // Log logout activity
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.rpc("log_admin_action", {
        _admin_user_id: user.id,
        _admin_email: user.email || "",
        _action_type: "logout",
      });
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to logout");
    } else {
      localStorage.removeItem("activeRole");
      toast.success("Logged out successfully");
      navigate("/login");
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
      <SidebarTrigger />
      
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Dashboard</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{breadcrumb}</span>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <RoleSwitcher />
        {isSuperAdmin && <UserImpersonation />}
        
        <div className="text-right">
          <p className="text-sm font-medium">{userName}</p>
          {activeRole && (
            <Badge variant="secondary" className="text-xs">
              {ROLE_LABELS[activeRole]}
            </Badge>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
