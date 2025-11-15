import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft } from "lucide-react";

const questions = [
  {
    number: 1,
    text: "Why do you want to join the Executive Committee? What drives your interest in this leadership position?",
  },
  {
    number: 2,
    text: "Describe a time when you led a project or initiative. What was your role, and what were the outcomes?",
  },
  {
    number: 3,
    text: "What specific skills or expertise do you bring that would benefit the Executive Committee?",
  },
  {
    number: 4,
    text: "How do you handle conflict or disagreement within a team? Provide a specific example.",
  },
  {
    number: 5,
    text: "Where do you see yourself contributing most to Yi? Which areas align best with your passions and strengths?",
  },
];

const Assessment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [currentResponse, setCurrentResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadAssessment = async () => {
      if (!id) return;

      const { data: assessment } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", id)
        .single();

      if (!assessment) {
        toast.error("Assessment not found");
        navigate("/");
        return;
      }

      if (assessment.status === "completed") {
        navigate(`/results/${id}`);
        return;
      }

      setCurrentQuestion(assessment.current_question);

      const { data: savedResponses } = await supabase
        .from("assessment_responses")
        .select("*")
        .eq("assessment_id", id);

      if (savedResponses) {
        const responseMap: Record<number, string> = {};
        savedResponses.forEach((r) => {
          const data = r.response_data as { text?: string };
          responseMap[r.question_number] = data.text || "";
        });
        setResponses(responseMap);
        setCurrentResponse(responseMap[assessment.current_question] || "");
      }
    };

    loadAssessment();
  }, [id, navigate]);

  const saveResponse = async () => {
    if (!currentResponse.trim() || !id) return;

    try {
      const question = questions.find((q) => q.number === currentQuestion);
      if (!question) return;

      await supabase.from("assessment_responses").upsert({
        assessment_id: id,
        question_number: currentQuestion,
        question_text: question.text,
        response_data: { text: currentResponse },
      });

      setResponses({ ...responses, [currentQuestion]: currentResponse });
    } catch (error) {
      toast.error("Failed to save response");
    }
  };

  const handleNext = async () => {
    if (!currentResponse.trim()) {
      toast.error("Please provide a response before continuing");
      return;
    }

    await saveResponse();

    if (currentQuestion < 5) {
      const nextQuestion = currentQuestion + 1;
      setCurrentQuestion(nextQuestion);
      setCurrentResponse(responses[nextQuestion] || "");

      await supabase
        .from("assessments")
        .update({ current_question: nextQuestion })
        .eq("id", id);
    }
  };

  const handlePrevious = async () => {
    await saveResponse();
    const prevQuestion = currentQuestion - 1;
    setCurrentQuestion(prevQuestion);
    setCurrentResponse(responses[prevQuestion] || "");

    await supabase
      .from("assessments")
      .update({ current_question: prevQuestion })
      .eq("id", id);
  };

  const handleSubmit = async () => {
    if (!currentResponse.trim()) {
      toast.error("Please provide a response before submitting");
      return;
    }

    setIsSubmitting(true);
    try {
      await saveResponse();

      await supabase
        .from("assessments")
        .update({ 
          status: "completed", 
          completed_at: new Date().toISOString() 
        })
        .eq("id", id);

      const { error } = await supabase.functions.invoke("analyze-assessment", {
        body: { assessmentId: id },
      });

      if (error) throw error;

      navigate(`/results/${id}`);
    } catch (error) {
      toast.error("Failed to submit assessment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentQuestion / 5) * 100;
  const currentQ = questions[currentQuestion - 1];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Question {currentQuestion} of 5
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="p-8 shadow-lg">
          <h2 className="text-2xl font-semibold mb-6">{currentQ?.text}</h2>
          <Textarea
            placeholder="Share your thoughts here..."
            value={currentResponse}
            onChange={(e) => setCurrentResponse(e.target.value)}
            className="min-h-[200px] text-base"
          />
          
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {currentQuestion < 5 ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Assessment"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Assessment;