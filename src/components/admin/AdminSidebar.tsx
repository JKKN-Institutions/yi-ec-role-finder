import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  GitCompare,
  BarChart3,
  CheckCircle,
  Activity,
  Layers,
  UserCog,
  Shield,
  Bell,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "Candidates", url: "/admin/candidates", icon: Users, showBadge: true },
  { title: "Comparison", url: "/admin/comparison", icon: GitCompare },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Validation", url: "/admin/validation", icon: CheckCircle },
  { title: "Tracking", url: "/admin/tracking", icon: Activity },
  { title: "Verticals", url: "/admin/verticals", icon: Layers },
  { title: "User Roles", url: "/admin/roles", icon: UserCog },
  { title: "Audit Log", url: "/admin/audit", icon: Shield },
];

export function AdminSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const [userId, setUserId] = useState<string | undefined>();
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
    };
    getUser();
  }, []);

  const { pendingCount, notificationsEnabled, requestNotificationPermission } = useNotifications(userId);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = item.end 
                  ? location.pathname === item.url
                  : location.pathname.startsWith(item.url);
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink 
                        to={item.url} 
                        end={item.end}
                        className="flex items-center gap-3"
                      >
                        <item.icon className="h-4 w-4" />
                        {open && <span>{item.title}</span>}
                        {item.showBadge && pendingCount > 0 && (
                          <Badge variant="destructive" className="ml-auto">
                            {pendingCount}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {open && !notificationsEnabled && (
          <div className="p-4 mt-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={requestNotificationPermission}
              className="w-full"
            >
              <Bell className="h-4 w-4 mr-2" />
              Enable Notifications
            </Button>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
