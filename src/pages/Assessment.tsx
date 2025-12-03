import { useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useAssessmentState, questionDefinitions } from "@/hooks/useAssessmentState";
import { useAIHelp } from "@/hooks/useAIHelp";
import { IrritationVerticalQuestion } from "@/components/assessment/IrritationVerticalQuestion";
import { LongTextQuestion } from "@/components/assessment/LongTextQuestion";
import { RadioQuestion } from "@/components/assessment/RadioQuestion";

const Assessment = () => {
  const { id } = useParams();

  const {
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
    handleNext,
    handlePrevious,
    handleSubmit,
    handleAnalyzeQ1,
  } = useAssessmentState(id);

  const { isAiHelping, handleAiHelp } = useAIHelp({
    assessmentId: id,
    currentQuestion,
    currentResponse,
    responses,
    adaptedQuestions,
    setCurrentResponse,
    setAiHelpUsedForQuestion,
  });

  const renderQuestion = () => {
    const question = questionDefinitions[currentQuestion - 1];

    switch (question.type) {
      case "irritation-vertical":
        return (
          <IrritationVerticalQuestion
            currentResponse={currentResponse}
            setCurrentResponse={setCurrentResponse}
            verticals={verticals}
            suggestedVerticals={suggestedVerticals}
            hasAnalyzedQ1={hasAnalyzedQ1}
            isAnalyzingQ1={isAnalyzingQ1}
            expandedDescriptions={expandedDescriptions}
            setExpandedDescriptions={setExpandedDescriptions}
            onAnalyze={handleAnalyzeQ1}
            questionDefinition={question}
          />
        );

      case "long-text":
        return (
          <LongTextQuestion
            currentResponse={currentResponse}
            setCurrentResponse={setCurrentResponse}
            questionDefinition={question}
            adaptedQuestion={adaptedQuestions[currentQuestion]}
          />
        );

      case "radio":
        return (
          <RadioQuestion
            currentResponse={currentResponse}
            setCurrentResponse={setCurrentResponse}
            questionDefinition={question}
            adaptedQuestion={adaptedQuestions[currentQuestion]}
          />
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
            <span className="text-xs text-muted-foreground">Question {currentQuestion} of 5</span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
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
            <Button variant="outline" size="sm" onClick={handleAiHelp} disabled={isAiHelping} className="ml-4">
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
            <Button onClick={handleNext} className="btn-mobile h-8 px-3 text-xs" aria-label="Go to next question">
              Next
              <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="btn-mobile h-8 px-3 text-xs" aria-label="Submit assessment">
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
