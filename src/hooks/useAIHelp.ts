import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QuestionResponse, AdaptedQuestion, questionDefinitions } from "./useAssessmentState";

interface UseAIHelpProps {
  assessmentId: string | undefined;
  currentQuestion: number;
  currentResponse: QuestionResponse;
  responses: Record<number, QuestionResponse>;
  adaptedQuestions: Record<number, AdaptedQuestion>;
  setCurrentResponse: (response: QuestionResponse) => void;
  setAiHelpUsedForQuestion: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}

export function useAIHelp({
  assessmentId,
  currentQuestion,
  currentResponse,
  responses,
  adaptedQuestions,
  setCurrentResponse,
  setAiHelpUsedForQuestion,
}: UseAIHelpProps) {
  const [isAiHelping, setIsAiHelping] = useState(false);

  const handleAiHelp = useCallback(async () => {
    const question = questionDefinitions[currentQuestion - 1];

    // Guard against missing Q1 when on Q2
    if (currentQuestion === 2 && !responses[1]?.partA) {
      toast.info("Please finish and save your Q1 answer before using AI Help here.");
      return;
    }

    let currentText = "";
    if (question.type === "irritation-vertical") {
      currentText = (currentResponse.partA || "") as string;
    } else if (question.type === "long-text") {
      currentText = (currentResponse.response || "") as string;
    } else if (question.type === "radio") {
      currentText = (currentResponse.leadershipStyle || "") as string;
    }

    setIsAiHelping(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-help-assessment", {
        body: {
          assessmentId,
          questionNumber: currentQuestion,
          questionTitle: question.title,
          questionType: question.type,
          currentText,
          scenario: question.type === "long-text" ? question.scenario : undefined,
          adaptedQuestionText: adaptedQuestions[currentQuestion]?.scenario,
          adaptationContext: adaptedQuestions[currentQuestion]?.contextSummary,
          previousResponses: {
            q1_part_a: responses[1]?.partA,
            q1_verticals: [responses[1]?.priority1, responses[1]?.priority2, responses[1]?.priority3].filter(Boolean),
            q2_initiative: responses[2]?.response,
          },
        },
      });

      if (error) {
        console.error("Error calling ai-help-assessment:", error);
        throw error;
      }

      if (!data || !data.suggestions || data.suggestions.length === 0) {
        throw new Error("No suggestions received");
      }

      const firstSuggestion = data.suggestions[0].content;

      // Q2-specific validation: Only enforce strict blocking for street dogs test scenario
      if (currentQuestion === 2) {
        const q1Text = (responses[1]?.partA || "") as string;
        const lowerSuggestion = firstSuggestion.toLowerCase();
        const lowerQ1 = q1Text.toLowerCase();

        const dogKeywords: string[] = [];
        if (lowerQ1.includes("street dog")) dogKeywords.push("street dog");
        if (lowerQ1.includes("stray dog")) dogKeywords.push("stray dog");
        if (lowerQ1.includes("dog bite")) dogKeywords.push("dog bite");
        if (lowerQ1.includes("dog attack")) dogKeywords.push("dog attack");
        if (lowerQ1.includes("street dogs")) dogKeywords.push("street dogs");
        if (lowerQ1.includes("stray") && lowerQ1.includes("dog")) dogKeywords.push("stray");

        const isDogScenario = dogKeywords.length > 0;
        const mentionsDogProblem = isDogScenario && dogKeywords.some((k) => lowerSuggestion.includes(k));

        if (isDogScenario && !mentionsDogProblem) {
          console.warn("Q2 AI Help failed relevance check for dog scenario. Keywords:", dogKeywords);
          toast.error("AI Help couldn't adapt to your specific problem. Please write in your own words or try again.");
          setIsAiHelping(false);
          return;
        }
      }

      if (question.type === "irritation-vertical") {
        setCurrentResponse({ ...currentResponse, partA: firstSuggestion });
      } else if (question.type === "long-text") {
        setCurrentResponse({ ...currentResponse, response: firstSuggestion });
      }

      setAiHelpUsedForQuestion((prev) => ({
        ...prev,
        [currentQuestion]: true,
      }));

      if (assessmentId) {
        try {
          await supabase.from("adaptation_analytics").upsert({
            assessment_id: assessmentId,
            question_number: currentQuestion,
            ai_help_used: true,
            ai_help_accepted: true,
            was_adapted: !!adaptedQuestions[currentQuestion],
            response_completed: false,
          });
        } catch (err) {
          console.error("Failed to track AI help analytics:", err);
        }
      }

      toast.success("Form filled with AI suggestion! Feel free to edit it.");
    } catch (error) {
      console.error("Error getting AI help:", error);
      toast.error("Failed to get AI suggestions. Please try again.");
    } finally {
      setIsAiHelping(false);
    }
  }, [assessmentId, currentQuestion, currentResponse, responses, adaptedQuestions, setCurrentResponse, setAiHelpUsedForQuestion]);

  return {
    isAiHelping,
    handleAiHelp,
  };
}
