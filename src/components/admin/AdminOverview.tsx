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
import { ActiveAdminsWidget } from "./ActiveAdminsWidget";
import { TestAssessmentSeeder } from "./TestAssessmentSeeder";
import { TestDataCleanup } from "./TestDataCleanup";
import { AnalyticsWidget } from "./AnalyticsWidget";

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
        new: assessments.filter((a) => a.review_status === "new").length,
        reviewed: assessments.filter((a) => a.review_status === "reviewed").length,
        shortlisted: assessments.filter((a) => a.is_shortlisted).length,
        rejected: assessments.filter((a) => a.review_status === "rejected").length,
      };

      setStatusData([
        { status: "New", count: statusCount.new },
        { status: "Reviewed", count: statusCount.reviewed },
        { status: "Shortlisted", count: statusCount.shortlisted },
        { status: "Rejected", count: statusCount.rejected },
      ]);

      // Get recent submissions
      const recent = assessments.slice(0, 10).map((a) => ({
        id: a.id,
        user_name: a.user_name,
        user_email: a.user_email,
        created_at: a.created_at,
        status: a.review_status,
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

  useEffect(() => {
    loadData();

    // Set up real-time subscription
    const channel = supabase
      .channel("assessment-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "assessments",
        },
        () => {
          toast.success("New assessment submitted!");
          loadData();
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const getStatusBadgeVariant = (status: string) => {
    if (status === "new") return "default";
    if (status === "reviewed") return "secondary";
    return "outline";
  };

  const getQuadrantColor = (quadrant: string) => {
    const colors: Record<string, string> = {
      Q1: "bg-green-500",
      Q2: "bg-blue-500",
      Q3: "bg-red-500",
      Q4: "bg-yellow-500",
    };
    return colors[quadrant] || "bg-gray-500";
  };

  return (
    <div className="space-y-8 p-8">
      {/* Recent Submissions - High Priority Section */}
      <Card className="p-8 border-2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">Recent Submissions</h2>
            <p className="text-sm text-muted-foreground">
              Latest assessment submissions • Updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
            </p>
          </div>
          <Button onClick={() => navigate("/admin/candidates")} size="lg">
            View All Candidates
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-medium">Name</th>
                <th className="text-left p-3 text-sm font-medium">Email</th>
                <th className="text-left p-3 text-sm font-medium">Submitted</th>
                <th className="text-left p-3 text-sm font-medium">Quadrant</th>
                <th className="text-left p-3 text-sm font-medium">Scores</th>
                <th className="text-left p-3 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentSubmissions.map((submission) => (
                <tr key={submission.id} className="border-b hover:bg-muted/50">
                  <td className="p-3 text-sm font-medium">{submission.user_name}</td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {submission.user_email}
                  </td>
                  <td className="p-3 text-sm">
                    {formatDistanceToNow(new Date(submission.created_at), {
                      addSuffix: true,
                    })}
                  </td>
                  <td className="p-3">
                    {submission.results && (
                      <Badge className={getQuadrantColor(submission.results.quadrant)}>
                        {submission.results.quadrant}
                      </Badge>
                    )}
                  </td>
                  <td className="p-3">
                    {submission.results && (
                      <div className="space-y-1 w-32">
                        <div>
                          <div className="text-xs mb-1">
                            WILL: {submission.results.will_score}
                          </div>
                          <Progress
                            value={submission.results.will_score}
                            className="h-1"
                          />
                        </div>
                        <div>
                          <div className="text-xs mb-1">
                            SKILL: {submission.results.skill_score}
                          </div>
                          <Progress
                            value={submission.results.skill_score}
                            className="h-1"
                          />
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant={getStatusBadgeVariant(submission.status)}>
                      {submission.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/admin/candidate/${submission.id}`)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Top Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Assessments</p>
            <h3 className="text-3xl font-bold">{stats.totalAssessments}</h3>
            <p className="text-xs text-muted-foreground">All time</p>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-3 w-3" />
              +{stats.weeklyTrend} this week
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="h-8 w-8 text-orange-500" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Pending Review</p>
            <h3 className="text-3xl font-bold">{stats.pendingReview}</h3>
            <p className="text-xs text-muted-foreground">Needs attention</p>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => navigate("/admin/candidates")}
            >
              Review Now <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Target className="h-8 w-8 text-green-600" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Shortlisted</p>
            <h3 className="text-3xl font-bold">{stats.shortlisted}</h3>
            <p className="text-xs text-muted-foreground">Ready for interview</p>
            <p className="text-xs text-green-600">
              {stats.totalAssessments > 0
                ? Math.round((stats.shortlisted / stats.totalAssessments) * 100)
                : 0}
              % of total
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Average Scores</p>
            <h3 className="text-2xl font-bold">
              WILL: {stats.avgWill} | SKILL: {stats.avgSkill}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">Overall averages</p>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>WILL</span>
                  <span>{stats.avgWill}%</span>
                </div>
                <Progress value={stats.avgWill} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>SKILL</span>
                  <span>{stats.avgSkill}%</span>
                </div>
                <Progress value={stats.avgSkill} className="h-2" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Real-time Active Admins and Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        <ActiveAdminsWidget />
        <AnalyticsWidget />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quadrant Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quadrant Distribution</h3>
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

        {/* Review Status Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Review Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData} layout="horizontal">
              <XAxis type="number" />
              <YAxis type="category" dataKey="status" />
              <Tooltip />
              <Bar dataKey="count" fill="#7C3AED" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>


      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">Export All Data</Button>
          <Button variant="outline">Generate Report</Button>
          <Button variant="outline" onClick={() => navigate("/admin/verticals")}>
            Manage Verticals
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/roles")}>
            User Roles
          </Button>
        </div>
      </Card>

      {/* Test Assessment Generator */}
          <TestAssessmentSeeder />
          <TestDataCleanup />
    </div>
  );
}
