import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import { ArrowLeft, Star, Download, Trash2, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    loadCandidate();
    loadCurrentUser();
  }, [assessmentId]);

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/candidates")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Candidates
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{candidate.user_name}</h1>
              <a
                href={`mailto:${candidate.user_email}`}
                className="text-muted-foreground hover:text-primary flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                {candidate.user_email}
              </a>
              <p className="text-sm text-muted-foreground mt-2">
                Submitted: {format(new Date(candidate.created_at), "MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Select value={candidate.review_status} onValueChange={updateStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant={candidate.is_shortlisted ? "default" : "outline"}
              onClick={toggleShortlist}
              className="gap-2"
            >
              <Star
                className={`h-4 w-4 ${candidate.is_shortlisted ? "fill-current" : ""}`}
              />
              {candidate.is_shortlisted ? "Shortlisted" : "Shortlist"}
            </Button>

            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2 ml-auto">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Candidate?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this candidate's assessment, responses, and
                    results. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteCandidate}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>

        {/* Main Content - 3 Columns */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT COLUMN: Scores */}
          <div className="space-y-6">
            {candidate.results && (
              <>
                {/* Scores Card */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">WILL/SKILL Scores</h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">WILL</span>
                        <span className="text-2xl font-bold text-primary">
                          {candidate.results.will_score}
                        </span>
                      </div>
                      <Progress value={candidate.results.will_score} className="h-3" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">SKILL</span>
                        <span className="text-2xl font-bold text-blue-600">
                          {candidate.results.skill_score}
                        </span>
                      </div>
                      <Progress value={candidate.results.skill_score} className="h-3" />
                    </div>
                  </div>
                </Card>

                {/* Quadrant Card */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Quadrant</h3>
                  <Badge
                    className={`${getQuadrantColor(candidate.results.quadrant)} text-white mb-2`}
                  >
                    {candidate.results.quadrant}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {getQuadrantLabel(candidate.results.quadrant)}
                  </p>
                </Card>

                {/* Recommended Role */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Recommended Role</h3>
                  <Badge className="text-lg mb-3">{candidate.results.recommended_role}</Badge>
                  <p className="text-sm text-muted-foreground">
                    {candidate.results.role_explanation}
                  </p>
                </Card>

                {/* Vertical Matches */}
                {candidate.verticals.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Vertical Matches</h3>
                    <div className="space-y-4">
                      {candidate.verticals.map((vertical, index) => (
                        <div key={vertical.id}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-sm">{vertical.name}</span>
                            <span className="text-xs text-muted-foreground">
                              #{index + 1}
                            </span>
                          </div>
                          <Progress value={85 - index * 10} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>

          {/* MIDDLE COLUMN: Responses */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Assessment Responses</h3>
              
              <Accordion type="single" collapsible className="space-y-2">
                {/* Q1: Vertical Preferences */}
                {responseMap[1] && (
                  <AccordionItem value="q1">
                    <AccordionTrigger>Question 1: Vertical Preferences</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {responseMap[1].response_data.priority1 && (
                          <div className="flex items-center gap-2">
                            <Badge>Priority 1</Badge>
                            <span className="text-sm">
                              {candidate.verticals.find(
                                (v) => v.id === responseMap[1].response_data.priority1
                              )?.name || responseMap[1].response_data.priority1}
                            </span>
                          </div>
                        )}
                        {responseMap[1].response_data.priority2 && (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Priority 2</Badge>
                            <span className="text-sm">
                              {candidate.verticals.find(
                                (v) => v.id === responseMap[1].response_data.priority2
                              )?.name || responseMap[1].response_data.priority2}
                            </span>
                          </div>
                        )}
                        {responseMap[1].response_data.priority3 && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Priority 3</Badge>
                            <span className="text-sm">
                              {candidate.verticals.find(
                                (v) => v.id === responseMap[1].response_data.priority3
                              )?.name || responseMap[1].response_data.priority3}
                            </span>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Q2: Saturday Scenario */}
                {responseMap[2] && (
                  <AccordionItem value="q2">
                    <AccordionTrigger>Question 2: Saturday Emergency</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <div className="bg-muted p-3 rounded text-sm">
                          {responseMap[2].response_data.response}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Word count: {responseMap[2].response_data.response?.split(" ").length || 0}
                        </p>
                        {candidate.results?.scoring_breakdown?.will?.saturday_scenario && (
                          <div className="border-t pt-3">
                            <p className="text-sm font-medium">
                              AI Commitment Score:{" "}
                              {candidate.results.scoring_breakdown.will.saturday_scenario.score}/25
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {candidate.results.scoring_breakdown.will.saturday_scenario.reasoning}
                            </p>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Q3: Achievement Statement */}
                {responseMap[3] && (
                  <AccordionItem value="q3">
                    <AccordionTrigger>Question 3: Achievement Statement</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <div className="bg-muted p-3 rounded text-sm">
                          {responseMap[3].response_data.statement}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Word count: {responseMap[3].response_data.statement?.split(" ").length || 0}
                        </p>
                        {candidate.results?.scoring_breakdown?.will?.achievement && (
                          <div className="border-t pt-3">
                            <p className="text-sm font-medium">
                              Score: {candidate.results.scoring_breakdown.will.achievement}/25
                            </p>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Q4: Constraints */}
                {responseMap[4] && (
                  <AccordionItem value="q4">
                    <AccordionTrigger>Question 4: Constraints</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Selected:</span>
                          <Badge>{responseMap[4].response_data.constraint}</Badge>
                        </div>
                        {responseMap[4].response_data.handling && (
                          <div className="bg-muted p-3 rounded text-sm">
                            <p className="font-medium mb-1">How they'll handle it:</p>
                            {responseMap[4].response_data.handling}
                          </div>
                        )}
                        {candidate.results?.scoring_breakdown?.will?.constraints && (
                          <p className="text-sm font-medium">
                            Score: {candidate.results.scoring_breakdown.will.constraints}/30
                          </p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Q5: Leadership Style */}
                {responseMap[5] && (
                  <AccordionItem value="q5">
                    <AccordionTrigger>Question 5: Leadership Style</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Selected:</span>
                          <Badge>{responseMap[5].response_data.leadership_style}</Badge>
                        </div>
                        {candidate.results?.scoring_breakdown?.will?.leadership_style && (
                          <p className="text-sm font-medium">
                            Score: {candidate.results.scoring_breakdown.will.leadership_style}/20
                          </p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </Card>
          </div>

          {/* RIGHT COLUMN: Insights & Notes */}
          <div className="space-y-6">
            {candidate.results && (
              <>
                {/* Key Insights */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
                  <div className="space-y-3">
                    {candidate.results.key_insights?.leadership_style && (
                      <div>
                        <p className="text-sm font-medium">Leadership Style:</p>
                        <p className="text-sm text-muted-foreground">
                          {candidate.results.key_insights.leadership_style}
                        </p>
                      </div>
                    )}
                    {candidate.results.key_insights?.commitment_level && (
                      <div>
                        <p className="text-sm font-medium">Commitment Level:</p>
                        <p className="text-sm text-muted-foreground">
                          {candidate.results.key_insights.commitment_level}
                        </p>
                      </div>
                    )}
                    {candidate.results.key_insights?.skill_readiness && (
                      <div>
                        <p className="text-sm font-medium">Skill Readiness:</p>
                        <p className="text-sm text-muted-foreground">
                          {candidate.results.key_insights.skill_readiness}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Strengths */}
                {candidate.results.key_insights?.top_strengths && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Top Strengths</h3>
                    <ul className="space-y-2">
                      {candidate.results.key_insights.top_strengths.map(
                        (strength: string, index: number) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {strength}
                          </li>
                        )
                      )}
                    </ul>
                  </Card>
                )}

                {/* Development Areas */}
                {candidate.results.key_insights?.development_areas && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Development Areas</h3>
                    <ul className="space-y-2">
                      {candidate.results.key_insights.development_areas.map(
                        (area: string, index: number) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {area}
                          </li>
                        )
                      )}
                    </ul>
                  </Card>
                )}

                {/* Recommendations */}
                {candidate.results.recommendations && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Growth Recommendations</h3>
                    <ol className="space-y-3">
                      {candidate.results.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-sm flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ol>
                  </Card>
                )}
              </>
            )}

            {/* Admin Notes */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Admin Notes</h3>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                onBlur={saveNotes}
                placeholder="Add notes about this candidate..."
                className="min-h-[120px]"
              />
              {lastSaved && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last saved: {format(lastSaved, "h:mm a")}
                </p>
              )}
            </Card>

            {/* AI Analysis */}
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
    </div>
  );
};

export default CandidateProfile;
