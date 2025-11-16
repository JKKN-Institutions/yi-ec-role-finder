import { useRole } from "@/contexts/RoleContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Shield, AlertTriangle } from "lucide-react";
import { ROLE_LABELS, ROLE_HIERARCHY } from "@/lib/roleHierarchy";

export function RoleSwitcher() {
  const { activeRole, availableRoles, isSuperAdmin, switchRole } = useRole();

  if (!isSuperAdmin && availableRoles.length <= 1) {
    return null;
  }

  // Sort roles by hierarchy
  const sortedRoles = [...availableRoles].sort(
    (a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]
  );

  // Check if currently impersonating
  const userActualRoles = availableRoles.filter(role => 
    !isSuperAdmin || role === "super_admin"
  );
  const isImpersonating = isSuperAdmin && activeRole && activeRole !== "super_admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={isImpersonating ? "destructive" : "outline"} 
          size="sm" 
          className="gap-2"
        >
          {isImpersonating && <AlertTriangle className="h-4 w-4" />}
          <Shield className="h-4 w-4" />
          {activeRole && ROLE_LABELS[activeRole]}
          {isImpersonating && <Badge variant="secondary" className="ml-1 text-xs">Impersonating</Badge>}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          {isSuperAdmin ? "Switch/Impersonate Role" : "Switch Role"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sortedRoles.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => switchRole(role)}
            className="flex items-center justify-between"
          >
            <span>{ROLE_LABELS[role]}</span>
            <div className="flex gap-1">
              {role === activeRole && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Active
                </Badge>
              )}
              {isSuperAdmin && !userActualRoles.includes(role) && (
                <Badge variant="outline" className="ml-2 text-xs text-orange-500">
                  Impersonate
                </Badge>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
