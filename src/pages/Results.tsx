import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  Share2,
  TrendingUp,
  Target,
  Lightbulb,
  Star,
  CheckCircle2,
} from "lucide-react";
import confetti from "canvas-confetti";

type AssessmentResult = {
  will_score: number;
  skill_score: number;
  quadrant: string;
  recommended_role: string;
  role_explanation: string;
  vertical_matches: string[];
  leadership_style: string | null;
  recommendations: any;
  key_insights: any;
  reasoning: string | null;
  scoring_breakdown: any;
};

type Vertical = {
  id: string;
  name: string;
  description: string | null;
};

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<AssessmentResult | null>(null);
  const [userName, setUserName] = useState("");
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [animatedWill, setAnimatedWill] = useState(0);
  const [animatedSkill, setAnimatedSkill] = useState(0);

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/access-denied");
        return false;
      }

      const { data: isAdmin } = await supabase.rpc("is_admin_user", {
        _user_id: user.id
      });

      if (!isAdmin) {
        navigate("/access-denied");
        return false;
      }

      return true;
    };

    const loadResults = async () => {
      if (!id) return;

      const hasAccess = await checkAdminAccess();
      if (!hasAccess) return;

      const { data: assessment } = await supabase
        .from("assessments")
        .select("user_name")
        .eq("id", id)
        .single();

      if (assessment) {
        setUserName(assessment.user_name);
      }

      const { data: resultData } = await supabase
        .from("assessment_results")
        .select("*")
        .eq("assessment_id", id)
        .single();

      if (resultData) {
        setResults(resultData as AssessmentResult);

        // Load verticals data
        if (resultData.vertical_matches && resultData.vertical_matches.length > 0) {
          const { data: verticalsData } = await supabase
            .from("verticals")
            .select("*")
            .in("id", resultData.vertical_matches);

          if (verticalsData) {
            setVerticals(verticalsData as Vertical[]);
          }
        }

        // Animate scores
        const willTarget = resultData.will_score;
        const skillTarget = resultData.skill_score;
        const duration = 1500;
        const steps = 60;
        const willStep = willTarget / steps;
        const skillStep = skillTarget / steps;

        let currentStep = 0;
        const interval = setInterval(() => {
          currentStep++;
          setAnimatedWill(Math.min(Math.round(willStep * currentStep), willTarget));
          setAnimatedSkill(Math.min(Math.round(skillStep * currentStep), skillTarget));

          if (currentStep >= steps) {
            clearInterval(interval);
          }
        }, duration / steps);

        // Trigger confetti for Q1 - STAR
        if (resultData.quadrant === "Q1") {
          setTimeout(() => {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#7C3AED', '#3B82F6', '#10B981'],
            });
          }, 1000);
        }
      }

      setLoading(false);
    };

    loadResults();
  }, [id]);

  const handleShare = () => {
    const url = `${window.location.origin}/results/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied! Share with your team");
  };

  const getQuadrantInfo = (quadrant: string) => {
    const quadrants: Record<string, { label: string; description: string; color: string }> = {
      Q1: {
        label: "STAR",
        description: "High WILL + High SKILL",
        color: "bg-green-500",
      },
      Q2: {
        label: "WILLING",
        description: "High WILL + Low SKILL",
        color: "bg-blue-500",
      },
      Q3: {
        label: "NOT READY",
        description: "Low WILL + Low SKILL",
        color: "bg-gray-500",
      },
      Q4: {
        label: "RELUCTANT",
        description: "High SKILL + Low WILL",
        color: "bg-yellow-500",
      },
    };
    return quadrants[quadrant] || quadrants.Q3;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-xl text-muted-foreground">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Results Not Found</h1>
          <p className="text-muted-foreground">
            Your assessment results are not ready yet or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  const quadrantInfo = getQuadrantInfo(results.quadrant);
  const recommendations = Array.isArray(results.recommendations)
    ? results.recommendations
    : [];
  const keyInsights = results.key_insights || {};

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-6 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold">
            {userName}'s Leadership Profile
          </h1>

          {/* Animated Scores */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">WILL Score</span>
                <span className="text-4xl font-bold text-primary">
                  {animatedWill}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-1000"
                  style={{ width: `${animatedWill}%` }}
                />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">SKILL Score</span>
                <span className="text-4xl font-bold text-blue-600">
                  {animatedSkill}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000"
                  style={{ width: `${animatedSkill}%` }}
                />
              </div>
            </Card>
          </div>

          {/* Quadrant Badge */}
          <div className="flex justify-center gap-3 items-center">
            <Badge
              className={`${quadrantInfo.color} text-white text-lg px-6 py-2 animate-scale-in`}
            >
              {results.quadrant} - {quadrantInfo.label}
            </Badge>
            {results.quadrant === "Q1" && (
              <Star className="w-8 h-8 text-yellow-500 animate-pulse" />
            )}
          </div>
          <p className="text-muted-foreground">{quadrantInfo.description}</p>
        </div>

        {/* Quadrant Chart */}
        <Card className="p-8 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <h2 className="text-2xl font-semibold mb-6">WILL/SKILL Matrix Position</h2>
          <div className="relative w-full aspect-square max-w-xl mx-auto">
            {/* Grid Background */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1">
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center text-xs font-medium text-muted-foreground">
                Q2: WILLING
              </div>
              <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 flex items-center justify-center text-xs font-medium">
                Q1: STAR
              </div>
              <div className="bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center text-xs font-medium text-muted-foreground">
                Q3: NOT READY
              </div>
              <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 flex items-center justify-center text-xs font-medium">
                Q4: RELUCTANT
              </div>
            </div>

            {/* Axes */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-border" />
            </div>

            {/* Labels */}
            <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-medium">
              WILL →
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-8 text-sm font-medium">
              SKILL →
            </div>

            {/* User Position Dot */}
            <div
              className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 animate-pulse"
              style={{
                left: `${results.skill_score}%`,
                bottom: `${results.will_score}%`,
              }}
            >
              <div className="w-full h-full rounded-full bg-primary ring-4 ring-primary/20" />
            </div>
          </div>
        </Card>

        {/* Role Recommendations */}
        <Card className="p-8 space-y-6 animate-fade-in" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold">Recommended Role</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="text-3xl font-bold text-primary">
                {results.recommended_role}
              </h3>
              <Badge variant="secondary">Best Match</Badge>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {results.role_explanation}
            </p>
          </div>
        </Card>

        {/* Vertical Matches */}
        {verticals.length > 0 && (
          <Card className="p-8 space-y-6 animate-fade-in" style={{ animationDelay: "400ms" }}>
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Your Vertical Matches</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {verticals.map((vertical, index) => (
                <Card
                  key={vertical.id}
                  className="p-6 hover-scale hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-lg">{vertical.name}</h4>
                      {vertical.description && (
                        <p className="text-sm text-muted-foreground">
                          {vertical.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {/* Key Insights */}
        {Object.keys(keyInsights).length > 0 && (
          <Card className="p-8 space-y-6 animate-fade-in" style={{ animationDelay: "500ms" }}>
            <div className="flex items-center gap-3">
              <Lightbulb className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Key Insights</h2>
            </div>
            <div className="space-y-4">
              {Object.entries(keyInsights).map(([key, value]) => (
                <div key={key} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium capitalize mb-1">
                      {key.replace(/_/g, " ")}
                    </h4>
                    <p className="text-muted-foreground">{String(value)}</p>
                  </div>
                </div>
              ))}
              {results.leadership_style && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium mb-1">Leadership Style</h4>
                    <p className="text-muted-foreground">{results.leadership_style}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Growth Path */}
        {recommendations.length > 0 && (
          <Card className="p-8 space-y-6 animate-fade-in" style={{ animationDelay: "600ms" }}>
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Your Growth Path</h2>
            </div>
            <div className="space-y-4">
              {recommendations.slice(0, 5).map((rec: string, index: number) => (
                <div key={index} className="flex gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-base leading-relaxed pt-1">{rec}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* AI Reasoning (Collapsible) */}
        {results.reasoning && (
          <Accordion type="single" collapsible className="animate-fade-in" style={{ animationDelay: "700ms" }}>
            <AccordionItem value="reasoning">
              <AccordionTrigger className="text-xl font-semibold">
                See AI's Full Analysis
              </AccordionTrigger>
              <AccordionContent>
                <Card className="p-6 bg-muted">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="whitespace-pre-wrap">{results.reasoning}</p>
                  </div>
                  {results.scoring_breakdown && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-semibold mb-3">Scoring Breakdown</h4>
                      <pre className="text-xs bg-background p-4 rounded overflow-auto">
                        {JSON.stringify(results.scoring_breakdown, null, 2)}
                      </pre>
                    </div>
                  )}
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Share Button */}
        <div className="flex justify-center pt-8">
          <Button
            onClick={handleShare}
            size="lg"
            variant="outline"
            className="gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share Results
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
