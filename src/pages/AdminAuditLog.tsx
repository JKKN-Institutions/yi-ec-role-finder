import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Shield, UserPlus, Edit, Trash2, CheckCircle, Search } from "lucide-react";
import { useChapterContext } from "./Admin";

interface AuditLog {
  id: string;
  admin_user_id: string;
  admin_email: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  details: any;
  created_at: string;
}

const AdminAuditLog = () => {
  const { toast } = useToast();
  const { chapterId, isSuperAdmin } = useChapterContext();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadLogs();

    // Set up realtime subscription
    const channel = supabase
      .channel('audit-log-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_audit_log'
        },
        () => {
          console.log('New audit log entry');
          loadLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chapterId]);

  const loadLogs = async () => {
    try {
      let query = (supabase as any)
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      // For chapter admins, filter by their actions or actions in their chapter
      if (!isSuperAdmin && chapterId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq("admin_user_id", user.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs((data as any) || []);
    } catch (error) {
      console.error("Error loading audit logs:", error);
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "user_invited":
      case "user_created":
        return <UserPlus className="h-4 w-4" />;
      case "role_updated":
      case "assessment_reviewed":
        return <Edit className="h-4 w-4" />;
      case "role_removed":
      case "user_removed":
        return <Trash2 className="h-4 w-4" />;
      case "assessment_shortlisted":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes("removed") || actionType.includes("deleted")) {
      return "destructive";
    }
    if (actionType.includes("created") || actionType.includes("invited") || actionType.includes("shortlisted")) {
      return "default";
    }
    return "secondary";
  };

  const getActionLabel = (actionType: string) => {
    return actionType
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const filteredLogs = logs.filter(log => 
    log.admin_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.details?.target_email && log.details.target_email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Audit Log</h2>
        <p className="text-muted-foreground mt-1">
          Track all administrative actions and changes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Logs</CardTitle>
          <CardDescription>Filter by admin email or action type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search audit logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            {filteredLogs.length} {filteredLogs.length === 1 ? "entry" : "entries"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className={`p-2 rounded-full bg-${getActionColor(log.action_type)}/10`}>
                  {getActionIcon(log.action_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getActionColor(log.action_type)}>
                      {getActionLabel(log.action_type)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), "MMM dd, yyyy 'at' hh:mm a")}
                    </span>
                  </div>
                  
                  <p className="text-sm font-medium">{log.admin_email}</p>
                  
                  {log.details && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {log.details.target_email && (
                        <p>Target: {log.details.target_email}</p>
                      )}
                      {log.details.role && (
                        <p>Role: {log.details.role}</p>
                      )}
                      {log.details.chapter_name && (
                        <p>Chapter: {log.details.chapter_name}</p>
                      )}
                      {log.details.candidate_name && (
                        <p>Candidate: {log.details.candidate_name}</p>
                      )}
                      {log.details.notes && (
                        <p className="mt-1 italic">"{log.details.notes}"</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No audit logs found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAuditLog;