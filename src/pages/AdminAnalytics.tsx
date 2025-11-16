import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import { format, parseISO, startOfWeek, subDays } from "date-fns";

const COLORS = ["#22c55e", "#3b82f6", "#ef4444", "#eab308"];

import { useChapterContext } from "./Admin";

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const { toast } = useToast();
  const { chapterId, isSuperAdmin } = useChapterContext();

  useEffect(() => {
    loadData();

    // Set up realtime subscription
    const channel = supabase
      .channel('analytics-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assessments'
        },
        () => {
          console.log('Assessment data changed, reloading analytics');
          loadData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assessment_results'
        },
        () => {
          console.log('Results changed, reloading analytics');
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chapterId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Build queries with chapter filter
      let assessmentsQuery = supabase
        .from("assessments" as any)
        .select("*")
        .eq("status", "completed");

      if (!isSuperAdmin || (chapterId && chapterId !== "all")) {
        assessmentsQuery = assessmentsQuery.eq("chapter_id", chapterId);
      }

      let resultsQuery = supabase.from("assessment_results" as any).select("*");
      let responsesQuery = supabase.from("assessment_responses" as any).select("*");

      // Filter results and responses by chapter
      if (!isSuperAdmin || (chapterId && chapterId !== "all")) {
        resultsQuery = resultsQuery.eq("chapter_id", chapterId);
        responsesQuery = responsesQuery.eq("chapter_id", chapterId);
      }

      const [assessmentsRes, resultsRes, responsesRes] = await Promise.all([
        assessmentsQuery,
        resultsQuery,
        responsesQuery,
      ]);

      if (assessmentsRes.error) throw assessmentsRes.error;
      if (resultsRes.error) throw resultsRes.error;
      if (responsesRes.error) throw responsesRes.error;

      setAssessments(assessmentsRes.data || []);
      setResults(resultsRes.data || []);
      setResponses(responsesRes.data || []);
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  // Score Distribution Data
  const getScoreDistribution = (scoreField: "will_score" | "skill_score") => {
    const ranges = [
      { range: "0-20", min: 0, max: 20 },
      { range: "21-40", min: 21, max: 40 },
      { range: "41-60", min: 41, max: 60 },
      { range: "61-80", min: 61, max: 80 },
      { range: "81-100", min: 81, max: 100 },
    ];

    return ranges.map((r) => ({
      range: r.range,
      count: results.filter((res) => res[scoreField] >= r.min && res[scoreField] <= r.max).length,
    }));
  };

  // Quadrant Over Time
  const getQuadrantOverTime = () => {
    const weeks: { [key: string]: { Q1: number; Q2: number; Q3: number; Q4: number } } = {};

    assessments.forEach((assessment) => {
      const result = results.find((r) => r.assessment_id === assessment.id);
      if (!result || !assessment.completed_at) return;

      const weekStart = format(startOfWeek(parseISO(assessment.completed_at)), "MMM dd");
      if (!weeks[weekStart]) weeks[weekStart] = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
      weeks[weekStart][result.quadrant as keyof typeof weeks[typeof weekStart]]++;
    });

    return Object.entries(weeks).map(([week, data]) => ({ week, ...data }));
  };

  // Vertical Popularity
  const getVerticalPopularity = () => {
    const verticals: { [key: string]: { p1: number; p2: number; p3: number } } = {};

    responses
      .filter((r) => r.question_number === 1)
      .forEach((response) => {
        const data = response.response_data as any;
        [data.priority1, data.priority2, data.priority3].forEach((v, idx) => {
          if (!v) return;
          if (!verticals[v]) verticals[v] = { p1: 0, p2: 0, p3: 0 };
          if (idx === 0) verticals[v].p1++;
          if (idx === 1) verticals[v].p2++;
          if (idx === 2) verticals[v].p3++;
        });
      });

    return Object.entries(verticals).map(([name, counts]) => ({
      name,
      Priority1: counts.p1,
      Priority2: counts.p2,
      Priority3: counts.p3,
    }));
  };

  // Submissions Over Time
  const getSubmissionsOverTime = () => {
    const days: { [key: string]: number } = {};

    assessments.forEach((assessment) => {
      if (!assessment.completed_at) return;
      const day = format(parseISO(assessment.completed_at), "MMM dd");
      days[day] = (days[day] || 0) + 1;
    });

    return Object.entries(days).map(([date, count]) => ({ date, count }));
  };

  // Role Distribution
  const getRoleDistribution = () => {
    const roles: { [key: string]: number } = {};
    results.forEach((result) => {
      roles[result.recommended_role] = (roles[result.recommended_role] || 0) + 1;
    });

    return Object.entries(roles).map(([name, value]) => ({ name, value }));
  };

  // Leadership Style Distribution
  const getLeadershipDistribution = () => {
    const styles: { [key: string]: number } = {};
    results.forEach((result) => {
      if (result.leadership_style) {
        styles[result.leadership_style] = (styles[result.leadership_style] || 0) + 1;
      }
    });

    return Object.entries(styles).map(([name, value]) => ({ name, value }));
  };

  // Quadrant Distribution
  const getQuadrantDistribution = () => {
    const quadrants = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    results.forEach((result) => {
      quadrants[result.quadrant as keyof typeof quadrants]++;
    });

    return Object.entries(quadrants).map(([name, value]) => ({ name, value }));
  };

  const exportReport = () => {
    const csvData = [
      ["Assessment Analytics Report"],
      ["Generated:", new Date().toLocaleString()],
      [""],
      ["Total Assessments:", assessments.length.toString()],
      ["Total Results:", results.length.toString()],
      [""],
      ["Quadrant Distribution"],
      ["Quadrant", "Count"],
      ...getQuadrantDistribution().map((q) => [q.name, q.value.toString()]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analytics-report.csv";
    a.click();
    toast({ title: "Report exported" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const willDistribution = getScoreDistribution("will_score");
  const skillDistribution = getScoreDistribution("skill_score");
  const avgWill = results.reduce((sum, r) => sum + r.will_score, 0) / results.length || 0;
  const avgSkill = results.reduce((sum, r) => sum + r.skill_score, 0) / results.length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive insights into assessment data</p>
        </div>
        <Button onClick={exportReport}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <Tabs defaultValue="scores" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="verticals">Verticals</TabsTrigger>
          <TabsTrigger value="time">Time Series</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Scores Tab */}
        <TabsContent value="scores" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>WILL Score Distribution</CardTitle>
                <CardDescription>Average: {avgWill.toFixed(1)}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={willDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-1))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SKILL Score Distribution</CardTitle>
                <CardDescription>Average: {avgSkill.toFixed(1)}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={skillDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quadrant Distribution Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={getQuadrantOverTime()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="Q1" stackId="1" stroke="#22c55e" fill="#22c55e" />
                  <Area type="monotone" dataKey="Q2" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                  <Area type="monotone" dataKey="Q3" stackId="1" stroke="#ef4444" fill="#ef4444" />
                  <Area type="monotone" dataKey="Q4" stackId="1" stroke="#eab308" fill="#eab308" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quadrant Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getQuadrantDistribution()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getQuadrantDistribution().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verticals Tab */}
        <TabsContent value="verticals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vertical Popularity by Priority</CardTitle>
              <CardDescription>Shows how many candidates selected each vertical</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={getVerticalPopularity()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Priority1" fill="hsl(var(--chart-1))" />
                  <Bar dataKey="Priority2" fill="hsl(var(--chart-2))" />
                  <Bar dataKey="Priority3" fill="hsl(var(--chart-3))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Series Tab */}
        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Submissions Over Time</CardTitle>
              <CardDescription>Daily assessment completion trend</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getSubmissionsOverTime()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Assessments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{assessments.length}</p>
                <p className="text-sm text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">
                  {((assessments.length / (assessments.length + 10)) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">Mock completion rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">24m</p>
                <p className="text-sm text-muted-foreground">Average completion time</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recommended Roles Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getRoleDistribution()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getRoleDistribution().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leadership Style Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getLeadershipDistribution()}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label
                    >
                      {getLeadershipDistribution().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WILL vs SKILL Correlation</CardTitle>
              <CardDescription>Scatter plot showing relationship between scores</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid />
                  <XAxis type="number" dataKey="will_score" name="WILL" unit="" />
                  <YAxis type="number" dataKey="skill_score" name="SKILL" unit="" />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter name="Candidates" data={results} fill="hsl(var(--primary))" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAnalytics;
