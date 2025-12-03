import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Vertical = {
  id: string;
  name: string;
  description: string | null;
};

export type QuestionResponse = {
  [key: string]: any;
};

export type AdaptedQuestion = {
  scenario: string;
  contextSummary: string;
};

export const questionDefinitions = [
  {
    number: 1,
    title: "Personal Irritation → Vertical Selection",
    type: "irritation-vertical",
    partAInstructions: "What problem in Erode bothers you the most? Tell us about the moment when you thought 'I need to fix this'.",
    partAPlaceholder: "Share the problem that drives you...",
    partAMinChars: 100,
    partAMaxChars: 800,
    partBInstructions: "Based on your answer, here are Yi Erode areas that match your concern. Pick your top 3 (put them in order):",
  },
  {
    number: 2,
    title: "Initiative Design",
    type: "long-text",
    scenario: "Yi Erode gives you 6 months and ₹50,000 to fix the problem from Q1. What would you do? Who would help you? How would you reach 10,000+ people? What change would you make?",
    placeholder: "Describe your initiative design...",
    minChars: 100,
    maxChars: 1000,
  },
  {
    number: 3,
    title: "Saturday Emergency Response",
    type: "long-text",
    scenario: "It's Saturday, 6 PM. You're with family. Your team leader calls: 'We need help right now for tomorrow's big event. Can you come for 3-4 hours?' What would you say?",
    placeholder: "Describe exactly what you'd say and do...",
    minChars: 10,
    maxChars: 500,
  },
  {
    number: 4,
    title: "Your 2026 Yi Erode Goal",
    type: "long-text",
    scenario: "What do you want to do in Yi Erode 2026 that would make you really proud? What is your big goal? What change do you want to make? What problems might you face? How will you know you succeeded?",
    placeholder: "Describe your 2026 aspiration...",
    minChars: 100,
    maxChars: 400,
  },
  {
    number: 5,
    title: "Team Deadline Scenario",
    type: "radio",
    scenario: "Your team misses an important deadline. What do you do first?",
    options: [
      { value: "leader", label: "Lead: Bring the team together, make a new plan, take charge" },
      { value: "doer", label: "Do: Do the work myself to finish it" },
      { value: "learning", label: "Learn: Find out what went wrong, write it down" },
      { value: "strategic", label: "Support: Check if the team is okay, fix the real problem" },
    ],
  },
];

export function useAssessmentState(assessmentId: string | undefined) {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [responses, setResponses] = useState<Record<number, QuestionResponse>>({});
  const [currentResponse, setCurrentResponse] = useState<QuestionResponse>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [validationError, setValidationError] = useState("");
  const [expandedDescriptions, setExpandedDescriptions] = useState<{
    priority1: boolean;
    priority2: boolean;
    priority3: boolean;
  }>({ priority1: false, priority2: false, priority3: false });

  // Q1-specific states
  const [suggestedVerticals, setSuggestedVerticals] = useState<string[]>([]);
  const [isAnalyzingQ1, setIsAnalyzingQ1] = useState(false);
  const [hasAnalyzedQ1, setHasAnalyzedQ1] = useState(false);

  // Adaptive questions state
  const [adaptedQuestions, setAdaptedQuestions] = useState<Record<number, AdaptedQuestion>>({});
  const [isAdaptingQuestion, setIsAdaptingQuestion] = useState(false);

  // Analytics tracking state
  const [questionStartTime, setQuestionStartTime] = useState<Record<number, number>>({});
  const [aiHelpUsedForQuestion, setAiHelpUsedForQuestion] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const loadAssessment = async () => {
      if (!assessmentId) return;

      const { data: assessment } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", assessmentId)
        .single();

      if (!assessment) {
        toast.error("Assessment not found");
        navigate("/");
        return;
      }

      if (assessment.status === "completed") {
        toast.info("You have already completed this assessment");
        navigate("/");
        return;
      }

      setCurrentQuestion(assessment.current_question);

      const { data: savedResponses } = await supabase
        .from("assessment_responses")
        .select("*")
        .eq("assessment_id", assessmentId);

      if (savedResponses) {
        const responseMap: Record<number, QuestionResponse> = {};
        savedResponses.forEach((r) => {
          responseMap[r.question_number] = r.response_data as QuestionResponse;
        });
        setResponses(responseMap);
        setCurrentResponse(responseMap[assessment.current_question] || {});

        if (assessment.current_question === 1 && responseMap[1]) {
          const q1Response = responseMap[1];
          if (q1Response.hasAnalyzed) {
            setHasAnalyzedQ1(true);
            if (q1Response.suggestedVerticals) {
              setSuggestedVerticals(q1Response.suggestedVerticals);
            }
          }
        }
      }
    };

    const loadVerticals = async () => {
      const { data } = await supabase
        .from("verticals")
        .select("id, name, description")
        .eq("is_active", true)
        .order("display_order");
      if (data) setVerticals(data);
    };

    loadAssessment();
    loadVerticals();
  }, [assessmentId, navigate]);

  useEffect(() => {
    if (currentQuestion === 1 && responses[1]) {
      const q1Response = responses[1];
      if (q1Response.hasAnalyzed) {
        setHasAnalyzedQ1(true);
        if (q1Response.suggestedVerticals) {
          setSuggestedVerticals(q1Response.suggestedVerticals);
        }
      }
    } else if (currentQuestion !== 1) {
      setHasAnalyzedQ1(false);
      setSuggestedVerticals([]);
    }

    if (!questionStartTime[currentQuestion]) {
      setQuestionStartTime((prev) => ({
        ...prev,
        [currentQuestion]: Date.now(),
      }));
    }
  }, [currentQuestion, responses]);

  const validateCurrentQuestion = useCallback((): boolean => {
    setValidationError("");
    const question = questionDefinitions[currentQuestion - 1];

    if (question.type === "irritation-vertical") {
      const partAText = (currentResponse.partA || "") as string;
      if (!partAText || partAText.length < 200) {
        setValidationError("Part A requires at least 200 characters");
        return false;
      }
      if (!hasAnalyzedQ1) {
        setValidationError("Please click 'Analyze & Suggest Verticals' to proceed");
        return false;
      }
      if (!currentResponse.priority1 || !currentResponse.priority2 || !currentResponse.priority3) {
        setValidationError("Please rank your top 3 vertical priorities");
        return false;
      }
    } else if (question.type === "long-text") {
      const text = (currentResponse.response || "") as string;
      if (text.length < (question.minChars || 0)) {
        setValidationError(`Please write at least ${question.minChars} characters`);
        return false;
      }
    } else if (question.type === "radio") {
      if (!currentResponse.leadershipStyle) {
        setValidationError("Please select an option");
        return false;
      }
    }

    return true;
  }, [currentQuestion, currentResponse, hasAnalyzedQ1]);

  const saveResponse = useCallback(async () => {
    if (!assessmentId) return;

    try {
      const question = questionDefinitions.find((q) => q.number === currentQuestion);
      if (!question) return;

      const adaptedData = adaptedQuestions[currentQuestion];

      const responseText =
        question.type === "irritation-vertical"
          ? ((currentResponse.partA as string) || "")
          : question.type === "long-text"
          ? ((currentResponse.response as string) || "")
          : ((currentResponse.leadershipStyle as string) || "");

      const responseLength = responseText.length;
      const startTime = questionStartTime[currentQuestion];
      const timeToComplete = startTime ? Math.floor((Date.now() - startTime) / 1000) : null;

      await supabase.from("assessment_responses").upsert({
        assessment_id: assessmentId,
        question_number: currentQuestion,
        question_text: question.title,
        response_data: currentResponse,
        adapted_question_text: adaptedData?.scenario || null,
        adaptation_context: adaptedData
          ? {
              contextSummary: adaptedData.contextSummary,
              wasAdapted: true,
              adaptedAt: new Date().toISOString(),
            }
          : null,
      });

      await supabase.from("adaptation_analytics").upsert({
        assessment_id: assessmentId,
        question_number: currentQuestion,
        was_adapted: !!adaptedData,
        ai_help_used: aiHelpUsedForQuestion[currentQuestion] || false,
        response_completed: true,
        response_length: responseLength,
        time_to_complete_seconds: timeToComplete,
        adaptation_context: adaptedData ? { contextSummary: adaptedData.contextSummary } : null,
      });

      setResponses((prev) => ({ ...prev, [currentQuestion]: currentResponse }));
    } catch (error) {
      console.error("Failed to save response:", error);
      toast.error("Failed to save response");
    }
  }, [assessmentId, currentQuestion, currentResponse, adaptedQuestions, questionStartTime, aiHelpUsedForQuestion]);

  const adaptQuestion = useCallback(
    async (questionNumber: number) => {
      if ((questionNumber !== 2 && questionNumber !== 3 && questionNumber !== 4 && questionNumber !== 5) || adaptedQuestions[questionNumber]) {
        return;
      }

      setIsAdaptingQuestion(true);
      const adaptationStartTime = Date.now();
      let adaptationSuccess = false;
      let fallbackUsed = false;

      try {
        const q1Response = responses[1];
        const q2Response = responses[2];

        if (questionNumber === 2) {
          if (!q1Response || !q1Response.partA) {
            fallbackUsed = true;
            return;
          }

          const selectedVerticalIds = [q1Response.priority1, q1Response.priority2, q1Response.priority3].filter(Boolean);
          const selectedVerticalNames = verticals.filter((v) => selectedVerticalIds.includes(v.id)).map((v) => v.name);

          const { data, error } = await supabase.functions.invoke("generate-adaptive-question", {
            body: {
              questionNumber: 2,
              previousResponses: { q1_part_a: q1Response.partA, q1_verticals: selectedVerticalNames },
            },
          });

          if (error) throw error;
          if (data && data.success) {
            setAdaptedQuestions((prev) => ({
              ...prev,
              [questionNumber]: { scenario: data.adaptedScenario, contextSummary: data.contextSummary },
            }));
            toast.success("Question personalized based on your Q1 response");
            adaptationSuccess = true;
          }
        }

        if (questionNumber === 3) {
          if (!q1Response || !q1Response.partA || !q2Response || !q2Response.response) {
            fallbackUsed = true;
            return;
          }

          const selectedVerticalIds = [q1Response.priority1, q1Response.priority2, q1Response.priority3].filter(Boolean);
          const selectedVerticalNames = verticals.filter((v) => selectedVerticalIds.includes(v.id)).map((v) => v.name);

          const { data, error } = await supabase.functions.invoke("generate-adaptive-question", {
            body: {
              questionNumber: 3,
              previousResponses: { q1_part_a: q1Response.partA, q1_verticals: selectedVerticalNames, q2_initiative: q2Response.response },
            },
          });

          if (error) throw error;
          if (data && data.success) {
            setAdaptedQuestions((prev) => ({
              ...prev,
              [questionNumber]: { scenario: data.adaptedScenario, contextSummary: data.contextSummary },
            }));
            toast.success("Question personalized based on your initiative design");
            adaptationSuccess = true;
          }
        }

        if (questionNumber === 4) {
          if (!q1Response || !q1Response.partA || !q2Response || !q2Response.response) {
            fallbackUsed = true;
            return;
          }

          const selectedVerticalIds = [q1Response.priority1, q1Response.priority2, q1Response.priority3].filter(Boolean);
          const selectedVerticalNames = verticals.filter((v) => selectedVerticalIds.includes(v.id)).map((v) => v.name);

          const { data, error } = await supabase.functions.invoke("generate-adaptive-question", {
            body: {
              questionNumber: 4,
              previousResponses: { q1_part_a: q1Response.partA, q1_verticals: selectedVerticalNames, q2_initiative: q2Response.response },
            },
          });

          if (error) throw error;
          if (data && data.success) {
            setAdaptedQuestions((prev) => ({
              ...prev,
              [questionNumber]: { scenario: data.adaptedScenario, contextSummary: data.contextSummary },
            }));
            toast.success("Question personalized to focus on relevant skills");
            adaptationSuccess = true;
          }
        }

        if (questionNumber === 5) {
          if (!q2Response || !q2Response.response) {
            fallbackUsed = true;
            return;
          }

          const { data, error } = await supabase.functions.invoke("generate-adaptive-question", {
            body: { questionNumber: 5, previousResponses: { q2_initiative: q2Response.response } },
          });

          if (error) throw error;
          if (data && data.success) {
            setAdaptedQuestions((prev) => ({
              ...prev,
              [questionNumber]: { scenario: data.adaptedScenario, contextSummary: data.contextSummary },
            }));
            toast.success("Leadership scenario personalized to your initiative");
            adaptationSuccess = true;
          }
        }
      } catch (error) {
        console.error("Failed to adapt question:", error);
        fallbackUsed = true;
      } finally {
        setIsAdaptingQuestion(false);

        if (assessmentId) {
          const adaptationTimeMs = Date.now() - adaptationStartTime;
          try {
            await supabase.from("adaptation_analytics").upsert({
              assessment_id: assessmentId,
              question_number: questionNumber,
              was_adapted: adaptationSuccess,
              adaptation_success: adaptationSuccess,
              fallback_used: fallbackUsed,
              adaptation_time_ms: adaptationTimeMs,
              response_completed: false,
            });
          } catch (err) {
            console.error("Failed to track adaptation analytics:", err);
          }
        }
      }
    },
    [assessmentId, responses, verticals, adaptedQuestions]
  );

  const handleNext = useCallback(async () => {
    if (!validateCurrentQuestion()) return;

    await saveResponse();

    if (currentQuestion < 5) {
      const nextQuestion = currentQuestion + 1;

      if (nextQuestion === 2 || nextQuestion === 3 || nextQuestion === 4 || nextQuestion === 5) {
        await adaptQuestion(nextQuestion);
      }

      setCurrentQuestion(nextQuestion);
      setCurrentResponse(responses[nextQuestion] || {});
      setValidationError("");

      await supabase.from("assessments").update({ current_question: nextQuestion }).eq("id", assessmentId);
    }
  }, [validateCurrentQuestion, saveResponse, currentQuestion, adaptQuestion, responses, assessmentId]);

  const handlePrevious = useCallback(async () => {
    await saveResponse();
    const prevQuestion = currentQuestion - 1;
    setCurrentQuestion(prevQuestion);
    setCurrentResponse(responses[prevQuestion] || {});
    setValidationError("");

    await supabase.from("assessments").update({ current_question: prevQuestion }).eq("id", assessmentId);
  }, [saveResponse, currentQuestion, responses, assessmentId]);

  const handleSubmit = useCallback(async () => {
    if (!validateCurrentQuestion()) return;

    setIsSubmitting(true);
    try {
      await saveResponse();

      console.log("[Assessment Submit] Updating status for assessment:", assessmentId);

      const { error: statusUpdateError } = await supabase
        .from("assessments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", assessmentId);

      if (statusUpdateError) {
        console.error("[Assessment Submit] Status update failed:", statusUpdateError);
        toast.error("Failed to complete assessment. Please try again.");

        supabase.from("adaptation_analytics").insert({
          assessment_id: assessmentId,
          question_number: 0,
          was_adapted: false,
          adaptation_success: false,
          fallback_used: true,
          adaptation_context: { error: statusUpdateError.message, stage: "client_status_update" },
        });

        return;
      }

      console.log("[Assessment Submit] Status update succeeded");

      supabase.functions
        .invoke("analyze-assessment", { body: { assessmentId } })
        .then(({ data, error }) => {
          if (error) {
            console.error("[Assessment Submit] analyze-assessment failed:", error);
            supabase.from("adaptation_analytics").insert({
              assessment_id: assessmentId,
              question_number: 0,
              was_adapted: false,
              adaptation_success: false,
              fallback_used: true,
              adaptation_context: { error: error.message, stage: "initial_analysis" },
            });
          } else {
            console.log("[Assessment Submit] analyze-assessment succeeded:", data);
          }
        })
        .catch((err) => {
          console.error("[Assessment Submit] analyze-assessment exception:", err);
        });

      navigate(`/thank-you?id=${assessmentId}`);
    } catch (error) {
      console.error("[Assessment Submit] Error during submission:", error);
      toast.error("Failed to submit assessment");
    } finally {
      setIsSubmitting(false);
    }
  }, [validateCurrentQuestion, saveResponse, assessmentId, navigate]);

  const handleAnalyzeQ1 = useCallback(async () => {
    const partAText = (currentResponse.partA || "") as string;

    if (!partAText || partAText.length < 200) {
      toast.error("Please write at least 200 characters before analyzing");
      return;
    }

    setIsAnalyzingQ1(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-verticals", {
        body: { problemDescription: partAText },
      });

      if (error) {
        console.error("Error calling suggest-verticals:", error);
        throw error;
      }

      if (!data || !data.suggestedVerticals || data.suggestedVerticals.length === 0) {
        throw new Error("No verticals suggested");
      }

      const suggested = data.suggestedVerticals;
      setSuggestedVerticals(suggested);
      setHasAnalyzedQ1(true);
      setCurrentResponse({ ...currentResponse, hasAnalyzed: true, suggestedVerticals: suggested });

      if (data.verticalNames && data.verticalNames.length > 0) {
        toast.success(`Suggested: ${data.verticalNames.slice(0, 3).join(", ")}${data.verticalNames.length > 3 ? ", ..." : ""}`);
      } else {
        toast.success("Verticals analyzed and suggested!");
      }

      if (data.fallback) {
        console.warn("Using fallback vertical suggestions:", data.message);
      }
    } catch (error) {
      console.error("Error analyzing Q1:", error);
      toast.error("Failed to analyze. Please try again.");

      if (verticals.length > 0) {
        const fallbackSuggested = verticals.slice(0, Math.min(5, verticals.length)).map((v) => v.id);
        setSuggestedVerticals(fallbackSuggested);
        setHasAnalyzedQ1(true);
        setCurrentResponse({ ...currentResponse, hasAnalyzed: true, suggestedVerticals: fallbackSuggested });
        toast.info("Using default suggestions. You can still select from all verticals.");
      }
    } finally {
      setIsAnalyzingQ1(false);
    }
  }, [currentResponse, verticals]);

  return {
    currentQuestion,
    currentResponse,
    setCurrentResponse,
    responses,
    verticals,
    validationError,
    isSubmitting,
    isAdaptingQuestion,
    adaptedQuestions,
    hasAnalyzedQ1,
    suggestedVerticals,
    isAnalyzingQ1,
    expandedDescriptions,
    setExpandedDescriptions,
    aiHelpUsedForQuestion,
    setAiHelpUsedForQuestion,
    validateCurrentQuestion,
    handleNext,
    handlePrevious,
    handleSubmit,
    handleAnalyzeQ1,
  };
}
