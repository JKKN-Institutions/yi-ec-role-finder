import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Star, Download, Trash2, Mail, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ScoringBreakdown } from "@/components/admin/ScoringBreakdown";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface CandidateData {
  id: string;
  user_name: string;
  user_email: string;
  created_at: string;
  completed_at: string;
  status: string;
  review_status: string;
  is_shortlisted: boolean;
  admin_notes: string | null;
  responses: any[];
  results?: {
    will_score: number;
    skill_score: number;
    quadrant: string;
    recommended_role: string;
    role_explanation: string;
    vertical_matches: string[];
    leadership_style: string;
    recommendations: string[];
    key_insights: any;
    reasoning: string;
    scoring_breakdown: any;
  };
  verticals: any[];
}

const CandidateProfile = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewStatus, setReviewStatus] = useState("new");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    loadCandidate();
    loadCurrentUser();
  }, [assessmentId]);

  useEffect(() => {
    if (candidate) {
      setReviewStatus(candidate.review_status);
    }
  }, [candidate]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadCandidate = async () => {
    if (!assessmentId) return;

    const { data: assessment } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", assessmentId)
      .single();

    if (!assessment) {
      toast.error("Candidate not found");
      navigate("/admin/candidates");
      return;
    }

    const { data: responses } = await supabase
      .from("assessment_responses")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("question_number");

    const { data: results } = await supabase
      .from("assessment_results")
      .select("*")
      .eq("assessment_id", assessmentId)
      .single();

    // Load verticals if there are matches
    let verticals: any[] = [];
    if (results?.vertical_matches && results.vertical_matches.length > 0) {
      const { data: verticalsData } = await supabase
        .from("verticals")
        .select("*")
        .in("id", results.vertical_matches);
      verticals = verticalsData || [];
    }

    setCandidate({
      ...assessment,
      responses: responses || [],
      results: results ? {
        will_score: results.will_score,
        skill_score: results.skill_score,
        quadrant: results.quadrant,
        recommended_role: results.recommended_role,
        role_explanation: results.role_explanation,
        vertical_matches: results.vertical_matches as string[],
        leadership_style: results.leadership_style || "",
        recommendations: results.recommendations as string[],
        key_insights: results.key_insights,
        reasoning: results.reasoning || "",
        scoring_breakdown: results.scoring_breakdown,
      } : undefined,
      verticals,
    });

    setAdminNotes(assessment.admin_notes || "");
    setLoading(false);
  };

  const updateStatus = async (newStatus: string) => {
    if (!assessmentId || !currentUserId) return;

    const { error } = await supabase
      .from("assessments")
      .update({
        review_status: newStatus,
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", assessmentId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Status updated to ${newStatus}`);
      loadCandidate();
    }
  };

  const toggleShortlist = async () => {
    if (!assessmentId || !candidate) return;

    const newValue = !candidate.is_shortlisted;
    const { error } = await supabase
      .from("assessments")
      .update({
        is_shortlisted: newValue,
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", assessmentId);

    if (error) {
      toast.error("Failed to update shortlist");
    } else {
      toast.success(newValue ? "Added to shortlist" : "Removed from shortlist");
      loadCandidate();
    }
  };

  const saveNotes = async () => {
    if (!assessmentId) return;

    const { error } = await supabase
      .from("assessments")
      .update({
        admin_notes: adminNotes,
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", assessmentId);

    if (error) {
      toast.error("Failed to save notes");
    } else {
      setLastSaved(new Date());
      toast.success("Notes saved");
    }
  };

  const deleteCandidate = async () => {
    if (!assessmentId) return;

    // Delete in order: results, responses, assessment
    await supabase.from("assessment_results").delete().eq("assessment_id", assessmentId);
    await supabase.from("assessment_responses").delete().eq("assessment_id", assessmentId);
    const { error } = await supabase.from("assessments").delete().eq("id", assessmentId);

    if (error) {
      toast.error("Failed to delete candidate");
    } else {
      toast.success("Candidate deleted");
      navigate("/admin/candidates");
    }
  };

  const handleSaveReview = async () => {
    if (!assessmentId || !currentUserId) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("assessments")
      .update({
        review_status: reviewStatus,
        admin_notes: adminNotes,
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", assessmentId);

    if (error) {
      toast.error("Failed to save review");
    } else {
      toast.success("Review saved successfully");
      setLastSaved(new Date());
      loadCandidate();
    }
    setSaving(false);
  };

  const handleExport = () => {
    if (!candidate) return;
    
    const dataStr = JSON.stringify(candidate, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `candidate-${candidate.user_name}-${assessmentId}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleReanalyze = async () => {
    if (!assessmentId) return;

    setReanalyzing(true);
    toast.info("Re-analyzing assessment...");

    const { data, error } = await supabase.functions.invoke("analyze-assessment", {
      body: { assessmentId },
    });

    if (error) {
      console.error("[Reanalyze] Failed:", error);
      toast.error("Re-analysis failed. Please try again.");
    } else {
      console.log("[Reanalyze] Success:", data);
      toast.success("Re-analysis complete!");
      await loadCandidate();
    }

    setReanalyzing(false);
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

  const getQuadrantLabel = (quadrant: string) => {
    const labels: Record<string, string> = {
      Q1: "STAR - High WILL + High SKILL",
      Q2: "WILLING - High WILL + Low SKILL",
      Q3: "NOT READY - Low WILL + Low SKILL",
      Q4: "RELUCTANT - High SKILL + Low WILL",
    };
    return labels[quadrant] || quadrant;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!candidate) {
    return null;
  }

  const responseMap: Record<number, any> = {};
  candidate.responses.forEach((r) => {
    responseMap[r.question_number] = r;
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader breadcrumb="Candidate Profile" />
          <main className="flex-1 overflow-auto bg-background">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
              {/* Header */}
              <div className="mb-6">
                <Button
                  variant="ghost"
                  onClick={() => navigate("/admin/candidates")}
                  className="mb-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Candidates
                </Button>

                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">{candidate.user_name}</h1>
                    <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {candidate.user_email}
                      </div>
                      <Badge
                        variant={
                          candidate.status === "completed" ? "default" : "secondary"
                        }
                      >
                        {candidate.status}
                      </Badge>
                      <Badge
                        variant={
                          candidate.review_status === "approved"
                            ? "default"
                            : candidate.review_status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {candidate.review_status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReanalyze}
                      disabled={reanalyzing}
                    >
                      {reanalyzing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Re-analyze
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleShortlist}
                    >
                      <Star
                        className={`h-4 w-4 mr-2 ${
                          candidate.is_shortlisted ? "fill-yellow-400 text-yellow-400" : ""
                        }`}
                      />
                      {candidate.is_shortlisted ? "Shortlisted" : "Shortlist"}
                    </Button>

                    <Button variant="outline" size="sm" onClick={handleExport}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Candidate?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this candidate's assessment and all
                            associated data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={deleteCandidate}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Results Summary */}
                <div className="space-y-6">
                  {candidate.results && (
                    <Card className="p-6">
                      <h2 className="text-xl font-semibold mb-4">Assessment Results</h2>

                      <div className="space-y-6">
                        {/* Quadrant Display */}
                        <div className="text-center p-6 rounded-lg border-2 border-primary">
                          <div
                            className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${getQuadrantColor(
                              candidate.results.quadrant
                            )} text-white text-2xl font-bold mb-3`}
                          >
                            {candidate.results.quadrant}
                          </div>
                          <h3 className="text-lg font-semibold">
                            {getQuadrantLabel(candidate.results.quadrant)}
                          </h3>
                        </div>

                        {/* Scores */}
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium">WILL Score</span>
                              <span className="text-sm font-bold">
                                {candidate.results.will_score}/100
                              </span>
                            </div>
                            <Progress value={candidate.results.will_score} />
                          </div>

                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium">SKILL Score</span>
                              <span className="text-sm font-bold">
                                {candidate.results.skill_score}/100
                              </span>
                            </div>
                            <Progress value={candidate.results.skill_score} />
                          </div>
                        </div>

                        {/* Recommended Role */}
                        <div>
                          <h3 className="text-sm font-medium mb-2">Recommended Role</h3>
                          <Badge className="text-base px-4 py-2">
                            {candidate.results.recommended_role}
                          </Badge>
                        </div>

                        {/* Vertical Matches */}
                        {candidate.results.vertical_matches &&
                          candidate.results.vertical_matches.length > 0 && (
                            <div>
                              <h3 className="text-sm font-medium mb-2">Vertical Matches</h3>
                              <div className="flex flex-wrap gap-2">
                                {candidate.results.vertical_matches.map((vertical, idx) => (
                                  <Badge key={idx} variant="secondary">
                                    {vertical}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Leadership Style */}
                        {candidate.results.leadership_style && (
                          <div>
                            <h3 className="text-sm font-medium mb-2">Leadership Style</h3>
                            <p className="text-sm text-muted-foreground">
                              {candidate.results.leadership_style}
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* Review Actions */}
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Review Actions</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Review Status
                        </label>
                        <Select value={reviewStatus} onValueChange={setReviewStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="pending">Pending Review</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Admin Notes
                        </label>
                        <Textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Add notes about this candidate..."
                          rows={4}
                        />
                      </div>

                      <Button
                        onClick={handleSaveReview}
                        disabled={saving}
                        className="w-full"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Review"
                        )}
                      </Button>
                    </div>
                  </Card>
                </div>

                {/* Right Column - Question Responses */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Recommendations */}
                  {candidate.results?.recommendations && (
                    <Card className="p-6">
                      <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
                      <ul className="space-y-2">
                        {candidate.results.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-primary">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {/* Scoring Breakdown */}
                  {candidate.results?.scoring_breakdown && (
                    <ScoringBreakdown 
                      willScore={candidate.results.will_score}
                      skillScore={candidate.results.skill_score}
                      scoringBreakdown={candidate.results.scoring_breakdown}
                    />
                  )}

                  {/* Responses */}
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Assessment Responses</h2>

                    <div className="space-y-6">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((qNum) => {
                        const response = responseMap[qNum];
                        if (!response) return null;

                        return (
                          <div key={qNum} className="border-b pb-4 last:border-0">
                            <h3 className="font-medium mb-2">
                              Q{qNum}: {response.question_text}
                            </h3>
                            <div className="pl-4 text-sm text-muted-foreground">
                              {typeof response.response_data === "string" ? (
                                <p>{response.response_data}</p>
                              ) : (
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(response.response_data, null, 2)}
                                </pre>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  {/* AI Analysis Reasoning */}
                  {candidate.results?.reasoning && (
                    <Card className="p-6">
                      <Accordion type="single" collapsible>
                        <AccordionItem value="ai">
                          <AccordionTrigger>AI Analysis Details</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3">
                              <div className="text-sm whitespace-pre-wrap">
                                {candidate.results.reasoning}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CandidateProfile;
