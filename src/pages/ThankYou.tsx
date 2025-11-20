import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ThankYou = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const assessmentId = searchParams.get("id");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!assessmentId) {
      navigate("/");
      return;
    }
    setShowSuccess(true);

    // STEP 5: Fallback check - ensure assessment is marked completed
    // This catches cases where client-side update failed
    const ensureCompleted = async () => {
      try {
        const { data: assessment } = await supabase
          .from("assessments")
          .select("status")
          .eq("id", assessmentId)
          .single();

        if (assessment && assessment.status !== "completed") {
          console.log("[ThankYou] Assessment not marked completed, updating...");
          await supabase
            .from("assessments")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", assessmentId);
          console.log("[ThankYou] Status updated to completed");
        }
      } catch (error) {
        console.error("[ThankYou] Error checking/updating status:", error);
        // Don't show error to user - they've already submitted successfully
      }
    };

    ensureCompleted();
  }, [assessmentId, navigate]);

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
          <div className="space-y-6">
            <h1 className="text-4xl font-bold animate-fade-in">
              Thank You for Completing the Assessment!
            </h1>
            
            <div className="space-y-4 text-lg">
              <p className="text-muted-foreground animate-fade-in">
                Your responses have been submitted successfully.
              </p>
              
              <p className="text-primary font-medium animate-fade-in text-xl">
                The YI Erode Chapter Leadership Team will call you to discuss further.
              </p>
              
              <p className="text-sm text-muted-foreground animate-fade-in">
                We appreciate your time and interest in joining our team.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;
