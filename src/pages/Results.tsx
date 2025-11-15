import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, TrendingUp, Lightbulb } from "lucide-react";

interface AssessmentResult {
  will_score: number;
  skill_score: number;
  quadrant: string;
  recommended_role: string;
  role_explanation: string;
  vertical_matches: string[];
  leadership_style: string;
  recommendations: Array<{ title: string; description: string }>;
  key_insights: Array<{ category: string; insight: string }>;
}

const Results = () => {
  const { id } = useParams();
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<any>(null);

  useEffect(() => {
    const loadResults = async () => {
      if (!id) return;

      const { data: assessmentData } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", id)
        .single();

      setAssessment(assessmentData);

      if (assessmentData?.status !== "completed") {
        setLoading(true);
        const checkInterval = setInterval(async () => {
          const { data: updatedAssessment } = await supabase
            .from("assessments")
            .select("*")
            .eq("id", id)
            .single();

          if (updatedAssessment?.status === "completed") {
            clearInterval(checkInterval);
            loadResultData();
          }
        }, 2000);

        setTimeout(() => {
          clearInterval(checkInterval);
          loadResultData();
        }, 30000);
      } else {
        loadResultData();
      }
    };

    const loadResultData = async () => {
      const { data: resultData } = await supabase
        .from("assessment_results")
        .select("*")
        .eq("assessment_id", id)
        .single();

      if (resultData) {
        setResult({
          will_score: resultData.will_score,
          skill_score: resultData.skill_score,
          quadrant: resultData.quadrant,
          recommended_role: resultData.recommended_role,
          role_explanation: resultData.role_explanation,
          vertical_matches: resultData.vertical_matches as string[],
          leadership_style: resultData.leadership_style || "",
          recommendations: (resultData.recommendations as any) || [],
          key_insights: (resultData.key_insights as any) || [],
        });
      }
      setLoading(false);
    };

    loadResults();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Analyzing Your Responses</h2>
          <p className="text-muted-foreground">Our AI is evaluating your assessment...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-semibold mb-2">Results Not Available</h2>
          <p className="text-muted-foreground">
            Please wait while we process your assessment
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Your EC Role Assessment</h1>
          <p className="text-lg text-muted-foreground">
            Results for {assessment?.user_name}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">WILL Score</h3>
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="text-4xl font-bold text-primary mb-2">{result.will_score}%</div>
            <p className="text-sm text-muted-foreground">Motivation & Drive</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">SKILL Score</h3>
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div className="text-4xl font-bold text-accent mb-2">{result.skill_score}%</div>
            <p className="text-sm text-muted-foreground">Capability & Experience</p>
          </Card>
        </div>

        <Card className="p-8 mb-8 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <div className="flex items-start space-x-3 mb-4">
            <Badge variant="default" className="mt-1">Recommended</Badge>
          </div>
          <h2 className="text-3xl font-bold mb-4">{result.recommended_role}</h2>
          <p className="text-lg text-muted-foreground mb-6">{result.role_explanation}</p>
          
          <div className="space-y-3">
            <h3 className="font-semibold">Best Fit Verticals:</h3>
            <div className="flex flex-wrap gap-2">
              {result.vertical_matches.map((vertical) => (
                <Badge key={vertical} variant="outline" className="text-sm">
                  {vertical}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {result.leadership_style && (
          <Card className="p-6 mb-8">
            <h3 className="font-semibold text-lg mb-3">Your Leadership Style</h3>
            <p className="text-muted-foreground">{result.leadership_style}</p>
          </Card>
        )}

        <Card className="p-6 mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Key Recommendations</h3>
          </div>
          <div className="space-y-4">
            {result.recommendations.map((rec, index) => (
              <div key={index} className="border-l-2 border-primary pl-4">
                <h4 className="font-medium mb-1">{rec.title}</h4>
                <p className="text-sm text-muted-foreground">{rec.description}</p>
              </div>
            ))}
          </div>
        </Card>

        {result.key_insights && result.key_insights.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Key Insights</h3>
            <div className="space-y-3">
              {result.key_insights.map((insight, index) => (
                <div key={index}>
                  <Badge variant="secondary" className="mb-2">{insight.category}</Badge>
                  <p className="text-sm text-muted-foreground">{insight.insight}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Results;