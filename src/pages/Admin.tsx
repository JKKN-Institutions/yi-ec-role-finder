import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminOverview } from "@/components/admin/AdminOverview";
import AdminComparison from "./AdminComparison";
import { Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";

const Admin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      // Check if user has admin role
      const { data: isAdmin } = await supabase.rpc("is_admin_user", {
        _user_id: user.id,
      });

      if (!isAdmin) {
        navigate("/login");
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

  const isComparisonPage = location.pathname === "/admin/comparison";
  const breadcrumb = isComparisonPage ? "Comparison" : "Overview";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader breadcrumb={breadcrumb} />
          <main className="flex-1 overflow-auto">
            {isComparisonPage ? <AdminComparison /> : <AdminOverview />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
