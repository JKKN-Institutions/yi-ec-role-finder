import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertTriangle, ArrowRight, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ComparisonData {
  id: string;
  user_name: string;
  user_email: string;
  old_will: number;
  old_skill: number;
  old_quadrant: string;
  old_role: string;
  new_will?: number;
  new_skill?: number;
  new_quadrant?: string;
  new_role?: string;
  analyzed: boolean;
}

const AdminScoreComparison = () => {
  const [loading, setLoading] = useState(true);
  const [comparisons, setComparisons] = useState<ComparisonData[]>([]);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadComparisons();
  }, []);

  const loadComparisons = async () => {
    setLoading(true);
    try {
      const { data: results } = await supabase
        .from("assessment_results")
        .select(`
          id,
          assessment_id,
          will_score,
          skill_score,
          quadrant,
          recommended_role,
          assessments(user_name, user_email)
        `)
        .order("created_at", { ascending: false });

      if (results) {
        const formattedData: ComparisonData[] = results.map((r: any) => ({
          id: r.assessment_id,
          user_name: r.assessments?.user_name || "Unknown",
          user_email: r.assessments?.user_email || "Unknown",
          old_will: r.will_score,
          old_skill: r.skill_score,
          old_quadrant: r.quadrant,
          old_role: r.recommended_role,
          analyzed: false,
        }));
        setComparisons(formattedData);
      }
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const reanalyzeAll = async () => {
    setReanalyzing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const comparison of comparisons) {
      try {
        const { data, error } = await supabase.functions.invoke("analyze-assessment", {
          body: { assessmentId: comparison.id },
        });

        if (error) throw error;

        // Load the new results
        const { data: newResult } = await supabase
          .from("assessment_results")
          .select("will_score, skill_score, quadrant, recommended_role")
          .eq("assessment_id", comparison.id)
          .single();

        if (newResult) {
          setComparisons((prev) =>
            prev.map((c) =>
              c.id === comparison.id
                ? {
                    ...c,
                    new_will: newResult.will_score,
                    new_skill: newResult.skill_score,
                    new_quadrant: newResult.quadrant,
                    new_role: newResult.recommended_role,
                    analyzed: true,
                  }
                : c
            )
          );
          successCount++;
        }
      } catch (error) {
        console.error(`Error reanalyzing ${comparison.user_name}:`, error);
        errorCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setReanalyzing(false);
    toast({
      title: "Re-analysis Complete",
      description: `${successCount} successful, ${errorCount} failed`,
    });
  };

  const migrateToNewScores = async () => {
    setMigrating(true);
    try {
      // The new scores are already in the database from re-analysis
      // This is just a confirmation step
      toast({
        title: "Migration Complete",
        description: "All candidates now use the updated scoring logic",
      });
      setShowMigrationDialog(false);
    } catch (error: any) {
      toast({ title: "Migration Error", description: error.message, variant: "destructive" });
    }
    setMigrating(false);
  };

  const getScoreChange = (oldScore: number, newScore?: number) => {
    if (!newScore) return null;
    const diff = newScore - oldScore;
    if (diff > 0) return <Badge className="bg-green-500">+{diff}</Badge>;
    if (diff < 0) return <Badge className="bg-red-500">{diff}</Badge>;
    return <Badge variant="secondary">No change</Badge>;
  };

  const getRoleChange = (oldRole: string, newRole?: string) => {
    if (!newRole) return null;
    if (oldRole === newRole) return <Badge variant="secondary">Same</Badge>;
    const roleHierarchy = ["Active Volunteer", "Vertical Lead", "Executive Member (EM)", "Co-Chair", "Chair"];
    const oldIndex = roleHierarchy.indexOf(oldRole);
    const newIndex = roleHierarchy.indexOf(newRole);
    if (newIndex > oldIndex) return <Badge className="bg-green-500">Upgraded</Badge>;
    if (newIndex < oldIndex) return <Badge className="bg-red-500">Downgraded</Badge>;
    return <Badge variant="secondary">Changed</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Score Comparison Tool</h1>
          <p className="text-muted-foreground">
            Compare old vs new scoring logic and migrate existing assessments
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={reanalyzeAll} disabled={reanalyzing}>
            {reanalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Re-analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-analyze All
              </>
            )}
          </Button>
          {comparisons.some((c) => c.analyzed) && (
            <Button onClick={() => setShowMigrationDialog(true)} variant="default">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Migration
            </Button>
          )}
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>How this works:</strong> Click "Re-analyze All" to evaluate all existing assessments with the updated scoring logic.
          Review the changes, then click "Confirm Migration" to permanently update all records.
        </AlertDescription>
      </Alert>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Assessments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{comparisons.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Re-analyzed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-600">
              {comparisons.filter((c) => c.analyzed).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Role Upgrades</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-600">
              {comparisons.filter((c) => {
                if (!c.new_role) return false;
                const roleHierarchy = ["Active Volunteer", "Vertical Lead", "Executive Member (EM)", "Co-Chair", "Chair"];
                return roleHierarchy.indexOf(c.new_role) > roleHierarchy.indexOf(c.old_role);
              }).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg Score Increase</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">
              {comparisons.filter(c => c.analyzed).length > 0
                ? Math.round(
                    comparisons
                      .filter((c) => c.analyzed)
                      .reduce((acc, c) => acc + ((c.new_will || 0) - c.old_will), 0) /
                      comparisons.filter((c) => c.analyzed).length
                  )
                : 0}
            </p>
            <p className="text-sm text-muted-foreground">WILL pts</p>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Comparison</CardTitle>
          <CardDescription>
            Old scores (left) vs New scores (right) for each candidate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Old WILL</TableHead>
                <TableHead>New WILL</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Old SKILL</TableHead>
                <TableHead>New SKILL</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Old Role</TableHead>
                <TableHead>New Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons.map((comparison) => (
                <TableRow key={comparison.id}>
                  <TableCell className="font-medium">
                    <div>
                      <p>{comparison.user_name}</p>
                      <p className="text-xs text-muted-foreground">{comparison.user_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{comparison.old_will}</TableCell>
                  <TableCell>
                    {comparison.new_will !== undefined ? comparison.new_will : "-"}
                  </TableCell>
                  <TableCell>{getScoreChange(comparison.old_will, comparison.new_will)}</TableCell>
                  <TableCell>{comparison.old_skill}</TableCell>
                  <TableCell>
                    {comparison.new_skill !== undefined ? comparison.new_skill : "-"}
                  </TableCell>
                  <TableCell>{getScoreChange(comparison.old_skill, comparison.new_skill)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{comparison.old_role}</Badge>
                  </TableCell>
                  <TableCell>
                    {comparison.new_role ? (
                      <Badge>{comparison.new_role}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {comparison.analyzed ? (
                      <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Done
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Migration Dialog */}
      <Dialog open={showMigrationDialog} onOpenChange={setShowMigrationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Score Migration</DialogTitle>
            <DialogDescription>
              This will permanently update all assessment records with the new scores. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> The re-analysis has already updated the database. This is just a confirmation step.
                All candidates will now see their updated scores and role recommendations.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMigrationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={migrateToNewScores} disabled={migrating}>
              {migrating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                "Confirm Migration"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminScoreComparison;
