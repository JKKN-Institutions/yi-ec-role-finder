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
import { ArrowRight, ArrowLeft, Loader2, Info, List, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Vertical = {
  id: string;
  name: string;
  description: string | null;
};

type QuestionResponse = {
  [key: string]: string;
};

const questionDefinitions = [
  {
    number: 1,
    title: "Which verticals interest you most?",
    type: "vertical-select",
    instructions: "Choose your top 3 preferences in priority order",
  },
  {
    number: 2,
    title: "Saturday Emergency Response",
    type: "long-text",
    scenario:
      "It's Saturday, 6 PM. You're relaxing with family when your vertical head calls: 'We need urgent help preparing for tomorrow's major event. Can you come to the office now for 3-4 hours?' What's your honest response?",
    placeholder: "Describe exactly what you'd say and do...",
    minChars: 50,
    maxChars: 500,
  },
  {
    number: 3,
    title: "Your EC 2026 Commitment",
    type: "short-text",
    instruction: "Complete this sentence:",
    prompt: "If I'm on EC 2026, by December 2026 I will have...",
    placeholder: "Be specific with numbers and action verbs...",
    minChars: 30,
    maxChars: 300,
  },
  {
    number: 4,
    title: "What might hold you back?",
    type: "radio-with-text",
    options: [
      { value: "none", label: "None - I'm fully available and committed" },
      { value: "time", label: "Time constraints (work/studies)" },
      { value: "expectations", label: "Family/personal expectations" },
      { value: "skills", label: "Lack of specific skills" },
    ],
  },
  {
    number: 5,
    title: "Team Deadline Scenario",
    type: "radio",
    scenario:
      "Your team misses a critical deadline. What's your first instinct?",
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<{
    priority1: boolean;
    priority2: boolean;
    priority3: boolean;
  }>({ priority1: false, priority2: false, priority3: false });

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

  const validateCurrentQuestion = (): boolean => {
    setValidationError("");
    const question = questionDefinitions[currentQuestion - 1];

    if (question.type === "vertical-select") {
      if (!currentResponse.priority1 || !currentResponse.priority2 || !currentResponse.priority3) {
        setValidationError("Please select all 3 priorities");
        return false;
      }
    } else if (question.type === "long-text") {
      const text = currentResponse.response || "";
      if (text.length < (question.minChars || 0)) {
        setValidationError(
          `Please write at least ${question.minChars} characters`
        );
        return false;
      }
    } else if (question.type === "short-text") {
      const text = currentResponse.statement || "";
      if (text.length < (question.minChars || 0)) {
        setValidationError(
          `Please write at least ${question.minChars} characters`
        );
        return false;
      }
    } else if (question.type === "radio-with-text" || question.type === "radio") {
      const value =
        currentResponse.constraint ||
        currentResponse.leadership_style ||
        "";
      if (!value) {
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

      await supabase.from("assessment_responses").upsert({
        assessment_id: id,
        question_number: currentQuestion,
        question_text: question.title,
        response_data: currentResponse,
      });

      setResponses({ ...responses, [currentQuestion]: currentResponse });
    } catch (error) {
      toast.error("Failed to save response");
    }
  };

  const handleNext = async () => {
    if (!validateCurrentQuestion()) return;

    await saveResponse();

    if (currentQuestion < 5) {
      const nextQuestion = currentQuestion + 1;
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
      case "vertical-select":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {question.instructions}
              </p>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <List className="w-4 h-4" />
                    View All Verticals
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>All Available Verticals</DialogTitle>
                    <DialogDescription>
                      Review all verticals and their descriptions to make an informed choice
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 mt-4">
                    {verticals.map((vertical) => (
                      <div key={vertical.id} className="space-y-2 pb-4 border-b border-border last:border-0">
                        <h3 className="font-semibold text-lg">{vertical.name}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {vertical.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="priority1" className="text-base font-medium">
                  <span className="inline-flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      1
                    </span>
                    First Priority (Required)
                  </span>
                </Label>
                <Select
                  value={currentResponse.priority1 || ""}
                  onValueChange={(value) =>
                    setCurrentResponse({ ...currentResponse, priority1: value })
                  }
                >
                  <SelectTrigger id="priority1" className="mt-2">
                    <SelectValue placeholder="Select your top choice" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <TooltipProvider>
                      {verticals.map((v) => (
                        <div key={v.id} className="relative group">
                          <SelectItem value={v.id} className="pr-8">
                            {v.name}
                          </SelectItem>
                          {v.description && (
                            <Tooltip delayDuration={100}>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
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
                <AnimatePresence>
                  {currentResponse.priority1 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <DescriptionBox 
                        description={verticals.find((v) => v.id === currentResponse.priority1)?.description}
                        priorityKey="priority1"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <Label htmlFor="priority2" className="text-base font-medium">
                  <span className="inline-flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      2
                    </span>
                    Second Priority (Required)
                  </span>
                </Label>
                <Select
                  value={currentResponse.priority2 || ""}
                  onValueChange={(value) =>
                    setCurrentResponse({ ...currentResponse, priority2: value })
                  }
                >
                  <SelectTrigger id="priority2" className="mt-2">
                    <SelectValue placeholder="Select your second choice" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <TooltipProvider>
                      {verticals
                        .filter((v) => v.id !== currentResponse.priority1)
                        .map((v) => (
                          <div key={v.id} className="relative group">
                            <SelectItem value={v.id} className="pr-8">
                              {v.name}
                            </SelectItem>
                            {v.description && (
                              <Tooltip delayDuration={100}>
                                <TooltipTrigger asChild>
                                  <Info className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
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
                <AnimatePresence>
                  {currentResponse.priority2 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <DescriptionBox 
                        description={verticals.find((v) => v.id === currentResponse.priority2)?.description}
                        priorityKey="priority2"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <Label htmlFor="priority3" className="text-base font-medium">
                  <span className="inline-flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      3
                    </span>
                    Third Priority (Required)
                  </span>
                </Label>
                <Select
                  value={currentResponse.priority3 || ""}
                  onValueChange={(value) =>
                    setCurrentResponse({ ...currentResponse, priority3: value })
                  }
                >
                  <SelectTrigger id="priority3" className="mt-2">
                    <SelectValue placeholder="Select your third choice" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <TooltipProvider>
                      {verticals
                        .filter(
                          (v) =>
                            v.id !== currentResponse.priority1 &&
                            v.id !== currentResponse.priority2
                        )
                        .map((v) => (
                          <div key={v.id} className="relative group">
                            <SelectItem value={v.id} className="pr-8">
                              {v.name}
                            </SelectItem>
                            {v.description && (
                              <Tooltip delayDuration={100}>
                                <TooltipTrigger asChild>
                                  <Info className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
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
                <AnimatePresence>
                  {currentResponse.priority3 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <DescriptionBox 
                        description={verticals.find((v) => v.id === currentResponse.priority3)?.description}
                        priorityKey="priority3"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        );

      case "long-text":
        const longTextValue = currentResponse.response || "";
        return (
          <div className="space-y-4">
            {question.scenario && (
              <p className="text-base bg-muted p-4 rounded-md">
                {question.scenario}
              </p>
            )}
            <div>
              <Textarea
                placeholder={question.placeholder}
                value={longTextValue}
                onChange={(e) =>
                  setCurrentResponse({
                    ...currentResponse,
                    response: e.target.value,
                  })
                }
                className="min-h-[200px] text-base"
                maxLength={question.maxChars}
              />
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>
                  Minimum: {question.minChars} characters
                </span>
                <span>
                  {longTextValue.length} / {question.maxChars}
                </span>
              </div>
            </div>
          </div>
        );

      case "short-text":
        const shortTextValue = currentResponse.statement || "";
        return (
          <div className="space-y-4">
            {question.instruction && (
              <p className="text-base font-medium">{question.instruction}</p>
            )}
            {question.prompt && (
              <p className="text-base italic text-muted-foreground">
                "{question.prompt}"
              </p>
            )}
            <div>
              <Textarea
                placeholder={question.placeholder}
                value={shortTextValue}
                onChange={(e) =>
                  setCurrentResponse({
                    ...currentResponse,
                    statement: e.target.value,
                  })
                }
                className="min-h-[150px] text-base"
                maxLength={question.maxChars}
              />
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>
                  Minimum: {question.minChars} characters
                </span>
                <span>
                  {shortTextValue.length} / {question.maxChars}
                </span>
              </div>
            </div>
          </div>
        );

      case "radio-with-text":
        const needsHandling =
          currentResponse.constraint &&
          currentResponse.constraint !== "none";
        return (
          <div className="space-y-6">
            <RadioGroup
              value={currentResponse.constraint || ""}
              onValueChange={(value) =>
                setCurrentResponse({ ...currentResponse, constraint: value })
              }
            >
              <div className="space-y-3">
                {question.options?.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label
                      htmlFor={option.value}
                      className="text-base font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>

            {needsHandling && (
              <div className="pl-7 space-y-2">
                <Label htmlFor="handling" className="text-base">
                  How would you handle this constraint?
                </Label>
                <Textarea
                  id="handling"
                  placeholder="What's your plan to overcome this?"
                  value={currentResponse.handling || ""}
                  onChange={(e) =>
                    setCurrentResponse({
                      ...currentResponse,
                      handling: e.target.value,
                    })
                  }
                  className="min-h-[100px]"
                  maxLength={200}
                />
                <div className="text-sm text-muted-foreground text-right">
                  {(currentResponse.handling || "").length} / 200
                </div>
              </div>
            )}
          </div>
        );

      case "radio":
        return (
          <div className="space-y-6">
            {question.scenario && (
              <p className="text-base bg-muted p-4 rounded-md">
                {question.scenario}
              </p>
            )}
            <RadioGroup
              value={currentResponse.leadership_style || ""}
              onValueChange={(value) =>
                setCurrentResponse({
                  ...currentResponse,
                  leadership_style: value,
                })
              }
            >
              <div className="space-y-3">
                {question.options?.map((option) => (
                  <div key={option.value} className="flex items-start space-x-3">
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={option.value}
                      className="text-base font-normal cursor-pointer leading-relaxed"
                    >
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
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Progress Section */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-muted-foreground">
              Question {currentQuestion} of 5
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2 mb-2" />
          
          {/* Progress Dots */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <div
                key={num}
                className={`w-3 h-3 rounded-full transition-colors ${
                  num < currentQuestion
                    ? "bg-primary"
                    : num === currentQuestion
                    ? "bg-primary ring-4 ring-primary/20"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <Card className="p-4 md:p-8 shadow-lg">
          <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6" role="heading" aria-level={2}>
            {currentQ?.title}
          </h2>
          
          <div className="min-h-[200px]" role="main" aria-label={`Question ${currentQuestion} of 5`}>
            {renderQuestion()}
          </div>

          {validationError && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive" role="alert" aria-live="polite">
              <p className="text-sm text-destructive">{validationError}</p>
            </div>
          )}

          <div className="mobile-footer mt-6 md:mt-8 flex flex-col sm:flex-row justify-between gap-3">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 1}
              className="btn-mobile w-full sm:w-auto"
              aria-label="Go to previous question"
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Previous
            </Button>

            {currentQuestion < 5 ? (
              <Button 
                onClick={handleNext} 
                className="btn-mobile w-full sm:w-auto"
                aria-label="Go to next question"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting} 
                className="btn-mobile w-full sm:w-auto"
                aria-label="Submit assessment"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Submitting...
                  </>
                ) : (
                  "Submit Assessment"
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Assessment;
