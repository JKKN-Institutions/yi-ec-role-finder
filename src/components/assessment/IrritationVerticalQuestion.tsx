import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Info, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Vertical, QuestionResponse } from "@/hooks/useAssessmentState";

interface QuestionDefinition {
  partAInstructions?: string;
  partAPlaceholder?: string;
  partAMinChars?: number;
  partAMaxChars?: number;
  partBInstructions?: string;
}

interface IrritationVerticalQuestionProps {
  currentResponse: QuestionResponse;
  setCurrentResponse: (response: QuestionResponse) => void;
  verticals: Vertical[];
  suggestedVerticals: string[];
  hasAnalyzedQ1: boolean;
  isAnalyzingQ1: boolean;
  expandedDescriptions: { priority1: boolean; priority2: boolean; priority3: boolean };
  setExpandedDescriptions: React.Dispatch<React.SetStateAction<{ priority1: boolean; priority2: boolean; priority3: boolean }>>;
  onAnalyze: () => void;
  questionDefinition: QuestionDefinition;
}

const DescriptionBox = ({
  description,
  priorityKey,
  expandedDescriptions,
  setExpandedDescriptions,
}: {
  description: string | null | undefined;
  priorityKey: "priority1" | "priority2" | "priority3";
  expandedDescriptions: { priority1: boolean; priority2: boolean; priority3: boolean };
  setExpandedDescriptions: React.Dispatch<React.SetStateAction<{ priority1: boolean; priority2: boolean; priority3: boolean }>>;
}) => {
  if (!description) return null;

  const isExpanded = expandedDescriptions[priorityKey];

  return (
    <div className="mt-3 p-3 bg-muted/50 rounded-md border border-border">
      <p className={`text-sm text-muted-foreground leading-relaxed ${!isExpanded ? "line-clamp-1" : ""}`}>{description}</p>
      <button
        onClick={() =>
          setExpandedDescriptions((prev) => ({
            ...prev,
            [priorityKey]: !prev[priorityKey],
          }))
        }
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

export function IrritationVerticalQuestion({
  currentResponse,
  setCurrentResponse,
  verticals,
  suggestedVerticals,
  hasAnalyzedQ1,
  isAnalyzingQ1,
  expandedDescriptions,
  setExpandedDescriptions,
  onAnalyze,
  questionDefinition,
}: IrritationVerticalQuestionProps) {
  const partAValue = (currentResponse.partA || "") as string;

  const renderPrioritySelect = (
    priorityKey: "priority1" | "priority2" | "priority3",
    label: string,
    number: number,
    excludeIds: string[]
  ) => {
    return (
      <div>
        <Label htmlFor={priorityKey} className="font-medium">
          <span className="inline-flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              {number}
            </span>
            {label}
          </span>
        </Label>
        <Select
          value={(currentResponse[priorityKey] as string) || ""}
          onValueChange={(value) => setCurrentResponse({ ...currentResponse, [priorityKey]: value })}
        >
          <SelectTrigger id={priorityKey} className="mt-2">
            <SelectValue placeholder={`Select your ${number === 1 ? "top" : number === 2 ? "second" : "third"} choice`} />
          </SelectTrigger>
          <SelectContent>
            <TooltipProvider>
              {verticals
                .filter((v) => (suggestedVerticals.length === 0 || suggestedVerticals.includes(v.id)) && !excludeIds.includes(v.id))
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
        {currentResponse[priorityKey] && (
          <DescriptionBox
            description={verticals.find((v) => v.id === currentResponse[priorityKey])?.description}
            priorityKey={priorityKey}
            expandedDescriptions={expandedDescriptions}
            setExpandedDescriptions={setExpandedDescriptions}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Part A: Problem Description */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Part A: What irritates you?</h3>
          <p className="text-sm text-muted-foreground mb-3">{questionDefinition.partAInstructions}</p>
        </div>
        <Textarea
          placeholder={questionDefinition.partAPlaceholder}
          value={partAValue}
          onChange={(e) => setCurrentResponse({ ...currentResponse, partA: e.target.value })}
          className="min-h-[200px]"
          maxLength={questionDefinition.partAMaxChars}
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Minimum: {questionDefinition.partAMinChars} characters</span>
          <span>
            {partAValue.length} / {questionDefinition.partAMaxChars}
          </span>
        </div>
        <Button
          onClick={onAnalyze}
          disabled={isAnalyzingQ1 || partAValue.length < (questionDefinition.partAMinChars || 200)}
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
              <p className="text-sm text-muted-foreground mb-4">{questionDefinition.partBInstructions}</p>
            </div>

            {renderPrioritySelect("priority1", "First Priority (Required)", 1, [])}
            {renderPrioritySelect("priority2", "Second Priority (Required)", 2, [currentResponse.priority1 as string].filter(Boolean))}
            {renderPrioritySelect("priority3", "Third Priority (Required)", 3, [currentResponse.priority1 as string, currentResponse.priority2 as string].filter(Boolean))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
