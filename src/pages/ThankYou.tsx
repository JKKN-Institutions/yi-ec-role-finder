import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { CheckCircle2 } from "lucide-react";

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
