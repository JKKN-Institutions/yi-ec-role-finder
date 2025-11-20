import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Loader2, Info, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Vertical = {
  id: string;
  name: string;
  description: string | null;
};

type QuestionResponse = {
  [key: string]: any;
};

const questionDefinitions = [
  {
    number: 1,
    title: "Personal Irritation → Vertical Selection",
    type: "irritation-vertical",
    partAInstructions: "Describe a problem in Erode/your community that IRRITATES you so much you can't ignore it. What specific moment made you feel 'I have to do something about this'?",
    partAPlaceholder: "Share the problem that drives you...",
    partAMinChars: 100,
    partAMaxChars: 800,
    partBInstructions: "Based on what you described, these Yi Erode verticals might align with your concern. Select your top 3 priorities (rank them):",
  },
  {
    number: 2,
    title: "Initiative Design",
    type: "long-text",
    scenario: "Let's say Yi Erode gives you 6 months and ₹50,000 to work on the problem you described in Q1. Design your initiative - what would you do, who would you work with, how would you reach 10,000+ people, and what specific change would you create?",
    placeholder: "Describe your initiative design...",
    minChars: 100,
    maxChars: 1000,
  },
  {
    number: 3,
    title: "Saturday Emergency Response",
    type: "long-text",
    scenario: "It's Saturday, 6 PM. You're relaxing with family when your vertical head calls: 'We need urgent help preparing for tomorrow's major event. Can you come to the office now for 3-4 hours?' What's your honest response?",
    placeholder: "Describe exactly what you'd say and do...",
    minChars: 50,
    maxChars: 500,
  },
  {
    number: 4,
    title: "Your Most Significant Achievement",
    type: "long-text",
    scenario: "Describe your most significant achievement in the last 2 years - something you're genuinely proud of (can be academic, personal, volunteer, or professional). What did you do, what obstacles did you face, and what was the outcome?",
    placeholder: "Share your achievement story...",
    minChars: 100,
    maxChars: 400,
  },
  {
    number: 5,
    title: "Team Deadline Scenario",
    type: "radio",
    scenario: "Your team misses a critical deadline. What's your first instinct?",
    options: [
      {
        value: "leader",
        label: "Lead: Rally the team, create recovery plan, own the outcome",
      },
      {
        value: "doer",
        label: "Do: Jump in personally, complete the work myself",
      },
      {
        value: "learning",
        label: "Learn: Analyze what went wrong, document for future",
      },
      {
        value: "strategic",
        label: "Strategize: Assess impact, prioritize next steps",
      },
    ],
  },
];

const Assessment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [responses, setResponses] = useState<Record<number, QuestionResponse>>(
    {}
  );
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
  
  // AI Help state
  const [isAiHelping, setIsAiHelping] = useState(false);
  
  // Adaptive questions state
  const [adaptedQuestions, setAdaptedQuestions] = useState<{
    [key: number]: {
      scenario: string;
      contextSummary: string;
    };
  }>({});
  const [isAdaptingQuestion, setIsAdaptingQuestion] = useState(false);
  
  // Analytics tracking state
  const [questionStartTime, setQuestionStartTime] = useState<{ [key: number]: number }>({});
  const [aiHelpUsedForQuestion, setAiHelpUsedForQuestion] = useState<{ [key: number]: boolean }>({});

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
        toast.info("You have already completed this assessment");
        navigate("/");
        return;
      }

      setCurrentQuestion(assessment.current_question);

      const { data: savedResponses } = await supabase
        .from("assessment_responses")
        .select("*")
        .eq("assessment_id", id);

      if (savedResponses) {
        const responseMap: Record<number, QuestionResponse> = {};
        savedResponses.forEach((r) => {
          responseMap[r.question_number] = r.response_data as QuestionResponse;
        });
        setResponses(responseMap);
        setCurrentResponse(
          responseMap[assessment.current_question] || {}
        );
        
        // Restore Q1 state if on question 1
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
  }, [id, navigate]);

  // Restore Q1 state when navigating between questions
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
      // Reset Q1 state when leaving question 1
      setHasAnalyzedQ1(false);
      setSuggestedVerticals([]);
    }
    
    // Track question start time for analytics
    if (!questionStartTime[currentQuestion]) {
      setQuestionStartTime(prev => ({
        ...prev,
        [currentQuestion]: Date.now()
      }));
    }
  }, [currentQuestion, responses]);

  const validateCurrentQuestion = (): boolean => {
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
  };

  const saveResponse = async () => {
    if (!id) return;

    try {
      const question = questionDefinitions.find(
        (q) => q.number === currentQuestion
      );
      if (!question) return;

      // Get adapted question data if available
      const adaptedData = adaptedQuestions[currentQuestion];
      
      // Calculate response metrics
      const responseText = question.type === 'irritation-vertical' 
        ? (currentResponse.partA as string || '')
        : question.type === 'long-text'
        ? (currentResponse.response as string || '')
        : (currentResponse.leadershipStyle as string || '');
      
      const responseLength = responseText.length;
      const startTime = questionStartTime[currentQuestion];
      const timeToComplete = startTime ? Math.floor((Date.now() - startTime) / 1000) : null;
      
      await supabase.from("assessment_responses").upsert({
        assessment_id: id,
        question_number: currentQuestion,
        question_text: question.title,
        response_data: currentResponse,
        adapted_question_text: adaptedData?.scenario || null,
        adaptation_context: adaptedData ? {
          contextSummary: adaptedData.contextSummary,
          wasAdapted: true,
          adaptedAt: new Date().toISOString()
        } : null,
      });
      
      // Track analytics for this question
      await supabase.from("adaptation_analytics").upsert({
        assessment_id: id,
        question_number: currentQuestion,
        was_adapted: !!adaptedData,
        ai_help_used: aiHelpUsedForQuestion[currentQuestion] || false,
        response_completed: true,
        response_length: responseLength,
        time_to_complete_seconds: timeToComplete,
        adaptation_context: adaptedData ? {
          contextSummary: adaptedData.contextSummary,
        } : null,
      });

      setResponses({ ...responses, [currentQuestion]: currentResponse });
    } catch (error) {
      console.error('Failed to save response:', error);
      toast.error("Failed to save response");
    }
  };

  const adaptQuestion = async (questionNumber: number) => {
    // Only adapt Q2, Q3, Q4, and Q5
    if ((questionNumber !== 2 && questionNumber !== 3 && questionNumber !== 4 && questionNumber !== 5) || adaptedQuestions[questionNumber]) {
      return; // Skip if not Q2/Q3/Q4/Q5 or already adapted
    }

    setIsAdaptingQuestion(true);
    try {
      const q1Response = responses[1];
      const q2Response = responses[2];
      
      // Q2 adaptation
      if (questionNumber === 2) {
        if (!q1Response || !q1Response.partA) {
          console.log('Q1 responses not available, using default Q2');
          return;
        }

        const selectedVerticalIds = [
          q1Response.priority1,
          q1Response.priority2,
          q1Response.priority3,
        ].filter(Boolean);
        
        const selectedVerticalNames = verticals
          .filter(v => selectedVerticalIds.includes(v.id))
          .map(v => v.name);

        const { data, error } = await supabase.functions.invoke('generate-adaptive-question', {
          body: {
            questionNumber: 2,
            previousResponses: {
              q1_part_a: q1Response.partA,
              q1_verticals: selectedVerticalNames,
            }
          }
        });

        if (error) throw error;

        if (data && data.success) {
          setAdaptedQuestions(prev => ({
            ...prev,
            [questionNumber]: {
              scenario: data.adaptedScenario,
              contextSummary: data.contextSummary,
            }
          }));
          toast.success('Question personalized based on your Q1 response');
        }
      }
      
      // Q3 adaptation
      if (questionNumber === 3) {
        if (!q1Response || !q1Response.partA || !q2Response || !q2Response.response) {
          console.log('Q1/Q2 responses not available, using default Q3');
          return;
        }

        const selectedVerticalIds = [
          q1Response.priority1,
          q1Response.priority2,
          q1Response.priority3,
        ].filter(Boolean);
        
        const selectedVerticalNames = verticals
          .filter(v => selectedVerticalIds.includes(v.id))
          .map(v => v.name);

        const { data, error } = await supabase.functions.invoke('generate-adaptive-question', {
          body: {
            questionNumber: 3,
            previousResponses: {
              q1_part_a: q1Response.partA,
              q1_verticals: selectedVerticalNames,
              q2_initiative: q2Response.response,
            }
          }
        });

        if (error) throw error;

        if (data && data.success) {
          setAdaptedQuestions(prev => ({
            ...prev,
            [questionNumber]: {
              scenario: data.adaptedScenario,
              contextSummary: data.contextSummary,
            }
          }));
          toast.success('Question personalized based on your initiative design');
        }
      }
      
      // Q4 adaptation
      if (questionNumber === 4) {
        if (!q1Response || !q1Response.partA || !q2Response || !q2Response.response) {
          console.log('Q1/Q2 responses not available, using default Q4');
          return;
        }

        const selectedVerticalIds = [
          q1Response.priority1,
          q1Response.priority2,
          q1Response.priority3,
        ].filter(Boolean);
        
        const selectedVerticalNames = verticals
          .filter(v => selectedVerticalIds.includes(v.id))
          .map(v => v.name);

        const { data, error } = await supabase.functions.invoke('generate-adaptive-question', {
          body: {
            questionNumber: 4,
            previousResponses: {
              q1_part_a: q1Response.partA,
              q1_verticals: selectedVerticalNames,
              q2_initiative: q2Response.response,
            }
          }
        });

        if (error) throw error;

        if (data && data.success) {
          setAdaptedQuestions(prev => ({
            ...prev,
            [questionNumber]: {
              scenario: data.adaptedScenario,
              contextSummary: data.contextSummary,
            }
          }));
          toast.success('Question personalized to focus on relevant skills');
        }
      }
      
      // Q5 adaptation
      if (questionNumber === 5) {
        if (!q2Response || !q2Response.response) {
          console.log('Q2 response not available, using default Q5');
          return;
        }

        const { data, error } = await supabase.functions.invoke('generate-adaptive-question', {
          body: {
            questionNumber: 5,
            previousResponses: {
              q2_initiative: q2Response.response,
            }
          }
        });

        if (error) throw error;

        if (data && data.success) {
          setAdaptedQuestions(prev => ({
            ...prev,
            [questionNumber]: {
              scenario: data.adaptedScenario,
              contextSummary: data.contextSummary,
            }
          }));
          toast.success('Leadership scenario personalized to your initiative');
        }
      }
    } catch (error) {
      console.error('Failed to adapt question:', error);
      // Silently fall back to default question
    } finally {
      setIsAdaptingQuestion(false);
    }
  };

  const handleNext = async () => {
    if (!validateCurrentQuestion()) return;

    await saveResponse();

    if (currentQuestion < 5) {
      const nextQuestion = currentQuestion + 1;
      
      // Adapt the next question before showing it (Q2, Q3, Q4, Q5)
      if (nextQuestion === 2 || nextQuestion === 3 || nextQuestion === 4 || nextQuestion === 5) {
        await adaptQuestion(nextQuestion);
      }
      
      setCurrentQuestion(nextQuestion);
      setCurrentResponse(responses[nextQuestion] || {});
      setValidationError("");

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
    setCurrentResponse(responses[prevQuestion] || {});
    setValidationError("");

    await supabase
      .from("assessments")
      .update({ current_question: prevQuestion })
      .eq("id", id);
  };

  const handleSubmit = async () => {
    if (!validateCurrentQuestion()) return;

    setIsSubmitting(true);
    try {
      await saveResponse();

      await supabase
        .from("assessments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", id);

      // Trigger analysis in background (don't wait)
      supabase.functions.invoke("analyze-assessment", {
        body: { assessmentId: id },
      });

      // Navigate to thank you page immediately
      navigate(`/thank-you?id=${id}`);
    } catch (error) {
      toast.error("Failed to submit assessment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyzeQ1 = async () => {
    const partAText = (currentResponse.partA || "") as string;
    
    if (!partAText || partAText.length < 200) {
      toast.error("Please write at least 200 characters before analyzing");
      return;
    }

    setIsAnalyzingQ1(true);
    try {
      // Call edge function to suggest verticals based on text
      const { data, error } = await supabase.functions.invoke('suggest-verticals', {
        body: { problemDescription: partAText }
      });

      if (error) {
        console.error('Error calling suggest-verticals:', error);
        throw error;
      }

      if (!data || !data.suggestedVerticals || data.suggestedVerticals.length === 0) {
        throw new Error('No verticals suggested');
      }

      const suggested = data.suggestedVerticals;
      setSuggestedVerticals(suggested);
      setHasAnalyzedQ1(true);
      setCurrentResponse({ 
        ...currentResponse, 
        hasAnalyzed: true, 
        suggestedVerticals: suggested 
      });

      // Show success message with vertical names if available
      if (data.verticalNames && data.verticalNames.length > 0) {
        toast.success(`Suggested: ${data.verticalNames.slice(0, 3).join(', ')}${data.verticalNames.length > 3 ? ', ...' : ''}`);
      } else {
        toast.success("Verticals analyzed and suggested!");
      }

      // Log fallback notice if applicable
      if (data.fallback) {
        console.warn('Using fallback vertical suggestions:', data.message);
      }

    } catch (error) {
      console.error("Error analyzing Q1:", error);
      toast.error("Failed to analyze. Please try again.");
      
      // Fallback: suggest first 5 verticals on error
      if (verticals.length > 0) {
        const fallbackSuggested = verticals.slice(0, Math.min(5, verticals.length)).map(v => v.id);
        setSuggestedVerticals(fallbackSuggested);
        setHasAnalyzedQ1(true);
        setCurrentResponse({ 
          ...currentResponse, 
          hasAnalyzed: true, 
          suggestedVerticals: fallbackSuggested 
        });
        toast.info("Using default suggestions. You can still select from all verticals.");
      }
    } finally {
      setIsAnalyzingQ1(false);
    }
  };

  const handleAiHelp = async () => {
    const question = questionDefinitions[currentQuestion - 1];
    
    let currentText = '';
    if (question.type === 'irritation-vertical') {
      currentText = (currentResponse.partA || '') as string;
    } else if (question.type === 'long-text') {
      currentText = (currentResponse.response || '') as string;
    } else if (question.type === 'radio') {
      currentText = (currentResponse.leadershipStyle || '') as string;
    }

    setIsAiHelping(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-help-assessment', {
        body: {
          questionNumber: currentQuestion,
          questionTitle: question.title,
          questionType: question.type,
          currentText,
          scenario: question.type === 'long-text' ? question.scenario : undefined,
          adaptedQuestionText: adaptedQuestions[currentQuestion]?.scenario,
          adaptationContext: adaptedQuestions[currentQuestion]?.contextSummary,
          previousResponses: {
            q1_part_a: responses[1]?.partA,
            q1_verticals: responses[1]?.verticals,
            q2_initiative: responses[2]?.response,
          }
        }
      });

      if (error) {
        console.error('Error calling ai-help-assessment:', error);
        throw error;
      }

      if (!data || !data.suggestions || data.suggestions.length === 0) {
        throw new Error('No suggestions received');
      }

      // Automatically fill with the first suggestion
      const firstSuggestion = data.suggestions[0].content;
      
      if (question.type === 'irritation-vertical') {
        setCurrentResponse({ ...currentResponse, partA: firstSuggestion });
      } else if (question.type === 'long-text') {
        setCurrentResponse({ ...currentResponse, response: firstSuggestion });
      }
      
      toast.success('Form filled with AI suggestion! Feel free to edit it.');

    } catch (error) {
      console.error('Error getting AI help:', error);
      toast.error('Failed to get AI suggestions. Please try again.');
    } finally {
      setIsAiHelping(false);
    }
  };

  const renderQuestion = () => {
    const question = questionDefinitions[currentQuestion - 1];

    const DescriptionBox = ({ 
      description, 
      priorityKey 
    }: { 
      description: string | null | undefined; 
      priorityKey: 'priority1' | 'priority2' | 'priority3' 
    }) => {
      if (!description) return null;
      
      const isExpanded = expandedDescriptions[priorityKey];

      return (
        <div className="mt-3 p-3 bg-muted/50 rounded-md border border-border">
          <p className={`text-sm text-muted-foreground leading-relaxed ${!isExpanded ? 'line-clamp-1' : ''}`}>
            {description}
          </p>
          <button
            onClick={() => setExpandedDescriptions(prev => ({
              ...prev,
              [priorityKey]: !prev[priorityKey]
            }))}
            className="mt-1.5 text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
          >
            {isExpanded ? (
              <>
                Read Less <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Read More <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      );
    };

    switch (question.type) {
      case "irritation-vertical":
        const partAValue = (currentResponse.partA || "") as string;
        return (
          <div className="space-y-6">
            {/* Part A: Problem Description */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Part A: What irritates you?</h3>
                <p className="text-sm text-muted-foreground mb-3">{question.partAInstructions}</p>
              </div>
              <Textarea
                placeholder={question.partAPlaceholder}
                value={partAValue}
                onChange={(e) => setCurrentResponse({ ...currentResponse, partA: e.target.value })}
                className="min-h-[200px]"
                maxLength={question.partAMaxChars}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Minimum: {question.partAMinChars} characters</span>
                <span>{partAValue.length} / {question.partAMaxChars}</span>
              </div>
              <Button
                onClick={handleAnalyzeQ1}
                disabled={isAnalyzingQ1 || partAValue.length < (question.partAMinChars || 200)}
                className="w-full"
              >
                {isAnalyzingQ1 ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze & Suggest Verticals
                  </>
                )}
              </Button>
              {!hasAnalyzedQ1 && (
                <p className="text-xs text-muted-foreground text-center">
                  AI will analyze your problem and suggest the most relevant Yi Erode verticals
                </p>
              )}
            </div>

            {/* Part B: Vertical Selection */}
            <AnimatePresence>
              {hasAnalyzedQ1 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 border-t pt-6"
                >
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Part B: Select Your Priorities</h3>
                    <p className="text-sm text-muted-foreground mb-4">{question.partBInstructions}</p>
                  </div>

                  {/* Priority 1 */}
                  <div>
                    <Label htmlFor="priority1" className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>
                        First Priority (Required)
                      </span>
                    </Label>
                    <Select
                      value={(currentResponse.priority1 as string) || ""}
                      onValueChange={(value) => setCurrentResponse({ ...currentResponse, priority1: value })}
                    >
                      <SelectTrigger id="priority1" className="mt-2">
                        <SelectValue placeholder="Select your top choice" />
                      </SelectTrigger>
                      <SelectContent>
                        <TooltipProvider>
                          {verticals
                            .filter(v => suggestedVerticals.length === 0 || suggestedVerticals.includes(v.id))
                            .map((v) => (
                              <div key={v.id} className="relative group">
                                <SelectItem value={v.id}>{v.name}</SelectItem>
                                {v.description && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-xs">
                                      <p className="text-sm">{v.description}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            ))}
                        </TooltipProvider>
                      </SelectContent>
                    </Select>
                    {currentResponse.priority1 && (
                      <DescriptionBox
                        description={verticals.find(v => v.id === currentResponse.priority1)?.description}
                        priorityKey="priority1"
                      />
                    )}
                  </div>

                  {/* Priority 2 */}
                  <div>
                    <Label htmlFor="priority2" className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
                        Second Priority (Required)
                      </span>
                    </Label>
                    <Select
                      value={(currentResponse.priority2 as string) || ""}
                      onValueChange={(value) => setCurrentResponse({ ...currentResponse, priority2: value })}
                    >
                      <SelectTrigger id="priority2" className="mt-2">
                        <SelectValue placeholder="Select your second choice" />
                      </SelectTrigger>
                      <SelectContent>
                        <TooltipProvider>
                          {verticals
                            .filter(v => 
                              (suggestedVerticals.length === 0 || suggestedVerticals.includes(v.id)) && 
                              v.id !== currentResponse.priority1
                            )
                            .map((v) => (
                              <div key={v.id} className="relative group">
                                <SelectItem value={v.id}>{v.name}</SelectItem>
                                {v.description && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-xs">
                                      <p className="text-sm">{v.description}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            ))}
                        </TooltipProvider>
                      </SelectContent>
                    </Select>
                    {currentResponse.priority2 && (
                      <DescriptionBox
                        description={verticals.find(v => v.id === currentResponse.priority2)?.description}
                        priorityKey="priority2"
                      />
                    )}
                  </div>

                  {/* Priority 3 */}
                  <div>
                    <Label htmlFor="priority3" className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">3</span>
                        Third Priority (Required)
                      </span>
                    </Label>
                    <Select
                      value={(currentResponse.priority3 as string) || ""}
                      onValueChange={(value) => setCurrentResponse({ ...currentResponse, priority3: value })}
                    >
                      <SelectTrigger id="priority3" className="mt-2">
                        <SelectValue placeholder="Select your third choice" />
                      </SelectTrigger>
                      <SelectContent>
                        <TooltipProvider>
                          {verticals
                            .filter(v => 
                              (suggestedVerticals.length === 0 || suggestedVerticals.includes(v.id)) && 
                              v.id !== currentResponse.priority1 && 
                              v.id !== currentResponse.priority2
                            )
                            .map((v) => (
                              <div key={v.id} className="relative group">
                                <SelectItem value={v.id}>{v.name}</SelectItem>
                                {v.description && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-xs">
                                      <p className="text-sm">{v.description}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            ))}
                        </TooltipProvider>
                      </SelectContent>
                    </Select>
                    {currentResponse.priority3 && (
                      <DescriptionBox
                        description={verticals.find(v => v.id === currentResponse.priority3)?.description}
                        priorityKey="priority3"
                      />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );

      case "long-text":
        const longTextValue = (currentResponse.response || "") as string;
        const adaptedScenario = adaptedQuestions[currentQuestion]?.scenario;
        const contextSummary = adaptedQuestions[currentQuestion]?.contextSummary;
        
        return (
          <div className="space-y-4">
            {/* Show context indicator if question is adapted */}
            {adaptedScenario && contextSummary && (
              <div className="bg-primary/10 p-3 rounded-lg text-sm border border-primary/20">
                <div className="flex items-center gap-2 text-primary font-medium mb-1">
                  <Sparkles className="w-4 h-4" />
                  Personalized for you
                </div>
                <p className="text-muted-foreground">
                  This question references your concern about <strong>{contextSummary}</strong>.
                </p>
              </div>
            )}
            {(adaptedScenario || question.scenario) && (
              <p className="text-base bg-muted p-4 rounded-md">
                {adaptedScenario || question.scenario}
              </p>
            )}
            <Textarea
              placeholder={question.placeholder}
              value={longTextValue}
              onChange={(e) => setCurrentResponse({ ...currentResponse, response: e.target.value })}
              className="min-h-[200px]"
              maxLength={question.maxChars}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Minimum: {question.minChars} characters</span>
              <span>{longTextValue.length} / {question.maxChars}</span>
            </div>
          </div>
        );

      case "radio":
        const radioAdaptedScenario = adaptedQuestions[currentQuestion]?.scenario;
        const radioContextSummary = adaptedQuestions[currentQuestion]?.contextSummary;
        
        return (
          <div className="space-y-6">
            {/* Show context indicator if question is adapted */}
            {radioAdaptedScenario && radioContextSummary && (
              <div className="bg-primary/10 p-3 rounded-lg text-sm border border-primary/20">
                <div className="flex items-center gap-2 text-primary font-medium mb-1">
                  <Sparkles className="w-4 h-4" />
                  Personalized for you
                </div>
                <p className="text-muted-foreground">
                  This scenario is based on your <strong>{radioContextSummary}</strong> initiative.
                </p>
              </div>
            )}
            {(radioAdaptedScenario || question.scenario) && (
              <p className="text-base bg-muted p-4 rounded-md">
                {radioAdaptedScenario || question.scenario}
              </p>
            )}
            <RadioGroup
              value={(currentResponse.leadershipStyle as string) || ""}
              onValueChange={(value) => setCurrentResponse({ ...currentResponse, leadershipStyle: value })}
            >
              <div className="space-y-3">
                {question.options?.map((option) => (
                  <div key={option.value} className="flex items-start space-x-3">
                    <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                    <Label htmlFor={option.value} className="text-base font-normal cursor-pointer leading-relaxed">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        );

      default:
        return null;
    }
  };

  const progress = (currentQuestion / 5) * 100;
  const currentQ = questionDefinitions[currentQuestion - 1];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-2 max-w-3xl pb-20">
        {/* Progress Section */}
        <div className="mb-2">
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-xs text-muted-foreground">
              Question {currentQuestion} of 5
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-1 mb-1" />
          
          {/* Progress Dots */}
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((num) => (
              <div
                key={num}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  num < currentQuestion
                    ? "bg-primary"
                    : num === currentQuestion
                    ? "bg-primary ring-2 ring-primary/20"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <Card className="p-4 md:p-8 shadow-lg">
          <div className="flex items-start justify-between mb-4 md:mb-6">
            <h2 className="text-base md:text-lg font-semibold" role="heading" aria-level={2}>
              {currentQ?.title}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAiHelp}
              disabled={isAiHelping}
              className="ml-4"
            >
              {isAiHelping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  AI Help
                </>
              )}
            </Button>
          </div>
          
          <div className="min-h-[200px]" role="main" aria-label={`Question ${currentQuestion} of 5`}>
            {isAdaptingQuestion && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 p-4 bg-muted/50 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                Personalizing your question based on your previous answers...
              </div>
            )}
            {renderQuestion()}
          </div>

          {validationError && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive" role="alert" aria-live="polite">
              <p className="text-sm text-destructive">{validationError}</p>
            </div>
          )}
        </Card>

        {/* Navigation Buttons */}
        <div className="flex flex-row justify-between gap-2 mt-4 mb-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 1}
            className="btn-mobile h-8 px-3 text-xs"
            aria-label="Go to previous question"
          >
            <ArrowLeft className="mr-1 h-3 w-3" aria-hidden="true" />
            Previous
          </Button>

          {currentQuestion < 5 ? (
            <Button 
              onClick={handleNext}
              className="btn-mobile h-8 px-3 text-xs"
              aria-label="Go to next question"
            >
              Next
              <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting} 
              className="btn-mobile h-8 px-3 text-xs"
              aria-label="Submit assessment"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
                  Submitting...
                </>
              ) : (
                "Submit Assessment"
              )}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};

export default Assessment;
