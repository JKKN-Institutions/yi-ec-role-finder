import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/lib/roleHierarchy";

interface RoleContextType {
  activeRole: AppRole | null;
  availableRoles: AppRole[];
  switchRole: (role: AppRole) => void;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within RoleProvider");
  }
  return context;
};

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [activeRole, setActiveRole] = useState<AppRole | null>(null);
  const [availableRoles, setAvailableRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserRoles();
  }, []);

  const loadUserRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (roles && roles.length > 0) {
        const userRoles = roles.map((r) => r.role as AppRole);
        setAvailableRoles(userRoles);

        // Get stored active role or use highest role
        const storedRole = localStorage.getItem("activeRole") as AppRole;
        const defaultRole = storedRole && userRoles.includes(storedRole)
          ? storedRole
          : userRoles[0];

        setActiveRole(defaultRole);
      }
    } catch (error) {
      console.error("Error loading user roles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = (role: AppRole) => {
    if (availableRoles.includes(role)) {
      setActiveRole(role);
      localStorage.setItem("activeRole", role);
      
      // Log role switch
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.rpc("log_admin_action", {
            _admin_user_id: user.id,
            _admin_email: user.email || "",
            _action_type: "role_switch",
            _details: { new_role: role },
          });
        }
      });
    }
  };

  return (
    <RoleContext.Provider value={{ activeRole, availableRoles, switchRole, isLoading }}>
      {children}
    </RoleContext.Provider>
  );
};
