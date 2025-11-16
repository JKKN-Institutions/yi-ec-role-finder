import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useActivityLogger = () => {
  const logActivity = useCallback(
    async (actionType: string, details?: Record<string, any>, targetType?: string, targetId?: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.rpc("log_admin_action", {
          _admin_user_id: user.id,
          _admin_email: user.email || "",
          _action_type: actionType,
          _target_type: targetType || null,
          _target_id: targetId || null,
          _details: details || null,
        });
      } catch (error) {
        console.error("Failed to log activity:", error);
      }
    },
    []
  );

  // Log page views
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (currentPath.startsWith("/admin")) {
      logActivity("page_view", { path: currentPath });
    }
  }, [logActivity]);

  return { logActivity };
};
