import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface StuckAssessment {
  id: string;
  user_name: string;
  user_email: string;
  created_at: string;
  issue_type: 'stuck_in_progress' | 'completed_not_analyzed';
}

export function StuckAssessmentsWidget() {
  const [stuckAssessments, setStuckAssessments] = useState<StuckAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHealing, setIsHealing] = useState(false);

  const loadStuckAssessments = async () => {
    setIsLoading(true);
    try {
      const allStuck: StuckAssessment[] = [];

      // 1. Find assessments stuck in progress
      const { data: stuckInProgress } = await supabase
        .from("assessments")
        .select("id, user_name, user_email, created_at")
        .eq("status", "in_progress")
        .eq("current_question", 5)
        .lt("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      if (stuckInProgress) {
        // Filter to only those with results (meaning they're truly stuck)
        const assessmentIds = stuckInProgress.map(a => a.id);
        const { data: results } = await supabase
          .from("assessment_results")
          .select("assessment_id")
          .in("assessment_id", assessmentIds);

        const completedIds = new Set(results?.map(r => r.assessment_id) || []);
        const reallyStuck = stuckInProgress
          .filter(a => completedIds.has(a.id))
          .map(a => ({ ...a, issue_type: 'stuck_in_progress' as const }));
        allStuck.push(...reallyStuck);
      }

      // 2. Find completed assessments without results (analysis never ran)
      const { data: completedNoResults } = await supabase
        .from("assessments")
        .select("id, user_name, user_email, created_at")
        .eq("status", "completed")
        .lt("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      if (completedNoResults) {
        const assessmentIds = completedNoResults.map(a => a.id);
        const { data: results } = await supabase
          .from("assessment_results")
          .select("assessment_id")
          .in("assessment_id", assessmentIds);

        const hasResultsIds = new Set(results?.map(r => r.assessment_id) || []);
        const missingResults = completedNoResults
          .filter(a => !hasResultsIds.has(a.id))
          .map(a => ({ ...a, issue_type: 'completed_not_analyzed' as const }));
        allStuck.push(...missingResults);
      }

      setStuckAssessments(allStuck);
    } catch (error) {
      console.error("Error loading stuck assessments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const healStuckAssessments = async () => {
    setIsHealing(true);
    try {
      const { data, error } = await supabase.functions.invoke("heal-stuck-assessments");

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message || `Fixed ${data.healed} stuck assessment(s)`);
        await loadStuckAssessments(); // Reload to show updated state
      } else {
        toast.error("Failed to heal assessments");
      }
    } catch (error) {
      console.error("Error healing assessments:", error);
      toast.error("Failed to fix stuck assessments");
    } finally {
      setIsHealing(false);
    }
  };

  useEffect(() => {
    loadStuckAssessments();
    // Refresh every 30 seconds
    const interval = setInterval(loadStuckAssessments, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Assessment Health Monitor</h3>
          <Badge variant="outline">Loading...</Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Assessment Health Monitor</h3>
          {stuckAssessments.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {stuckAssessments.length} Stuck
            </Badge>
          )}
          {stuckAssessments.length === 0 && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              All Good
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadStuckAssessments}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {stuckAssessments.length > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={healStuckAssessments}
              disabled={isHealing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isHealing ? "animate-spin" : ""}`} />
              Fix All
            </Button>
          )}
        </div>
      </div>

      {stuckAssessments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No stuck assessments detected. All submissions are properly marked as completed and analyzed.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-3">
            Found {stuckAssessments.length} assessment(s) with issues:
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {stuckAssessments.map((assessment) => (
              <div
                key={assessment.id}
                className="flex items-center justify-between p-2 bg-destructive/10 rounded-md text-sm"
              >
                <div className="flex-1">
                  <span className="font-medium">{assessment.user_name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {assessment.user_email}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {assessment.issue_type === 'stuck_in_progress' 
                    ? 'Stuck in Progress' 
                    : 'Not Analyzed'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
