import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download, Plus, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, parseISO } from "date-fns";

const MATCH_STATUS_COLORS = {
  accurate: "bg-green-500",
  partial: "bg-yellow-500",
  inaccurate: "bg-red-500",
};

type ValidationMetric = {
  id: string;
  assessment_id: string;
  ai_recommended_role: string;
  actual_role_assigned: string | null;
  match_status: "accurate" | "partial" | "inaccurate" | null;
  override_reasoning: string | null;
  hire_date: string | null;
  performance_rating: number | null;
  still_active: boolean;
  retention_6_month: boolean | null;
  admin_feedback: string | null;
  assessment?: any;
  result?: any;
};

import { useChapterContext } from "./Admin";

const AdminValidation = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ValidationMetric[]>([]);
  const [filteredMetrics, setFilteredMetrics] = useState<ValidationMetric[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addingMetric, setAddingMetric] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<string>("");
  const { toast } = useToast();
  const { chapterId, isSuperAdmin } = useChapterContext();

  useEffect(() => {
    loadData();
  }, [chapterId]);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredMetrics(metrics);
    } else {
      setFilteredMetrics(metrics.filter((m) => m.match_status === statusFilter));
    }
  }, [statusFilter, metrics]);

  const loadData = async () => {
    setLoading(true);
    try {
      let metricsQuery = supabase
        .from("validation_metrics" as any)
        .select(`
          *,
          assessments(
            user_name,
            user_email
          ),
          assessment_results(recommended_role, quadrant)
        `);
      
      let assessmentsQuery = supabase
        .from("assessments" as any)
        .select("*, assessment_results(*)")
        .eq("status", "completed");

      if (!isSuperAdmin || (chapterId && chapterId !== "all")) {
        metricsQuery = metricsQuery.eq("chapter_id", chapterId);
        assessmentsQuery = assessmentsQuery.eq("chapter_id", chapterId);
      }

      const [metricsRes, assessmentsRes] = await Promise.all([
        metricsQuery,
        assessmentsQuery,
      ]);

      if (metricsRes.error) throw metricsRes.error;
      if (assessmentsRes.error) throw assessmentsRes.error;

      const metricsData = (metricsRes.data || []).map((m: any) => ({
        ...m,
        assessment: m.assessments,
        result: m.assessments?.assessment_results?.[0] || null,
      }));

      setMetrics(metricsData);
      setFilteredMetrics(metricsData);
      setAssessments(assessmentsRes.data || []);
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const addValidationMetric = async (data: {
    assessment_id: string;
    actual_role_assigned: string;
    match_status: "accurate" | "partial" | "inaccurate";
    override_reasoning?: string;
    hire_date: string;
    performance_rating: number;
  }) => {
    const assessment = assessments.find((a) => a.id === data.assessment_id);
    const result = assessment?.assessment_results?.[0];

    if (!result) {
      toast({ title: "Error", description: "No assessment result found", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("validation_metrics").insert({
      assessment_id: data.assessment_id,
      ai_recommended_role: result.recommended_role,
      actual_role_assigned: data.actual_role_assigned,
      match_status: data.match_status,
      override_reasoning: data.override_reasoning,
      hire_date: data.hire_date,
      performance_rating: data.performance_rating,
      still_active: true,
      retention_6_month: null,
    });

    if (error) {
      toast({ title: "Error adding metric", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Metric added successfully" });
      loadData();
      setAddingMetric(false);
      setSelectedAssessment("");
    }
  };

  const updateMetric = async (id: string, updates: Partial<ValidationMetric>) => {
    const { error } = await supabase.from("validation_metrics").update(updates).eq("id", id);

    if (error) {
      toast({ title: "Error updating metric", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Metric updated" });
      loadData();
    }
  };

  const exportReport = () => {
    const csvData = [
      ["Validation Report"],
      ["Generated:", new Date().toLocaleString()],
      [""],
      ["Name", "AI Role", "Actual Role", "Match Status", "Performance", "Active"],
      ...filteredMetrics.map((m) => [
        m.assessment?.user_name || "",
        m.ai_recommended_role,
        m.actual_role_assigned || "",
        m.match_status || "",
        m.performance_rating?.toString() || "",
        m.still_active ? "Yes" : "No",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "validation-report.csv";
    a.click();
    toast({ title: "Report exported" });
  };

  // Calculate metrics
  const totalFeedback = metrics.length;
  const accurateCount = metrics.filter((m) => m.match_status === "accurate").length;
  const accuracy = totalFeedback > 0 ? (accurateCount / totalFeedback) * 100 : 0;
  const overrideCount = metrics.filter((m) => m.match_status !== "accurate" && m.override_reasoning).length;
  const overrideRate = totalFeedback > 0 ? (overrideCount / totalFeedback) * 100 : 0;
  const retentionCount = metrics.filter((m) => m.retention_6_month === true).length;
  const retentionRate = metrics.filter((m) => m.retention_6_month !== null).length > 0
    ? (retentionCount / metrics.filter((m) => m.retention_6_month !== null).length) * 100
    : 0;

  const accuracyBreakdown = [
    { name: "Accurate", count: metrics.filter((m) => m.match_status === "accurate").length },
    { name: "Partial", count: metrics.filter((m) => m.match_status === "partial").length },
    { name: "Inaccurate", count: metrics.filter((m) => m.match_status === "inaccurate").length },
  ];

  const performanceData = metrics
    .filter((m) => m.performance_rating && m.result)
    .map((m) => ({
      score: m.result.will_score + m.result.skill_score,
      performance: m.performance_rating,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Validation & Accuracy</h1>
          <p className="text-muted-foreground">Track AI prediction accuracy and real-world outcomes</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={addingMetric} onOpenChange={setAddingMetric}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Feedback
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Validation Feedback</DialogTitle>
                <DialogDescription>Track how candidates performed after hiring</DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  addValidationMetric({
                    assessment_id: formData.get("assessment_id") as string,
                    actual_role_assigned: formData.get("actual_role") as string,
                    match_status: formData.get("match_status") as any,
                    override_reasoning: formData.get("override_reasoning") as string,
                    hire_date: formData.get("hire_date") as string,
                    performance_rating: parseInt(formData.get("performance_rating") as string),
                  });
                }}
              >
                <div className="space-y-4">
                  <div>
                    <Label>Candidate</Label>
                    <Select name="assessment_id" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select candidate" />
                      </SelectTrigger>
                      <SelectContent>
                        {assessments.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.user_name} - {a.assessment_results?.[0]?.recommended_role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Actual Role Assigned</Label>
                    <Input name="actual_role" required />
                  </div>
                  <div>
                    <Label>Match Status</Label>
                    <Select name="match_status" required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accurate">Accurate</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="inaccurate">Inaccurate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Override Reasoning (if applicable)</Label>
                    <Textarea name="override_reasoning" />
                  </div>
                  <div>
                    <Label>Hire Date</Label>
                    <Input name="hire_date" type="date" required />
                  </div>
                  <div>
                    <Label>Performance Rating (1-5)</Label>
                    <Input name="performance_rating" type="number" min="1" max="5" required />
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button type="submit">Add Feedback</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button onClick={exportReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{totalFeedback}</p>
            <p className="text-sm text-muted-foreground">
              {totalFeedback > 0 ? ((totalFeedback / assessments.length) * 100).toFixed(0) : 0}% of all assessments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prediction Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-4xl font-bold ${accuracy >= 70 ? "text-green-600" : accuracy >= 50 ? "text-yellow-600" : "text-red-600"}`}>
              {accuracy.toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground">{accurateCount} accurate predictions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Override Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{overrideRate.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">{overrideCount} recommendations changed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6-Month Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{retentionRate.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">{retentionCount} still active</p>
          </CardContent>
        </Card>
      </div>

      {/* Accuracy Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Accuracy Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={accuracyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count">
                {accuracyBreakdown.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.name === "Accurate" ? "#22c55e" : entry.name === "Partial" ? "#eab308" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Correlation */}
      {performanceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Score vs Performance Rating</CardTitle>
            <CardDescription>Correlation between assessment scores and real-world performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid />
                <XAxis type="number" dataKey="score" name="Total Score" unit="" />
                <YAxis type="number" dataKey="performance" name="Performance" domain={[0, 6]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter name="Candidates" data={performanceData} fill="hsl(var(--primary))" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detailed Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Feedback</CardTitle>
          <CardDescription>
            <div className="flex items-center gap-2 mt-2">
              <Label>Filter by status:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="accurate">Accurate</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="inaccurate">Inaccurate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>AI Role</TableHead>
                <TableHead>Actual Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMetrics.map((metric) => (
                <TableRow key={metric.id}>
                  <TableCell className="font-medium">{metric.assessment?.user_name}</TableCell>
                  <TableCell>{metric.ai_recommended_role}</TableCell>
                  <TableCell>{metric.actual_role_assigned || "-"}</TableCell>
                  <TableCell>
                    {metric.match_status && (
                      <Badge className={MATCH_STATUS_COLORS[metric.match_status]}>
                        {metric.match_status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {metric.hire_date ? format(parseISO(metric.hire_date), "MMM dd, yyyy") : "-"}
                  </TableCell>
                  <TableCell>
                    {metric.performance_rating ? (
                      <div className="flex items-center">
                        {Array.from({ length: metric.performance_rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={metric.still_active ? "default" : "secondary"}>
                      {metric.still_active ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminValidation;
