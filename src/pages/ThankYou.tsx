import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

const ThankYou = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const assessmentId = searchParams.get("id");
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setShowSuccess(true);
  }, []);

  useEffect(() => {
    if (!assessmentId) {
      navigate("/");
      return;
    }

    const checkAnalysisStatus = async () => {
      const { data: assessment } = await supabase
        .from("assessments")
        .select("status")
        .eq("id", assessmentId)
        .single();

      if (assessment?.status === "completed") {
        // Check if results exist
        const { data: results } = await supabase
          .from("assessment_results")
          .select("id")
          .eq("assessment_id", assessmentId)
          .single();

        if (results) {
          setIsAnalyzing(false);
        }
      }
    };

    // Initial check
    checkAnalysisStatus();

    // Poll every 3 seconds
    const interval = setInterval(checkAnalysisStatus, 3000);

    return () => clearInterval(interval);
  }, [assessmentId, navigate]);

  const handleViewResults = () => {
    navigate(`/results/${assessmentId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="text-center space-y-8">
          {/* Success Checkmark with Animation */}
          <div
            className={`mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-500 ${
              showSuccess ? "scale-100 opacity-100" : "scale-0 opacity-0"
            }`}
          >
            <CheckCircle2 className="w-16 h-16 text-primary animate-in zoom-in duration-300 delay-300" />
          </div>

          {/* Success Message */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold animate-fade-in">
              Assessment Submitted Successfully!
            </h1>
            
            {isAnalyzing ? (
              <>
                <p className="text-lg text-muted-foreground animate-fade-in">
                  We're analyzing your responses using AI. This takes about 30
                  seconds...
                </p>

                {/* Animated Loading Indicator */}
                <div className="flex justify-center items-center gap-2 py-8">
                  <div className="flex gap-2">
                    <div
                      className="w-3 h-3 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-3 h-3 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-3 h-3 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing your leadership profile...</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-lg text-primary font-medium animate-fade-in">
                  Analysis complete! Your results are ready.
                </p>

                <Button
                  onClick={handleViewResults}
                  size="lg"
                  className="mt-8 animate-scale-in"
                >
                  View Your Results
                </Button>
              </>
            )}
          </div>

          {/* Progress Indicator */}
          <div className="pt-12">
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={`h-full bg-primary transition-all duration-1000 ${
                  isAnalyzing ? "w-3/4 animate-pulse" : "w-full"
                }`}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isAnalyzing ? "Processing..." : "Complete!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;
