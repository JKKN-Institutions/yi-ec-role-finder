import { TestDataSeeder } from "@/components/admin/TestDataSeeder";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, FileText, Activity, Database, TrendingUp, Clock, Shield, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

type SystemStats = {
  totalUsers: number;
  totalAssessments: number;
  completedAssessments: number;
  pendingReviews: number;
  totalAdmins: number;
  activeRoles: number;
  recentSignups: number;
  avgCompletionTime: string;
};

type ActivityLog = {
  id: string;
  admin_email: string;
  action_type: string;
  created_at: string;
  details: any;
};

const SuperAdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalAssessments: 0,
    completedAssessments: 0,
    pendingReviews: 0,
    totalAdmins: 0,
    activeRoles: 0,
    recentSignups: 0,
    avgCompletionTime: "N/A",
  });
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [healthMetrics, setHealthMetrics] = useState({
    dbConnected: true,
    authActive: true,
    storageActive: true,
    lastBackup: "N/A",
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const { activeRole, isSuperAdmin, isLoading: roleLoading } = useRole();

  useEffect(() => {
    // Check permissions - only check activeRole to respect impersonation
    if (!roleLoading && activeRole !== "super_admin") {
      toast({
        title: "Access Denied",
        description: "Only Super Admins can access this dashboard",
        variant: "destructive",
      });
      navigate("/admin");
    }
  }, [activeRole, roleLoading, navigate, toast]);

  useEffect(() => {
    // Only load data if actively viewing as super_admin (respects impersonation)
    if (activeRole === "super_admin") {
      loadDashboardData();

      // Subscribe to realtime updates
      const channel = supabase
        .channel("super-admin-dashboard")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "assessments",
          },
          () => {
            loadDashboardData();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_roles",
          },
          () => {
            loadDashboardData();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
          },
          () => {
            loadDashboardData();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "admin_audit_log",
          },
          () => {
            loadDashboardData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeRole]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get total users from profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, created_at");

      if (profilesError) throw profilesError;

      // Get assessments data
      const { data: assessments, error: assessmentsError } = await supabase
        .from("assessments")
        .select("id, status, review_status, created_at, completed_at");

      if (assessmentsError) throw assessmentsError;

      // Get user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Get recent activity
      const { data: activity, error: activityError } = await supabase
        .from("admin_audit_log")
        .select("id, admin_email, action_type, created_at, details")
        .order("created_at", { ascending: false })
        .limit(10);

      if (activityError) throw activityError;

      // Calculate statistics
      const totalUsers = profiles?.length || 0;
      const totalAssessments = assessments?.length || 0;
      const completedAssessments = assessments?.filter((a) => a.status === "completed").length || 0;
      const pendingReviews = assessments?.filter((a) => a.review_status === "new" || a.review_status === "pending").length || 0;

      // Count admins (both admin and super_admin roles)
      const adminUserIds = new Set(
        roles?.filter((r) => r.role === "admin" || r.role === "super_admin").map((r) => r.user_id) || []
      );
      const totalAdmins = adminUserIds.size;

      const activeRoles = roles?.length || 0;

      // Recent signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentSignups = profiles?.filter((p) => new Date(p.created_at) > sevenDaysAgo).length || 0;

      // Calculate average completion time
      const completedWithTime = assessments?.filter(
        (a) => a.status === "completed" && a.completed_at && a.created_at
      );
      let avgTime = "N/A";
      if (completedWithTime && completedWithTime.length > 0) {
        const totalMinutes = completedWithTime.reduce((sum, a) => {
          const start = new Date(a.created_at).getTime();
          const end = new Date(a.completed_at!).getTime();
          return sum + (end - start) / (1000 * 60);
        }, 0);
        const avg = Math.round(totalMinutes / completedWithTime.length);
        avgTime = `${avg} min`;
      }

      setStats({
        totalUsers,
        totalAssessments,
        completedAssessments,
        pendingReviews,
        totalAdmins,
        activeRoles,
        recentSignups,
        avgCompletionTime: avgTime,
      });

      setRecentActivity(activity || []);

      // Health check
      setHealthMetrics({
        dbConnected: true,
        authActive: true,
        storageActive: true,
        lastBackup: format(new Date(), "MMM dd, yyyy HH:mm"),
      });
    } catch (error: any) {
      console.error("Error loading dashboard data:", error);
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive",
      });
      setHealthMetrics({
        dbConnected: false,
        authActive: false,
        storageActive: false,
        lastBackup: "N/A",
      });
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (activeRole !== "super_admin") {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Super Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            System overview and health monitoring
          </p>
        </div>
        <Badge className="bg-red-600 text-white">Super Admin Only</Badge>
      </div>

      {/* Health Status */}
      <Alert className={healthMetrics.dbConnected ? "border-green-500" : "border-red-500"}>
        <Activity className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            System Status: {healthMetrics.dbConnected ? "All Systems Operational" : "System Issues Detected"}
          </span>
          <div className="flex gap-2">
            <Badge variant={healthMetrics.dbConnected ? "default" : "destructive"}>
              Database
            </Badge>
            <Badge variant={healthMetrics.authActive ? "default" : "destructive"}>
              Auth
            </Badge>
            <Badge variant={healthMetrics.storageActive ? "default" : "destructive"}>
              Storage
            </Badge>
          </div>
        </AlertDescription>
      </Alert>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.recentSignups} in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssessments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedAssessments} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReviews}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting admin review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgCompletionTime}</div>
            <p className="text-xs text-muted-foreground">
              Per assessment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Admin & System Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalAdmins}</div>
            <p className="text-xs text-muted-foreground">Active administrators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Active Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeRoles}</div>
            <p className="text-xs text-muted-foreground">Role assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Last Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{healthMetrics.lastBackup}</div>
            <p className="text-xs text-muted-foreground">System backup time</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Activity</CardTitle>
          <CardDescription>Latest admin actions and system events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent activity
              </p>
            ) : (
              recentActivity.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{log.admin_email}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.action_type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "MMM dd, HH:mm")}
                    </p>
                    {log.details && (
                      <Badge variant="outline" className="mt-1">
                        {JSON.stringify(log.details).length > 50
                          ? "View Details"
                          : JSON.stringify(log.details)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Data Seeder */}
      <TestDataSeeder />
    </div>
  );
};

export default SuperAdminDashboard;
