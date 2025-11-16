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
import { ChevronDown, Shield } from "lucide-react";
import { ROLE_LABELS, ROLE_HIERARCHY } from "@/lib/roleHierarchy";

export function RoleSwitcher() {
  const { activeRole, availableRoles, switchRole } = useRole();

  if (availableRoles.length <= 1) {
    return null;
  }

  // Sort roles by hierarchy
  const sortedRoles = [...availableRoles].sort(
    (a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Shield className="h-4 w-4" />
          {activeRole && ROLE_LABELS[activeRole]}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sortedRoles.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => switchRole(role)}
            className="flex items-center justify-between"
          >
            <span>{ROLE_LABELS[role]}</span>
            {role === activeRole && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
