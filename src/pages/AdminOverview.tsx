import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Users,
  CheckCircle,
  Target,
  ArrowRight,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { DashboardWidget } from "@/components/admin/DashboardWidget";

interface Stats {
  totalAssessments: number;
  pendingReview: number;
  shortlisted: number;
  avgWill: number;
  avgSkill: number;
  weeklyTrend: number;
}

interface QuadrantData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface StatusData {
  status: string;
  count: number;
}

interface RecentSubmission {
  id: string;
  user_name: string;
  user_email: string;
  created_at: string;
  status: string;
  is_shortlisted: boolean;
  results?: {
    will_score: number;
    skill_score: number;
    quadrant: string;
  };
}

export function AdminOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalAssessments: 0,
    pendingReview: 0,
    shortlisted: 0,
    avgWill: 0,
    avgSkill: 0,
    weeklyTrend: 0,
  });
  const [quadrantData, setQuadrantData] = useState<QuadrantData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [preferences, setPreferences] = useState<any>(null);
  const [widgetData, setWidgetData] = useState<any>({});

  const loadData = async () => {
    // Fetch all assessments
    const { data: assessments } = await supabase
      .from("assessments")
      .select("*, assessment_results(*)")
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (assessments) {
      // Calculate stats
      const total = assessments.length;
      const pending = assessments.filter((a) => a.review_status === "new").length;
      const shortlisted = assessments.filter((a) => a.is_shortlisted).length;

      // Calculate averages
      const scores = assessments
        .map((a) => a.assessment_results?.[0])
        .filter((r) => r);
      
      const avgWill = scores.length > 0
        ? Math.round(scores.reduce((sum, r) => sum + (r.will_score || 0), 0) / scores.length)
        : 0;
      
      const avgSkill = scores.length > 0
        ? Math.round(scores.reduce((sum, r) => sum + (r.skill_score || 0), 0) / scores.length)
        : 0;

      // Calculate weekly trend
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weeklyCount = assessments.filter(
        (a) => new Date(a.created_at) > oneWeekAgo
      ).length;

      setStats({
        totalAssessments: total,
        pendingReview: pending,
        shortlisted,
        avgWill,
        avgSkill,
        weeklyTrend: weeklyCount,
      });

      // Calculate quadrant distribution
      const quadrants = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
      scores.forEach((r) => {
        if (r.quadrant) {
          quadrants[r.quadrant as keyof typeof quadrants]++;
        }
      });

      setQuadrantData([
        { name: "Q1 - STAR", value: quadrants.Q1, color: "#10B981" },
        { name: "Q2 - WILLING", value: quadrants.Q2, color: "#3B82F6" },
        { name: "Q3 - NOT READY", value: quadrants.Q3, color: "#EF4444" },
        { name: "Q4 - RELUCTANT", value: quadrants.Q4, color: "#F59E0B" },
      ]);

      // Calculate status breakdown
      const statusCount = {
        completed: assessments.length,
        reviewed: assessments.filter((a) => a.review_status === "reviewed").length,
        pending: assessments.filter((a) => a.review_status === "new").length,
      };

      setStatusData([
        { status: "Completed", count: statusCount.completed },
        { status: "Reviewed", count: statusCount.reviewed },
        { status: "Pending", count: statusCount.pending },
      ]);

      // Get recent submissions
      const recent = assessments.slice(0, 5).map((a) => ({
        id: a.id,
        user_name: a.user_name,
        user_email: a.user_email,
        created_at: a.created_at,
        status: a.status,
        is_shortlisted: a.is_shortlisted,
        results: a.assessment_results?.[0]
          ? {
              will_score: a.assessment_results[0].will_score,
              skill_score: a.assessment_results[0].skill_score,
              quadrant: a.assessment_results[0].quadrant,
            }
          : undefined,
      }));

      setRecentSubmissions(recent);
      setLastUpdate(new Date());
    }
  };

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await (supabase as any)
        .from("admin_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setPreferences(data);
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  };

  const loadWidgetData = async () => {
    try {
      // Mock data for widgets - in production, calculate from actual data
      setWidgetData({
        top_chapters: [
          { id: "1", name: "Chapter Alpha", totalAssessments: 120, completionRate: 85 },
          { id: "2", name: "Chapter Beta", totalAssessments: 98, completionRate: 78 },
          { id: "3", name: "Chapter Gamma", totalAssessments: 87, completionRate: 72 },
        ],
        recent_trends: {
          weeklyAssessments: stats.weeklyTrend,
          weeklyTrend: 12,
          avgCompletionTime: 22,
          completionTrend: "improving",
          shortlistedRate: stats.totalAssessments > 0 ? Math.round((stats.shortlisted / stats.totalAssessments) * 100) : 0,
        },
        key_metrics: {
          totalCandidates: stats.totalAssessments,
          pendingReviews: stats.pendingReview,
          avgSkillScore: stats.avgSkill,
          avgWillScore: stats.avgWill,
        },
      });
    } catch (error) {
      console.error("Error loading widget data:", error);
    }
  };

  useEffect(() => {
    loadData();
    loadPreferences();

    // Set up realtime subscription
    const channel = supabase
      .channel("dashboard-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assessments",
        },
        (payload) => {
          console.log("Assessment changed:", payload);
          loadData();
          toast.success("Dashboard updated with new data");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (stats.totalAssessments > 0) {
      loadWidgetData();
    }
  }, [stats]);

  const getQuadrantColor = (quadrant: string) => {
    switch (quadrant) {
      case "Q1":
        return "hsl(var(--accent))";
      case "Q2":
        return "hsl(var(--primary))";
      case "Q3":
        return "hsl(var(--destructive))";
      case "Q4":
        return "hsl(142, 76%, 36%)";
      default:
        return "hsl(var(--muted))";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Last updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
          </p>
        </div>
        <Button onClick={() => navigate("/admin/candidates")}>
          View All Candidates <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Assessments</p>
              <p className="text-2xl font-bold">{stats.totalAssessments}</p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
            <span className="text-green-500">{stats.weeklyTrend} this week</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold">{stats.pendingReview}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-accent" />
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Requires attention
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Shortlisted</p>
              <p className="text-2xl font-bold">{stats.shortlisted}</p>
            </div>
            <Target className="h-8 w-8 text-primary" />
          </div>
          <div className="mt-2">
            <Progress
              value={(stats.shortlisted / stats.totalAssessments) * 100}
              className="h-2"
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Scores</p>
              <p className="text-2xl font-bold">
                {stats.avgSkill} / {stats.avgWill}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-accent" />
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Skill / Will
          </div>
        </Card>
      </div>

      {/* Dashboard Widgets */}
      {preferences?.dashboard_layout?.widgets && widgetData.top_chapters && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {preferences.dashboard_layout.widgets.includes("top_chapters") && (
            <DashboardWidget type="top_chapters" data={widgetData.top_chapters} />
          )}
          {preferences.dashboard_layout.widgets.includes("recent_trends") && (
            <DashboardWidget type="recent_trends" data={widgetData.recent_trends} />
          )}
          {preferences.dashboard_layout.widgets.includes("key_metrics") && (
            <DashboardWidget type="key_metrics" data={widgetData.key_metrics} />
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Quadrant Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={quadrantData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {quadrantData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Submissions */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Submissions</h3>
          <Button variant="ghost" onClick={() => navigate("/admin/candidates")}>
            View All
          </Button>
        </div>
        <div className="space-y-4">
          {recentSubmissions.map((submission) => (
            <div
              key={submission.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-accent/5 cursor-pointer transition-colors"
              onClick={() => navigate(`/admin/candidate/${submission.id}`)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{submission.user_name}</p>
                  {submission.is_shortlisted && (
                    <Badge variant="default">Shortlisted</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {submission.user_email}
                </p>
              </div>
              {submission.results && (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      Skill: {submission.results.skill_score}
                    </p>
                    <p className="text-sm font-medium">
                      Will: {submission.results.will_score}
                    </p>
                  </div>
                  <Badge
                    style={{
                      backgroundColor: getQuadrantColor(
                        submission.results.quadrant
                      ),
                      color: "white",
                    }}
                  >
                    {submission.results.quadrant}
                  </Badge>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(submission.created_at), {
                  addSuffix: true,
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default AdminOverview;
