import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GitCompare,
  BarChart3,
  CheckCircle,
  Activity,
  Layers,
  UserCog,
  FileText,
  Shield,
  UsersRound,
} from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { hasPermission } from "@/lib/roleHierarchy";
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

const navigationItems = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard, end: true, permission: null },
  { title: "Super Dashboard", url: "/admin/super-dashboard", icon: Shield, permission: "manage_system_settings" },
  { title: "User Management", url: "/admin/user-management", icon: UsersRound, permission: "manage_system_settings" },
  { title: "Candidates", url: "/admin/candidates", icon: Users, permission: "manage_candidates" },
  { title: "Comparison", url: "/admin/comparison", icon: GitCompare, permission: "view_all_assessments" },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3, permission: "view_all_assessments" },
  { title: "Validation", url: "/admin/validation", icon: CheckCircle, permission: "view_all_assessments" },
  { title: "Tracking", url: "/admin/tracking", icon: Activity, permission: "view_all_assessments" },
  { title: "Verticals", url: "/admin/verticals", icon: Layers, permission: "manage_verticals" },
  { title: "User Roles", url: "/admin/roles", icon: UserCog, permission: "manage_roles" },
  { title: "Activity Log", url: "/admin/activity-log", icon: FileText, permission: "view_audit_logs" },
];

export function AdminSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { activeRole } = useRole();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                // Check if user has permission to see this item
                if (item.permission && activeRole && !hasPermission(activeRole, item.permission)) {
                  return null;
                }

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
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
