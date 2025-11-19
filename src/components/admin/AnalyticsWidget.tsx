import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Clock, Target, BarChart3 } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

interface AnalyticsData {
  completionRate: number;
  avgPersonalOwnership: number;
  avgImpactReadiness: number;
  avgWill: number;
  avgSkill: number;
  avgTimeToComplete: number; // in minutes
  totalCompleted: number;
  totalInProgress: number;
}

export function AnalyticsWidget() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    completionRate: 0,
    avgPersonalOwnership: 0,
    avgImpactReadiness: 0,
    avgWill: 0,
    avgSkill: 0,
    avgTimeToComplete: 0,
    totalCompleted: 0,
    totalInProgress: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Fetch all assessments with results
      const { data: assessments } = await supabase
        .from("assessments")
        .select("*, assessment_results(*)");

      if (assessments) {
        const completed = assessments.filter((a) => a.status === "completed");
        const inProgress = assessments.filter((a) => a.status === "in_progress");
        
        const completionRate = assessments.length > 0 
          ? Math.round((completed.length / assessments.length) * 100)
          : 0;

        // Calculate average scores from completed assessments
        const results = completed
          .map((a) => a.assessment_results?.[0])
          .filter((r) => r);

        const avgPersonalOwnership = results.length > 0
          ? Math.round(results.reduce((sum, r) => sum + (r.personal_ownership_score || 0), 0) / results.length)
          : 0;

        const avgImpactReadiness = results.length > 0
          ? Math.round(results.reduce((sum, r) => sum + (r.impact_readiness_score || 0), 0) / results.length)
          : 0;

        const avgWill = results.length > 0
          ? Math.round(results.reduce((sum, r) => sum + (r.will_score || 0), 0) / results.length)
          : 0;

        const avgSkill = results.length > 0
          ? Math.round(results.reduce((sum, r) => sum + (r.skill_score || 0), 0) / results.length)
          : 0;

        // Calculate average time to complete (from created_at to completed_at)
        const timesToComplete = completed
          .filter((a) => a.completed_at)
          .map((a) => {
            const start = new Date(a.created_at);
            const end = new Date(a.completed_at!);
            return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
          });

        const avgTimeToComplete = timesToComplete.length > 0
          ? Math.round(timesToComplete.reduce((sum, t) => sum + t, 0) / timesToComplete.length)
          : 0;

        setAnalytics({
          completionRate,
          avgPersonalOwnership,
          avgImpactReadiness,
          avgWill,
          avgSkill,
          avgTimeToComplete,
          totalCompleted: completed.length,
          totalInProgress: inProgress.length,
        });
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const radarData = [
    { dimension: "Personal\nOwnership", score: analytics.avgPersonalOwnership },
    { dimension: "Impact\nReadiness", score: analytics.avgImpactReadiness },
    { dimension: "WILL", score: analytics.avgWill },
    { dimension: "SKILL", score: analytics.avgSkill },
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Assessment Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="skeleton h-48 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Assessment Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Completion Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Completion Rate
            </span>
            <span className="font-bold">{analytics.completionRate}%</span>
          </div>
          <Progress value={analytics.completionRate} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{analytics.totalCompleted} completed</span>
            <span>{analytics.totalInProgress} in progress</span>
          </div>
        </div>

        {/* Average Time to Complete */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Avg. Time to Complete</span>
          </div>
          <span className="font-bold">{analytics.avgTimeToComplete} min</span>
        </div>

        {/* 4D Scores Radar Chart */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-primary" />
            Average Scores by Dimension
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis 
                dataKey="dimension" 
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                style={{ whiteSpace: 'pre-line' }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Radar 
                name="Average Score" 
                dataKey="score" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))" 
                fillOpacity={0.3}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Individual Dimension Progress Bars */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Personal Ownership</span>
              <span className="font-bold">{analytics.avgPersonalOwnership}</span>
            </div>
            <Progress value={analytics.avgPersonalOwnership} className="h-1.5" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Impact Readiness</span>
              <span className="font-bold">{analytics.avgImpactReadiness}</span>
            </div>
            <Progress value={analytics.avgImpactReadiness} className="h-1.5" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>WILL</span>
              <span className="font-bold">{analytics.avgWill}</span>
            </div>
            <Progress value={analytics.avgWill} className="h-1.5" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>SKILL</span>
              <span className="font-bold">{analytics.avgSkill}</span>
            </div>
            <Progress value={analytics.avgSkill} className="h-1.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
