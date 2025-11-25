import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImpersonationSession {
  sessionId: string;
  impersonatedUserId: string;
  impersonatedUserEmail: string;
  createdAt: string;
  expiresAt: string;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedUser: { id: string; email: string } | null;
  isLoading: boolean;
  startImpersonation: (targetUserId: string, targetUserEmail: string) => Promise<boolean>;
  endImpersonation: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error("useImpersonation must be used within ImpersonationProvider");
  }
  return context;
};

export const ImpersonationProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<ImpersonationSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSession(null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("get_active_impersonation", {
        _user_id: user.id
      });

      if (error) {
        console.error("Error fetching impersonation session:", error);
        setSession(null);
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const sessionData = data[0];
        setSession({
          sessionId: sessionData.session_id,
          impersonatedUserId: sessionData.impersonated_user_id,
          impersonatedUserEmail: sessionData.impersonated_user_email,
          createdAt: sessionData.created_at,
          expiresAt: sessionData.expires_at,
        });
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error("Error in refreshSession:", error);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();

    // Listen for auth state changes to refresh session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshSession();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSession]);

  const startImpersonation = async (targetUserId: string, targetUserEmail: string): Promise<boolean> => {
    try {
      const { data: sessionId, error } = await supabase.rpc("start_impersonation", {
        _target_user_id: targetUserId,
        _target_user_email: targetUserEmail,
      });

      if (error) {
        console.error("Failed to start impersonation:", error);
        toast.error("Failed to start impersonation: " + error.message);
        return false;
      }

      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc("log_admin_action", {
          _admin_user_id: user.id,
          _admin_email: user.email || "",
          _action_type: "user_impersonation",
          _target_type: "user",
          _target_id: targetUserId,
          _details: {
            impersonated_email: targetUserEmail,
            session_id: sessionId,
            timestamp: new Date().toISOString()
          },
        });
      }

      await refreshSession();
      toast.success(`Now impersonating ${targetUserEmail}`);
      return true;
    } catch (error) {
      console.error("Error starting impersonation:", error);
      toast.error("Failed to start impersonation");
      return false;
    }
  };

  const endImpersonation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Log the exit before ending
      if (user && session) {
        await supabase.rpc("log_admin_action", {
          _admin_user_id: user.id,
          _admin_email: user.email || "",
          _action_type: "exit_impersonation",
          _details: {
            was_impersonating: session.impersonatedUserEmail,
            session_id: session.sessionId,
            timestamp: new Date().toISOString()
          },
        });
      }

      const { error } = await supabase.rpc("end_impersonation");
      
      if (error) {
        console.error("Failed to end impersonation:", error);
        toast.error("Failed to end impersonation");
        return;
      }

      setSession(null);
      toast.success("Exited impersonation mode");
    } catch (error) {
      console.error("Error ending impersonation:", error);
      toast.error("Failed to end impersonation");
    }
  };

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating: session !== null,
        impersonatedUser: session ? { id: session.impersonatedUserId, email: session.impersonatedUserEmail } : null,
        isLoading,
        startImpersonation,
        endImpersonation,
        refreshSession,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
};
