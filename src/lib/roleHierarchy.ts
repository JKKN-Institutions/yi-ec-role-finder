import { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const ROLE_HIERARCHY: Record<AppRole, number> = {
  super_admin: 6,
  admin: 5,
  chair: 4,
  co_chair: 3,
  em: 2,
  user: 1,
};

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  chair: "Chair",
  co_chair: "Co-Chair",
  em: "EM",
  user: "User",
};

export const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  super_admin: [
    "manage_users",
    "manage_roles",
    "manage_chapters",
    "view_audit_logs",
    "manage_verticals",
    "view_all_assessments",
    "manage_system_settings",
  ],
  admin: [
    "view_audit_logs",
    "manage_verticals",
    "view_all_assessments",
    "manage_candidates",
  ],
  chair: [
    "view_all_assessments",
    "manage_candidates",
    "view_chapter_data",
  ],
  co_chair: [
    "view_all_assessments",
    "manage_candidates",
    "view_chapter_data",
  ],
  em: [
    "view_all_assessments",
    "view_chapter_data",
  ],
  user: [],
};

export const hasPermission = (
  role: AppRole,
  permission: string
): boolean => {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
};

export const isHigherRole = (role1: AppRole, role2: AppRole): boolean => {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
};

export const canManageRole = (
  userRole: AppRole,
  targetRole: AppRole
): boolean => {
  return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[targetRole];
};
