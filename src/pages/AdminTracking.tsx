import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Download, Plus, Star, Calendar } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, parseISO, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const ACCURACY_COLORS = {
  accurate: "bg-green-500",
  partial: "bg-yellow-500",
  inaccurate: "bg-red-500",
};

const ROLE_OPTIONS = [
  "Chair",
  "Co-Chair",
  "Executive Member",
  "Vertical Lead",
  "Technical Advisor",
  "Subject Matter Expert",
  "Active Volunteer",
  "Other",
];

type FeedbackRecord = {
  id: string;
  assessment_id: string;
  ai_recommended_role: string;
  actual_role_assigned: string;
  ai_accuracy: "accurate" | "partial" | "inaccurate";
  hire_confidence: "high" | "medium" | "low";
  hire_date: string;
  six_month_review_date: string | null;
  six_month_performance_rating: number | null;
  is_still_active: boolean | null;
  performance_notes: string | null;
  assessment?: any;
  vertical?: any;
};

const AdminTracking = () => {
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [verticals, setVerticals] = useState<any[]>([]);
  const [addingFeedback, setAddingFeedback] = useState(false);
  const [reviewingCandidate, setReviewingCandidate] = useState<FeedbackRecord | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<string>("");
  const [hireDate, setHireDate] = useState<Date>(new Date());
  const [accuracyFilter, setAccuracyFilter] = useState<string>("all");
  const [reviewFilter, setReviewFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [feedbackRes, assessmentsRes, verticalsRes] = await Promise.all([
        supabase
          .from("candidate_feedback")
          .select("*, assessments(*), verticals(*)"),
        supabase
          .from("assessments")
          .select("*, assessment_results(*)")
          .eq("status", "completed")
          .order("completed_at", { ascending: false }),
        supabase.from("verticals").select("*").eq("is_active", true),
      ]);

      if (feedbackRes.error) throw feedbackRes.error;
      if (assessmentsRes.error) throw assessmentsRes.error;
      if (verticalsRes.error) throw verticalsRes.error;

      const feedbackData = (feedbackRes.data || []).map((f: any) => ({
        ...f,
        assessment: f.assessments,
        vertical: f.verticals,
      }));

      setFeedback(feedbackData);
      setAssessments(assessmentsRes.data || []);
      setVerticals(verticalsRes.data || []);
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const addHireDecision = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const assessment = assessments.find((a) => a.id === selectedAssessment);
    const result = assessment?.assessment_results?.[0];

    if (!result) {
      toast({ title: "Error", description: "No assessment result found", variant: "destructive" });
      return;
    }

    const aiAccuracy = formData.get("ai_accuracy") as string;
    const overrideReasoning = formData.get("override_reasoning") as string;

    if ((aiAccuracy === "partial" || aiAccuracy === "inaccurate") && !overrideReasoning) {
      toast({ title: "Error", description: "Override reasoning required", variant: "destructive" });
      return;
    }

    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase.from("candidate_feedback").insert({
      assessment_id: selectedAssessment,
      ai_recommended_role: result.recommended_role,
      ai_recommended_vertical: result.vertical_matches?.[0] || null,
      actual_role_assigned: formData.get("actual_role") as string,
      actual_vertical_assigned: formData.get("actual_vertical") as string || null,
      ai_accuracy: aiAccuracy,
      override_reasoning: overrideReasoning || null,
      hire_confidence: formData.get("hire_confidence") as string,
      hire_date: format(hireDate, "yyyy-MM-dd"),
      recorded_by: user?.user?.id,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Hire decision recorded successfully" });
      loadData();
      setAddingFeedback(false);
      setSelectedAssessment("");
      setHireDate(new Date());
    }
  };

  const submitSixMonthReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!reviewingCandidate) return;

    const formData = new FormData(e.currentTarget);

    const { error } = await supabase
      .from("candidate_feedback")
      .update({
        six_month_review_date: format(new Date(), "yyyy-MM-dd"),
        six_month_performance_rating: parseInt(formData.get("performance_rating") as string),
        is_still_active: formData.get("still_active") === "yes",
        performance_notes: formData.get("performance_notes") as string,
        role_change: formData.get("role_change") as string || null,
      })
      .eq("id", reviewingCandidate.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "6-month review saved successfully" });
      loadData();
      setReviewingCandidate(null);
    }
  };

  const exportFeedback = () => {
    const csvData = [
      ["Candidate Tracking Report"],
      ["Generated:", new Date().toLocaleString()],
      [""],
      ["Name", "AI Role", "Actual Role", "Accuracy", "Hire Date", "Performance", "Active"],
      ...feedback.map((f) => [
        f.assessment?.user_name || "",
        f.ai_recommended_role,
        f.actual_role_assigned,
        f.ai_accuracy,
        f.hire_date,
        f.six_month_performance_rating?.toString() || "Pending",
        f.is_still_active === null ? "Pending" : f.is_still_active ? "Yes" : "No",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "candidate-tracking.csv";
    a.click();
    toast({ title: "Report exported" });
  };

  const needsReview = feedback.filter((f) => {
    if (f.six_month_review_date) return false;
    const hireDateObj = parseISO(f.hire_date);
    const sixMonthsAgo = subDays(new Date(), 180);
    return hireDateObj <= sixMonthsAgo;
  });

  const filteredFeedback = feedback.filter((f) => {
    if (accuracyFilter !== "all" && f.ai_accuracy !== accuracyFilter) return false;
    if (reviewFilter === "pending" && f.six_month_review_date) return false;
    if (reviewFilter === "completed" && !f.six_month_review_date) return false;
    return true;
  });

  const accuracyBreakdown = [
    { name: "Accurate", count: feedback.filter((f) => f.ai_accuracy === "accurate").length },
    { name: "Partial", count: feedback.filter((f) => f.ai_accuracy === "partial").length },
    { name: "Inaccurate", count: feedback.filter((f) => f.ai_accuracy === "inaccurate").length },
  ];

  const avgPerformance =
    feedback.filter((f) => f.six_month_performance_rating).length > 0
      ? feedback.reduce((sum, f) => sum + (f.six_month_performance_rating || 0), 0) /
        feedback.filter((f) => f.six_month_performance_rating).length
      : 0;

  const retentionRate =
    feedback.filter((f) => f.is_still_active !== null).length > 0
      ? (feedback.filter((f) => f.is_still_active === true).length /
          feedback.filter((f) => f.is_still_active !== null).length) *
        100
      : 0;

  const COLORS = ["#22c55e", "#eab308", "#ef4444"];

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
          <h1 className="text-3xl font-bold">Candidate Tracking</h1>
          <p className="text-muted-foreground">Post-hire feedback and performance validation</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={addingFeedback} onOpenChange={setAddingFeedback}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Record Hire Decision
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Hire Decision</DialogTitle>
                <DialogDescription>Track actual hiring outcomes for validation</DialogDescription>
              </DialogHeader>
              <form onSubmit={addHireDecision}>
                <div className="space-y-4">
                  <div>
                    <Label>Select Candidate *</Label>
                    <Select value={selectedAssessment} onValueChange={setSelectedAssessment} required>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Search by name or email" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        {assessments.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.user_name} ({a.user_email}) - AI: {a.assessment_results?.[0]?.recommended_role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedAssessment && (
                    <Card className="bg-muted">
                      <CardContent className="pt-4">
                        <p className="text-sm">
                          <strong>AI Recommendation:</strong>{" "}
                          {assessments.find((a) => a.id === selectedAssessment)?.assessment_results?.[0]?.recommended_role}
                        </p>
                        <p className="text-sm">
                          <strong>Quadrant:</strong>{" "}
                          {assessments.find((a) => a.id === selectedAssessment)?.assessment_results?.[0]?.quadrant}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <div>
                    <Label>Actual Role Assigned *</Label>
                    <Select name="actual_role" required>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        {ROLE_OPTIONS.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Actual Vertical Assigned</Label>
                    <Select name="actual_vertical">
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select vertical (optional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        {verticals.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>AI Accuracy Assessment *</Label>
                    <RadioGroup name="ai_accuracy" required>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="accurate" id="accurate" />
                        <Label htmlFor="accurate">Accurate - AI recommendation matched exactly</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="partial" id="partial" />
                        <Label htmlFor="partial">Partial - Similar level, different vertical</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="inaccurate" id="inaccurate" />
                        <Label htmlFor="inaccurate">Inaccurate - Significantly different role</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label>Override Reasoning (required if Partial/Inaccurate)</Label>
                    <Textarea
                      name="override_reasoning"
                      placeholder="Why did you assign a different role than AI recommended?"
                      maxLength={500}
                    />
                  </div>

                  <div>
                    <Label>Hire Confidence *</Label>
                    <RadioGroup name="hire_confidence" defaultValue="medium" required>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="high" id="high" />
                        <Label htmlFor="high">High - Very confident</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="medium" id="medium" />
                        <Label htmlFor="medium">Medium - Reasonably confident</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="low" id="low" />
                        <Label htmlFor="low">Low - Uncertain, will monitor</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label>Actual Hire Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-background")}>
                          <Calendar className="mr-2 h-4 w-4" />
                          {format(hireDate, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={hireDate}
                          onSelect={(date) => date && setHireDate(date)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button type="submit">Save Hire Decision</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button onClick={exportFeedback} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Insights Dashboard */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Hires</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{feedback.length}</p>
            <p className="text-sm text-muted-foreground">Recorded decisions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{needsReview.length}</p>
            <p className="text-sm text-muted-foreground">Need 6-month review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-6 w-6",
                    i < Math.floor(avgPerformance)
                      ? "fill-yellow-400 text-yellow-400"
                      : i < avgPerformance
                      ? "fill-yellow-200 text-yellow-400"
                      : "text-muted"
                  )}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">{avgPerformance.toFixed(1)}/5.0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Retention Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{retentionRate.toFixed(0)}%</p>
            <p className="text-sm text-muted-foreground">Still active</p>
          </CardContent>
        </Card>
      </div>

      {/* Accuracy Chart */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AI Accuracy Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={accuracyBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => `${props.name}: ${props.count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {accuracyBreakdown.map((entry, index) => (
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
            <CardTitle>Candidates Needing 6-Month Review</CardTitle>
            <CardDescription>{needsReview.length} candidates</CardDescription>
          </CardHeader>
          <CardContent>
            {needsReview.length === 0 ? (
              <p className="text-sm text-muted-foreground">All candidates up to date</p>
            ) : (
              <div className="space-y-2">
                {needsReview.slice(0, 5).map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium text-sm">{f.assessment?.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Hired: {format(parseISO(f.hire_date), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setReviewingCandidate(f)}>
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6-Month Review Dialog */}
      <Dialog open={!!reviewingCandidate} onOpenChange={() => setReviewingCandidate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>6-Month Performance Review</DialogTitle>
            <DialogDescription>
              Review for {reviewingCandidate?.assessment?.user_name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitSixMonthReview}>
            <div className="space-y-4">
              <div>
                <Label>Still Active? *</Label>
                <RadioGroup name="still_active" defaultValue="yes" required>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="active-yes" />
                    <Label htmlFor="active-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="active-no" />
                    <Label htmlFor="active-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Performance Rating (1-5) *</Label>
                <Select name="performance_rating" required>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="1">1 - Well below expectations</SelectItem>
                    <SelectItem value="2">2 - Below expectations</SelectItem>
                    <SelectItem value="3">3 - Meets expectations</SelectItem>
                    <SelectItem value="4">4 - Exceeds expectations</SelectItem>
                    <SelectItem value="5">5 - Outstanding</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Performance Notes</Label>
                <Textarea
                  name="performance_notes"
                  placeholder="Specific achievements, challenges, areas for improvement..."
                  maxLength={1000}
                />
              </div>

              <div>
                <Label>Role Change (if any)</Label>
                <Input name="role_change" placeholder="e.g., Promoted to Co-Chair" />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="submit">Submit Review</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* All Feedback Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Feedback Records</CardTitle>
          <CardDescription>
            <div className="flex gap-4 mt-2">
              <div>
                <Label className="text-xs">Accuracy</Label>
                <Select value={accuracyFilter} onValueChange={setAccuracyFilter}>
                  <SelectTrigger className="w-40 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="accurate">Accurate</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="inaccurate">Inaccurate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Review Status</Label>
                <Select value={reviewFilter} onValueChange={setReviewFilter}>
                  <SelectTrigger className="w-40 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <TableHead>Accuracy</TableHead>
                <TableHead>Hired</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeedback.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.assessment?.user_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{f.ai_recommended_role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>{f.actual_role_assigned}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={ACCURACY_COLORS[f.ai_accuracy]}>{f.ai_accuracy}</Badge>
                  </TableCell>
                  <TableCell>{format(parseISO(f.hire_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    {f.six_month_performance_rating ? (
                      <div className="flex items-center">
                        {Array.from({ length: f.six_month_performance_rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {f.is_still_active === null ? (
                      <Badge variant="secondary">Pending</Badge>
                    ) : (
                      <Badge variant={f.is_still_active ? "default" : "destructive"}>
                        {f.is_still_active ? "Yes" : "No"}
                      </Badge>
                    )}
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

export default AdminTracking;
