import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminOverview } from "@/components/admin/AdminOverview";
import AdminComparison from "./AdminComparison";
import AdminAnalytics from "./AdminAnalytics";
import AdminValidation from "./AdminValidation";
import AdminTracking from "./AdminTracking";
import AdminVerticals from "./AdminVerticals";
import AdminRoles from "./AdminRoles";
import AdminCandidates from "./AdminCandidates";
import AdminActivityLog from "./AdminActivityLog";
import { Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { RoleProvider } from "@/contexts/RoleContext";
import { useActivityLogger } from "@/hooks/useActivityLogger";

const AdminContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  useActivityLogger();

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      // Check if user has any privileged role
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const privilegedRoles = ["admin", "super_admin", "chair", "co_chair", "em"];
      const hasAccess = userRoles && privilegedRoles.includes(userRoles.role);

      if (!hasAccess) {
        navigate("/access-denied");
        return;
      }

      setIsAuthorized(true);
      setLoading(false);
    };

    checkAccess();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const getPageComponent = () => {
    if (location.pathname === "/admin/candidates") return <AdminCandidates />;
    if (location.pathname === "/admin/comparison") return <AdminComparison />;
    if (location.pathname === "/admin/analytics") return <AdminAnalytics />;
    if (location.pathname === "/admin/validation") return <AdminValidation />;
    if (location.pathname === "/admin/tracking") return <AdminTracking />;
    if (location.pathname === "/admin/verticals") return <AdminVerticals />;
    if (location.pathname === "/admin/roles") return <AdminRoles />;
    if (location.pathname === "/admin/activity-log") return <AdminActivityLog />;
    return <AdminOverview />;
  };

  const getBreadcrumb = () => {
    if (location.pathname === "/admin/candidates") return "Candidates";
    if (location.pathname === "/admin/comparison") return "Comparison";
    if (location.pathname === "/admin/analytics") return "Analytics";
    if (location.pathname === "/admin/validation") return "Validation";
    if (location.pathname === "/admin/tracking") return "Tracking";
    if (location.pathname === "/admin/verticals") return "Verticals";
    if (location.pathname === "/admin/roles") return "User Roles";
    if (location.pathname === "/admin/activity-log") return "Activity Log";
    return "Overview";
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader breadcrumb={getBreadcrumb()} />
          <main className="flex-1 overflow-auto">
            {getPageComponent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const Admin = () => {
  return (
    <RoleProvider>
      <AdminContent />
    </RoleProvider>
  );
};

export default Admin;
