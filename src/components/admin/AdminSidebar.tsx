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

const navigationItems = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "Candidates", url: "/admin/candidates", icon: Users },
  { title: "Comparison", url: "/admin/comparison", icon: GitCompare },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Validation", url: "/admin/validation", icon: CheckCircle },
  { title: "Tracking", url: "/admin/tracking", icon: Activity },
  { title: "Verticals", url: "/admin/verticals", icon: Layers },
  { title: "User Roles", url: "/admin/roles", icon: UserCog },
];

export function AdminSidebar() {
  const { open } = useSidebar();
  const location = useLocation();

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
