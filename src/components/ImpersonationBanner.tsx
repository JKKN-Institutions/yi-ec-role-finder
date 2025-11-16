import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut } from "lucide-react";
import { toast } from "sonner";

export function ImpersonationBanner() {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedEmail, setImpersonatedEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const impersonating = localStorage.getItem("impersonating") === "true";
    const email = localStorage.getItem("impersonated_user_email") || "";
    setIsImpersonating(impersonating);
    setImpersonatedEmail(email);
  }, []);

  const exitImpersonation = async () => {
    // Log the exit
    const originalUserId = localStorage.getItem("original_user_id");
    const originalEmail = localStorage.getItem("original_user_email");
    
    if (originalUserId && originalEmail) {
      await supabase.rpc("log_admin_action", {
        _admin_user_id: originalUserId,
        _admin_email: originalEmail,
        _action_type: "exit_impersonation",
        _details: { 
          was_impersonating: impersonatedEmail,
          timestamp: new Date().toISOString()
        },
      });
    }

    // Clear impersonation data
    localStorage.removeItem("impersonating");
    localStorage.removeItem("impersonated_user_id");
    localStorage.removeItem("impersonated_user_email");
    localStorage.removeItem("original_user_id");
    localStorage.removeItem("original_user_email");

    toast.success("Exited impersonation mode");
    navigate("/admin");
    window.location.reload();
  };

  if (!isImpersonating) {
    return null;
  }

  return (
    <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          <strong>Impersonation Mode:</strong> You are viewing as {impersonatedEmail}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={exitImpersonation}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Exit Impersonation
        </Button>
      </AlertDescription>
    </Alert>
  );
}
