import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, X, Plus, Download, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from "recharts";

type CandidateData = {
  assessment: any;
  result: any;
  responses: any[];
};

type ComparisonReport = {
  ranking: { [key: string]: string[] };
  teamComposition: string[];
  strengths: { [key: string]: string[] };
  concerns: { [key: string]: string[] };
  recommendation: string;
};

const QUADRANT_COLORS: { [key: string]: string } = {
  Q1: "bg-green-500",
  Q2: "bg-blue-500",
  Q3: "bg-red-500",
  Q4: "bg-yellow-500",
};

const AdminComparison = () => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<CandidateData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [aiReport, setAiReport] = useState<ComparisonReport | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    const { data: assessments, error } = await supabase
      .from("assessments")
      .select(`
        *,
        assessment_results (*)
      `)
      .eq("status", "completed")
      .order("completed_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading candidates", description: error.message, variant: "destructive" });
    } else {
      setCandidates(assessments || []);
    }
    setLoading(false);
  };

  const addCandidate = async (assessmentId: string) => {
    if (selectedCandidates.length >= 4) {
      toast({ title: "Maximum reached", description: "You can compare up to 4 candidates", variant: "destructive" });
      return;
    }

    const { data: assessment } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", assessmentId)
      .single();

    const { data: result } = await supabase
      .from("assessment_results")
      .select("*")
      .eq("assessment_id", assessmentId)
      .single();

    const { data: responses } = await supabase
      .from("assessment_responses")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("question_number");

    if (assessment && result && responses) {
      setSelectedCandidates([...selectedCandidates, { assessment, result, responses }]);
      toast({ title: "Candidate added", description: `${assessment.user_name} added to comparison` });
    }
  };

  const removeCandidate = (assessmentId: string) => {
    setSelectedCandidates(selectedCandidates.filter(c => c.assessment.id !== assessmentId));
    toast({ title: "Candidate removed" });
  };

  const generateAIReport = async () => {
    setGeneratingReport(true);
    try {
      const candidateData = selectedCandidates.map(c => ({
        name: c.assessment.user_name,
        will: c.result.will_score,
        skill: c.result.skill_score,
        quadrant: c.result.quadrant,
        role: c.result.recommended_role,
        leadership: c.result.leadership_style,
        insights: c.result.key_insights,
      }));

      const { data, error } = await supabase.functions.invoke("compare-candidates", {
        body: { candidates: candidateData },
      });

      if (error) throw error;
      setAiReport(data.report);
      toast({ title: "Report generated", description: "AI comparison complete" });
    } catch (error: any) {
      toast({ title: "Error generating report", description: error.message, variant: "destructive" });
    }
    setGeneratingReport(false);
  };

  const getRadarData = () => {
    if (selectedCandidates.length === 0) return [];

    return [
      {
        dimension: "Personal\nOwnership",
        ...selectedCandidates.reduce((acc, c, idx) => ({
          ...acc,
          [`Candidate ${idx + 1}`]: c.result.personal_ownership_score || 0,
        }), {}),
      },
      {
        dimension: "Impact\nReadiness",
        ...selectedCandidates.reduce((acc, c, idx) => ({
          ...acc,
          [`Candidate ${idx + 1}`]: c.result.impact_readiness_score || 0,
        }), {}),
      },
      {
        dimension: "WILL",
        ...selectedCandidates.reduce((acc, c, idx) => ({
          ...acc,
          [`Candidate ${idx + 1}`]: c.result.will_score,
        }), {}),
      },
      {
        dimension: "SKILL",
        ...selectedCandidates.reduce((acc, c, idx) => ({
          ...acc,
          [`Candidate ${idx + 1}`]: c.result.skill_score,
        }), {}),
      },
    ];
  };

  const filteredCandidates = candidates.filter(c =>
    c.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.user_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportComparison = () => {
    const csvContent = [
      ["Name", "Email", "WILL", "SKILL", "Quadrant", "Role"],
      ...selectedCandidates.map(c => [
        c.assessment.user_name,
        c.assessment.user_email,
        c.result.will_score,
        c.result.skill_score,
        c.result.quadrant,
        c.result.recommended_role,
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "candidate-comparison.csv";
    a.click();
    toast({ title: "Exported", description: "Comparison data downloaded" });
  };

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
          <h1 className="text-3xl font-bold">Candidate Comparison</h1>
          <p className="text-muted-foreground">Compare up to 4 candidates side-by-side</p>
        </div>
      </div>

      {/* Selection Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Select Candidates to Compare</CardTitle>
          <CardDescription>
            {selectedCandidates.length}/4 candidates selected
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button disabled={selectedCandidates.length >= 4}>
                <Plus className="h-4 w-4 mr-2" />
                Add Candidate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select a Candidate</DialogTitle>
                <DialogDescription>
                  Search and select a candidate to add to comparison
                </DialogDescription>
              </DialogHeader>
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="space-y-2 mt-4">
                {filteredCandidates.map((candidate) => (
                  <Card
                    key={candidate.id}
                    className="p-4 cursor-pointer hover:bg-accent"
                    onClick={() => addCandidate(candidate.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{candidate.user_name}</p>
                        <p className="text-sm text-muted-foreground">{candidate.user_email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {candidate.assessment_results?.[0] && (
                          <>
                            <Badge className={QUADRANT_COLORS[candidate.assessment_results[0].quadrant]}>
                              {candidate.assessment_results[0].quadrant}
                            </Badge>
                            <span className="text-sm">
                              {candidate.assessment_results[0].will_score}/{candidate.assessment_results[0].skill_score}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Selected Candidates */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {selectedCandidates.map((candidate) => (
              <Card key={candidate.assessment.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold">{candidate.assessment.user_name}</p>
                      <p className="text-xs text-muted-foreground">{candidate.assessment.user_email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCandidate(candidate.assessment.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-sm">
                      <span>WILL:</span>
                      <span className="font-semibold">{candidate.result.will_score}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>SKILL:</span>
                      <span className="font-semibold">{candidate.result.skill_score}</span>
                    </div>
                    <Badge className={QUADRANT_COLORS[candidate.result.quadrant]}>
                      {candidate.result.quadrant}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setComparing(true)}
              disabled={selectedCandidates.length < 2}
            >
              Compare Candidates
            </Button>
            {comparing && (
              <>
                <Button variant="outline" onClick={exportComparison}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCandidates([]);
                    setComparing(false);
                    setAiReport(null);
                  }}
                >
                  Clear All
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison View */}
      {comparing && selectedCandidates.length >= 2 && (
        <>
          {/* Score Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Score Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {selectedCandidates.map((candidate) => (
                  <div key={candidate.assessment.id} className="space-y-4">
                    <div>
                      <p className="font-semibold text-lg">{candidate.assessment.user_name}</p>
                      <Badge className={QUADRANT_COLORS[candidate.result.quadrant]}>
                        {candidate.result.quadrant}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Personal Ownership</span>
                          <span className="font-semibold">{candidate.result.personal_ownership_score || 0}/100</span>
                        </div>
                        <Progress value={candidate.result.personal_ownership_score || 0} className="bg-purple-200" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Impact Readiness</span>
                          <span className="font-semibold">{candidate.result.impact_readiness_score || 0}/100</span>
                        </div>
                        <Progress value={candidate.result.impact_readiness_score || 0} className="bg-blue-200" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>WILL</span>
                          <span className="font-semibold">{candidate.result.will_score}/100</span>
                        </div>
                        <Progress value={candidate.result.will_score} className="bg-green-200" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>SKILL</span>
                          <span className="font-semibold">{candidate.result.skill_score}/100</span>
                        </div>
                        <Progress value={candidate.result.skill_score} className="bg-orange-200" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Recommended Role</p>
                      <Badge variant="outline">{candidate.result.recommended_role}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Multidimensional Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={getRadarData()}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  {selectedCandidates.map((_, idx) => (
                    <Radar
                      key={idx}
                      name={`Candidate ${idx + 1}`}
                      dataKey={`Candidate ${idx + 1}`}
                      stroke={`hsl(${idx * 90}, 70%, 50%)`}
                      fill={`hsl(${idx * 90}, 70%, 50%)`}
                      fillOpacity={0.3}
                    />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Response Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="q1">
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="q1">Q1</TabsTrigger>
                  <TabsTrigger value="q2">Q2</TabsTrigger>
                  <TabsTrigger value="q3">Q3</TabsTrigger>
                  <TabsTrigger value="q4">Q4</TabsTrigger>
                  <TabsTrigger value="q5">Q5</TabsTrigger>
                </TabsList>

                {[1, 2, 3, 4, 5].map((qNum) => (
                  <TabsContent key={qNum} value={`q${qNum}`} className="space-y-4 mt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      {selectedCandidates.map((candidate) => {
                        const response = candidate.responses.find(r => r.question_number === qNum);
                        const hasAdaptation = response?.adapted_question_text;
                        
                        return (
                          <Card key={candidate.assessment.id}>
                            <CardHeader>
                              <CardTitle className="text-base">{candidate.assessment.user_name}</CardTitle>
                              {response && (
                                <CardDescription className="text-xs mt-1">
                                  {response.question_text}
                                </CardDescription>
                              )}
                            </CardHeader>
                            <CardContent>
                              {response && (
                                <div className="space-y-4">
                                  {/* Show question adaptation info */}
                                  {hasAdaptation && (
                                    <div className="space-y-3 pb-4 border-b">
                                      <div className="flex items-center gap-2 text-sm text-primary font-medium">
                                        <Sparkles className="w-4 h-4" />
                                        <span>Personalized Question</span>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground mb-1">Original Question:</p>
                                          <p className="text-sm bg-muted/50 p-2 rounded">
                                            {(() => {
                                              const defaultQuestions: Record<number, string> = {
                                                2: "Let's say Yi Erode gives you 6 months and ₹50,000 to work on the problem you described in Q1. Design your initiative...",
                                                3: "It's Saturday, 6 PM. You're relaxing with family when your vertical head calls: 'We need urgent help preparing for tomorrow's major event...'",
                                                4: "What's the most significant achievement you want to accomplish in Yi Erode 2026? Describe a specific, ambitious goal...",
                                                5: "Your team misses a critical deadline. What's your first instinct?"
                                              };
                                              return defaultQuestions[qNum] || "Default question";
                                            })()}
                                          </p>
                                        </div>
                                        
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground mb-1">What They Saw (Adapted):</p>
                                          <p className="text-sm bg-primary/5 border border-primary/20 p-2 rounded">
                                            {response.adapted_question_text}
                                          </p>
                                        </div>
                                        
                                        {response.adaptation_context && (
                                          <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1">Context Used:</p>
                                            <p className="text-xs text-muted-foreground">
                                              {response.adaptation_context.contextSummary}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Response data */}
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Response:</p>
                                    <div className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded">
                                      {(() => {
                                        const data = response.response_data as any;
                                        if (qNum === 1) {
                                          return (
                                            <div className="space-y-2">
                                              <p><strong>Problem:</strong> {data.partA}</p>
                                              <p><strong>Verticals Selected:</strong></p>
                                              <ol className="list-decimal ml-4">
                                                {data.selectedVerticals?.map((v: any, i: number) => (
                                                  <li key={i}>{v.name}</li>
                                                ))}
                                              </ol>
                                            </div>
                                          );
                                        } else if (qNum === 5) {
                                          return <p>{data.leadershipStyle}</p>;
                                        } else {
                                          return <p>{data.response}</p>;
                                        }
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* AI Comparative Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>AI Comparative Analysis</CardTitle>
              <CardDescription>
                Generate an in-depth comparison report using AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={generateAIReport} disabled={generatingReport}>
                {generatingReport ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Comparison Report
                  </>
                )}
              </Button>

              {aiReport && (
                <div className="space-y-4 mt-4">
                  <Alert>
                    <AlertDescription>
                      <h3 className="font-semibold mb-2">Overall Recommendation</h3>
                      <p>{aiReport.recommendation}</p>
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Role Rankings</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {Object.entries(aiReport.ranking).map(([role, candidates]) => (
                          <div key={role} className="mb-2">
                            <p className="font-semibold text-sm">{role}:</p>
                            <ol className="list-decimal list-inside text-sm text-muted-foreground">
                              {candidates.map((name, idx) => (
                                <li key={idx}>{name}</li>
                              ))}
                            </ol>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Team Composition</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1 text-sm">
                          {aiReport.teamComposition.map((suggestion, idx) => (
                            <li key={idx} className="text-muted-foreground">• {suggestion}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Individual Strengths & Concerns</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        {Object.entries(aiReport.strengths).map(([name, strengths]) => (
                          <div key={name}>
                            <p className="font-semibold text-sm mb-1">{name}</p>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Strengths:</p>
                              <ul className="text-sm space-y-1">
                                {strengths.map((s, idx) => (
                                  <li key={idx} className="text-green-600">✓ {s}</li>
                                ))}
                              </ul>
                              {aiReport.concerns[name] && (
                                <>
                                  <p className="text-xs text-muted-foreground mt-2">Concerns:</p>
                                  <ul className="text-sm space-y-1">
                                    {aiReport.concerns[name].map((c, idx) => (
                                      <li key={idx} className="text-orange-600">⚠ {c}</li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminComparison;
