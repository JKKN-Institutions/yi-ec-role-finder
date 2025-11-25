import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, LogOut, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { hasPermission, ROLE_LABELS } from "@/lib/roleHierarchy";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Define admin features with their permissions
const adminFeatures = [
  { title: "Super Dashboard", permission: "manage_system_settings", url: "/admin/super-dashboard" },
  { title: "User Management", permission: "manage_system_settings", url: "/admin/user-management" },
  { title: "Candidates", permission: "manage_candidates", url: "/admin/candidates" },
  { title: "Comparison", permission: "view_all_assessments", url: "/admin/comparison" },
  { title: "Analytics", permission: "view_all_assessments", url: "/admin/analytics" },
  { title: "Validation", permission: "view_all_assessments", url: "/admin/validation" },
  { title: "Tracking", permission: "view_all_assessments", url: "/admin/tracking" },
  { title: "Verticals", permission: "manage_verticals", url: "/admin/verticals" },
  { title: "User Roles", permission: "manage_roles", url: "/admin/roles" },
  { title: "Activity Log", permission: "view_audit_logs", url: "/admin/activity-log" },
];

export function ImpersonationBanner() {
  const [showHidden, setShowHidden] = useState(false);
  const location = useLocation();
  const { activeRole } = useRole();
  const { isImpersonating, impersonatedUser, endImpersonation, isLoading } = useImpersonation();

  const handleExitImpersonation = async () => {
    await endImpersonation();
    window.location.href = "/admin";
  };

  if (isLoading || !isImpersonating || !impersonatedUser) {
    return null;
  }

  // Determine which features are hidden based on active role
  const hiddenFeatures = activeRole 
    ? adminFeatures.filter(feature => 
        feature.permission && !hasPermission(activeRole, feature.permission)
      )
    : [];

  // Check if current route is hidden
  const isOnHiddenPage = hiddenFeatures.some(f => location.pathname.startsWith(f.url));

  return (
    <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>
              <strong>Impersonation Mode:</strong> You are viewing as {impersonatedUser.email}
            </span>
            {activeRole && (
              <Badge variant="secondary" className="gap-1">
                <span className="text-xs">Active Role:</span>
                <strong>{ROLE_LABELS[activeRole]}</strong>
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExitImpersonation}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Exit Impersonation
          </Button>
        </div>

        {hiddenFeatures.length > 0 && (
          <Collapsible open={showHidden} onOpenChange={setShowHidden}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-xs h-7 px-2"
              >
                <EyeOff className="h-3 w-3" />
                {hiddenFeatures.length} feature{hiddenFeatures.length > 1 ? 's' : ''} hidden
                {showHidden ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="flex flex-wrap gap-2">
                <div className="text-xs text-muted-foreground mr-2">Hidden:</div>
                {hiddenFeatures.map((feature) => (
                  <Badge 
                    key={feature.title} 
                    variant="outline"
                    className="text-xs"
                  >
                    {feature.title}
                  </Badge>
                ))}
              </div>
              {isOnHiddenPage && (
                <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  You are currently on a page that would be hidden with this role
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </AlertDescription>
    </Alert>
  );
}
