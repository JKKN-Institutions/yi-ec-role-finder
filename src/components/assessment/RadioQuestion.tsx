import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles } from "lucide-react";
import { QuestionResponse, AdaptedQuestion } from "@/hooks/useAssessmentState";

interface QuestionOption {
  value: string;
  label: string;
}

interface QuestionDefinition {
  scenario?: string;
  options?: QuestionOption[];
}

interface RadioQuestionProps {
  currentResponse: QuestionResponse;
  setCurrentResponse: (response: QuestionResponse) => void;
  questionDefinition: QuestionDefinition;
  adaptedQuestion?: AdaptedQuestion;
}

export function RadioQuestion({
  currentResponse,
  setCurrentResponse,
  questionDefinition,
  adaptedQuestion,
}: RadioQuestionProps) {
  const adaptedScenario = adaptedQuestion?.scenario;
  const contextSummary = adaptedQuestion?.contextSummary;

  return (
    <div className="space-y-6">
      {/* Show context indicator if question is adapted */}
      {adaptedScenario && contextSummary && (
        <div className="bg-primary/10 p-3 rounded-lg text-sm border border-primary/20">
          <div className="flex items-center gap-2 text-primary font-medium mb-1">
            <Sparkles className="w-4 h-4" />
            Personalized for you
          </div>
          <p className="text-muted-foreground">
            This scenario is based on your <strong>{contextSummary}</strong> initiative.
          </p>
        </div>
      )}
      {(adaptedScenario || questionDefinition.scenario) && (
        <p className="text-base bg-muted p-4 rounded-md">{adaptedScenario || questionDefinition.scenario}</p>
      )}
      <RadioGroup
        value={(currentResponse.leadershipStyle as string) || ""}
        onValueChange={(value) => setCurrentResponse({ ...currentResponse, leadershipStyle: value })}
      >
        <div className="space-y-3">
          {questionDefinition.options?.map((option) => (
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
}
