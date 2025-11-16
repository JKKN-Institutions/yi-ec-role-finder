import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Trophy, Activity } from "lucide-react";

interface WidgetData {
  type: "top_chapters" | "recent_trends" | "key_metrics";
  data: any;
}

export const DashboardWidget = ({ type, data }: WidgetData) => {
  if (type === "top_chapters") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            Top Performing Chapters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.map((chapter: any, index: number) => (
              <div key={chapter.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{chapter.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {chapter.totalAssessments} assessments
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">{chapter.completionRate}%</p>
                  <p className="text-xs text-muted-foreground">completion</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === "recent_trends") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            Recent Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
              <div>
                <p className="text-sm text-muted-foreground">Assessments This Week</p>
                <p className="text-2xl font-bold">{data?.weeklyAssessments || 0}</p>
              </div>
              <div className="flex items-center gap-2">
                {data?.weeklyTrend > 0 ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span className="text-green-500 font-semibold">+{data?.weeklyTrend}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-5 w-5 text-destructive" />
                    <span className="text-destructive font-semibold">{data?.weeklyTrend}%</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
              <div>
                <p className="text-sm text-muted-foreground">Avg Completion Time</p>
                <p className="text-2xl font-bold">{data?.avgCompletionTime || 0} min</p>
              </div>
              <Badge variant="secondary">{data?.completionTrend || "stable"}</Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
              <div>
                <p className="text-sm text-muted-foreground">Shortlisted Rate</p>
                <p className="text-2xl font-bold">{data?.shortlistedRate || 0}%</p>
              </div>
              <Badge variant={data?.shortlistedRate > 50 ? "default" : "secondary"}>
                {data?.shortlistedRate > 50 ? "High" : "Normal"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === "key_metrics") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            Key Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border bg-card text-center">
              <p className="text-sm text-muted-foreground mb-2">Total Candidates</p>
              <p className="text-3xl font-bold text-primary">{data?.totalCandidates || 0}</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card text-center">
              <p className="text-sm text-muted-foreground mb-2">Pending Reviews</p>
              <p className="text-3xl font-bold text-accent">{data?.pendingReviews || 0}</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card text-center">
              <p className="text-sm text-muted-foreground mb-2">Avg Skill Score</p>
              <p className="text-3xl font-bold text-primary">{data?.avgSkillScore || 0}</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card text-center">
              <p className="text-sm text-muted-foreground mb-2">Avg Will Score</p>
              <p className="text-3xl font-bold text-accent">{data?.avgWillScore || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
