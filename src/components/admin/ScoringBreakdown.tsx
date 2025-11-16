import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Info, TrendingUp, Target, Users, Lightbulb } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ScoringBreakdownProps {
  willScore: number;
  skillScore: number;
  scoringBreakdown: {
    will?: {
      vertical_preferences?: number;
      achievement?: number;
      constraints?: number;
      leadership_style?: number;
      saturday_scenario?: {
        score: number;
        reasoning: string;
      };
    };
    skill?: {
      sophistication?: number;
      strategic_thinking?: number;
      outcome_orientation?: number;
      leadership_signals?: number;
      reasoning?: string;
    };
  };
}

export const ScoringBreakdown = ({ willScore, skillScore, scoringBreakdown }: ScoringBreakdownProps) => {
  const willBreakdown = scoringBreakdown?.will || {};
  const skillBreakdown = scoringBreakdown?.skill || {};

  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-blue-500";
    if (percentage >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>How Scoring Works:</strong> Candidates are evaluated on WILL (motivation & commitment) and SKILL (communication & leadership capability). 
          Scores below 55 in both categories indicate developmental needs, while scores above 55 show readiness for leadership roles.
        </AlertDescription>
      </Alert>

      {/* WILL Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            WILL Score Breakdown ({willScore}/100)
          </CardTitle>
          <CardDescription>
            Measures commitment, motivation, and willingness to take on responsibilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vertical Preferences */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Vertical Preferences (Informational)</span>
              <span className={`text-sm font-bold ${getScoreColor(willBreakdown.vertical_preferences || 0, 0)}`}>
                {willBreakdown.vertical_preferences || 0} pts
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Interest areas - used for vertical matching, not scored
            </p>
          </div>

          {/* Achievement Statement */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Achievement Statement</span>
              <span className={`text-sm font-bold ${getScoreColor(willBreakdown.achievement || 0, 25)}`}>
                {willBreakdown.achievement || 0}/25 pts
              </span>
            </div>
            <Progress 
              value={((willBreakdown.achievement || 0) / 25) * 100} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Quality of past achievements, action verbs, specificity, and measurable results
            </p>
          </div>

          {/* Constraints */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Constraint Handling</span>
              <span className={`text-sm font-bold ${getScoreColor(willBreakdown.constraints || 0, 25)}`}>
                {willBreakdown.constraints || 0}/25 pts
              </span>
            </div>
            <Progress 
              value={((willBreakdown.constraints || 0) / 25) * 100} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Awareness of limitations and thoughtful handling approach
            </p>
          </div>

          {/* Leadership Style */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Leadership Orientation</span>
              <span className={`text-sm font-bold ${getScoreColor(willBreakdown.leadership_style || 0, 20)}`}>
                {willBreakdown.leadership_style || 0}/20 pts
              </span>
            </div>
            <Progress 
              value={((willBreakdown.leadership_style || 0) / 20) * 100} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Self-identified leadership approach and aspirations
            </p>
          </div>

          {/* Saturday Scenario */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Emergency Scenario Response</span>
              <span className={`text-sm font-bold ${getScoreColor(willBreakdown.saturday_scenario?.score || 0, 30)}`}>
                {willBreakdown.saturday_scenario?.score || 0}/30 pts
              </span>
            </div>
            <Progress 
              value={((willBreakdown.saturday_scenario?.score || 0) / 30) * 100} 
              className="h-2"
            />
            {willBreakdown.saturday_scenario?.reasoning && (
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>AI Analysis:</strong> {willBreakdown.saturday_scenario.reasoning}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SKILL Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            SKILL Score Breakdown ({skillScore}/100)
          </CardTitle>
          <CardDescription>
            Evaluates communication quality, strategic thinking, and leadership capability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sophistication */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Communication Sophistication</span>
              <span className={`text-sm font-bold ${getScoreColor(skillBreakdown.sophistication || 0, 25)}`}>
                {skillBreakdown.sophistication || 0}/25 pts
              </span>
            </div>
            <Progress 
              value={((skillBreakdown.sophistication || 0) / 25) * 100} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Clarity of communication, ability to articulate ideas effectively
            </p>
          </div>

          {/* Strategic Thinking */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Strategic Thinking</span>
              <span className={`text-sm font-bold ${getScoreColor(skillBreakdown.strategic_thinking || 0, 25)}`}>
                {skillBreakdown.strategic_thinking || 0}/25 pts
              </span>
            </div>
            <Progress 
              value={((skillBreakdown.strategic_thinking || 0) / 25) * 100} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Problem-solving approach, planning capability, systems thinking
            </p>
          </div>

          {/* Outcome Orientation */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Outcome Orientation</span>
              <span className={`text-sm font-bold ${getScoreColor(skillBreakdown.outcome_orientation || 0, 25)}`}>
                {skillBreakdown.outcome_orientation || 0}/25 pts
              </span>
            </div>
            <Progress 
              value={((skillBreakdown.outcome_orientation || 0) / 25) * 100} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Focus on results, goal-setting, measurable achievements
            </p>
          </div>

          {/* Leadership Signals */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Leadership Signals</span>
              <span className={`text-sm font-bold ${getScoreColor(skillBreakdown.leadership_signals || 0, 25)}`}>
                {skillBreakdown.leadership_signals || 0}/25 pts
              </span>
            </div>
            <Progress 
              value={((skillBreakdown.leadership_signals || 0) / 25) * 100} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Initiative, responsibility ownership, team awareness
            </p>
          </div>

          {/* AI Reasoning */}
          {skillBreakdown.reasoning && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium mb-1 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                AI Analysis
              </p>
              <p className="text-xs text-muted-foreground">
                {skillBreakdown.reasoning}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overall Summary */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Score Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total WILL Score</p>
              <p className="text-3xl font-bold text-blue-600">{willScore}</p>
              <Badge className="mt-2" variant={willScore >= 55 ? "default" : "secondary"}>
                {willScore >= 55 ? "Ready" : "Developing"}
              </Badge>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total SKILL Score</p>
              <p className="text-3xl font-bold text-green-600">{skillScore}</p>
              <Badge className="mt-2" variant={skillScore >= 50 ? "default" : "secondary"}>
                {skillScore >= 50 ? "Ready" : "Developing"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
