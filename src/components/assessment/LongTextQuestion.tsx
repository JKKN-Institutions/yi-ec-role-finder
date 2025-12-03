import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";
import { QuestionResponse, AdaptedQuestion } from "@/hooks/useAssessmentState";

interface QuestionDefinition {
  scenario?: string;
  placeholder?: string;
  minChars?: number;
  maxChars?: number;
}

interface LongTextQuestionProps {
  currentResponse: QuestionResponse;
  setCurrentResponse: (response: QuestionResponse) => void;
  questionDefinition: QuestionDefinition;
  adaptedQuestion?: AdaptedQuestion;
}

export function LongTextQuestion({
  currentResponse,
  setCurrentResponse,
  questionDefinition,
  adaptedQuestion,
}: LongTextQuestionProps) {
  const longTextValue = (currentResponse.response || "") as string;
  const adaptedScenario = adaptedQuestion?.scenario;
  const contextSummary = adaptedQuestion?.contextSummary;

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
      {(adaptedScenario || questionDefinition.scenario) && (
        <p className="text-base bg-muted p-4 rounded-md">{adaptedScenario || questionDefinition.scenario}</p>
      )}
      <Textarea
        placeholder={questionDefinition.placeholder}
        value={longTextValue}
        onChange={(e) => setCurrentResponse({ ...currentResponse, response: e.target.value })}
        className="min-h-[200px]"
        maxLength={questionDefinition.maxChars}
      />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Minimum: {questionDefinition.minChars} characters</span>
        <span>
          {longTextValue.length} / {questionDefinition.maxChars}
        </span>
      </div>
    </div>
  );
}
