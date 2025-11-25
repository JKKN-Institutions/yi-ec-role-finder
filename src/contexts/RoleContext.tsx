import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole, ROLE_HIERARCHY } from "@/lib/roleHierarchy";

interface RoleContextType {
  activeRole: AppRole | null;
  availableRoles: AppRole[];
  isSuperAdmin: boolean;
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
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
        const hasSuperAdmin = userRoles.includes("super_admin");
        
        setIsSuperAdmin(hasSuperAdmin);
        
        // If super admin, they can switch to any role
        if (hasSuperAdmin) {
          setAvailableRoles(Object.keys(ROLE_HIERARCHY) as AppRole[]);
        } else {
          setAvailableRoles(userRoles);
        }

        // Get stored active role or use highest role
        const storedRole = localStorage.getItem("activeRole") as AppRole;
        const validRoles = hasSuperAdmin 
          ? Object.keys(ROLE_HIERARCHY) as AppRole[]
          : userRoles;
        
        const defaultRole = storedRole && validRoles.includes(storedRole)
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

  const switchRole = async (role: AppRole) => {
    const canSwitch = isSuperAdmin || availableRoles.includes(role);
    
    if (canSwitch) {
      // Perform role switch immediately (always succeeds)
      setActiveRole(role);
      localStorage.setItem("activeRole", role);
      
      // Log role switch (fire-and-forget with error handling)
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.warn("Failed to get user for role switch logging:", userError.message);
          return;
        }
        
        if (user) {
          const { error: logError } = await supabase.rpc("log_admin_action", {
            _admin_user_id: user.id,
            _admin_email: user.email || "",
            _action_type: isSuperAdmin && !availableRoles.includes(role) 
              ? "role_impersonation" 
              : "role_switch",
            _details: { new_role: role, is_impersonation: isSuperAdmin },
          });
          
          if (logError) {
            console.warn("Failed to log role switch action:", logError.message);
          }
        }
      } catch (error) {
        console.warn("Unexpected error during role switch logging:", error);
      }
    }
  };

  return (
    <RoleContext.Provider value={{ activeRole, availableRoles, isSuperAdmin, switchRole, isLoading }}>
      {children}
    </RoleContext.Provider>
  );
};
