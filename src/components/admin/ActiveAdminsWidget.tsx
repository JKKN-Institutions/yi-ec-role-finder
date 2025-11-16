import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ROLE_LABELS } from "@/lib/roleHierarchy";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ActiveAdmin {
  user_id: string;
  email: string;
  role: AppRole;
  online_at: string;
  presence_ref: string;
}

interface RecentAction {
  id: string;
  admin_email: string;
  action_type: string;
  created_at: string;
}

export function ActiveAdminsWidget() {
  const [activeAdmins, setActiveAdmins] = useState<ActiveAdmin[]>([]);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    initializePresence();
    loadRecentActions();

    // Subscribe to presence changes
    const presenceChannel = supabase.channel("admin_presence");

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const admins = Object.values(state).flat() as ActiveAdmin[];
        setActiveAdmins(admins);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        console.log("Admin joined:", newPresences);
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        console.log("Admin left:", leftPresences);
      })
      .subscribe();

    // Subscribe to audit log changes for real-time action updates
    const actionsChannel = supabase
      .channel("audit_log_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_audit_log",
        },
        (payload) => {
          const newAction = payload.new as RecentAction;
          setRecentActions((prev) => [newAction, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      presenceChannel.unsubscribe();
      actionsChannel.unsubscribe();
    };
  }, []);

  const initializePresence = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);

    // Get user role
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!userRole) return;

    const presenceChannel = supabase.channel("admin_presence");
    
    await presenceChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await presenceChannel.track({
          user_id: user.id,
          email: user.email || "",
          role: userRole.role,
          online_at: new Date().toISOString(),
        });
      }
    });
  };

  const loadRecentActions = async () => {
    const { data, error } = await supabase
      .from("admin_audit_log")
      .select("id, admin_email, action_type, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error loading recent actions:", error);
      return;
    }

    setRecentActions(data || []);
  };

  const getInitials = (email: string) => {
    return email
      .split("@")[0]
      .split(".")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes("login")) return "text-green-500";
    if (actionType.includes("logout")) return "text-gray-500";
    if (actionType.includes("delete") || actionType.includes("remove")) return "text-red-500";
    if (actionType.includes("create") || actionType.includes("add")) return "text-blue-500";
    return "text-yellow-500";
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Admins
          </CardTitle>
          <CardDescription>
            {activeAdmins.length} admin{activeAdmins.length !== 1 ? "s" : ""} currently online
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {activeAdmins.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active admins
              </div>
            ) : (
              <div className="space-y-3">
                {activeAdmins.map((admin) => (
                  <div
                    key={admin.presence_ref}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(admin.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{admin.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {ROLE_LABELS[admin.role]}
                        </Badge>
                        {admin.user_id === currentUserId && (
                          <Badge variant="secondary" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(admin.online_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Actions
          </CardTitle>
          <CardDescription>Latest administrative activities</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {recentActions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent actions
              </div>
            ) : (
              <div className="space-y-2">
                {recentActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Activity className={`h-4 w-4 mt-1 ${getActionColor(action.action_type)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{action.admin_email.split("@")[0]}</span>
                        {" "}
                        <span className="text-muted-foreground">
                          {action.action_type.replace(/_/g, " ")}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
