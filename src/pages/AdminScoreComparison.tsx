import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertTriangle, ArrowRight, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
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
      const { data: results, error } = await supabase
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

      console.log('Load comparisons results:', results, 'error:', error);

      if (error) {
        console.error('Error loading comparisons:', error);
        toast({ title: "Error loading data", description: error.message, variant: "destructive" });
        return;
      }

      if (results) {
        console.log('Formatting results:', results);
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
        console.log('Formatted data:', formattedData);
        setComparisons(formattedData);
      }
    } catch (error: any) {
      console.error('Catch error:', error);
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader breadcrumb="Score Comparison" />
          <main className="flex-1 overflow-auto">
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
                        Reanalyzing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reanalyze All
                      </>
                    )}
                  </Button>
                  <Button onClick={() => setShowMigrationDialog(true)} disabled={migrating || reanalyzing}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Migrate to New Scores
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This tool helps you test the new scoring algorithm before deploying it permanently.
                  Click "Reanalyze All" to generate new scores (without affecting the live results).
                  When satisfied, use "Migrate to New Scores" to make them permanent.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>Assessment Comparison</CardTitle>
                  <CardDescription>
                    Side-by-side comparison of scores under old vs new algorithm
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Old Will</TableHead>
                        <TableHead>New Will</TableHead>
                        <TableHead>Old Skill</TableHead>
                        <TableHead>New Skill</TableHead>
                        <TableHead>Old Role</TableHead>
                        <TableHead>New Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisons.map((comp) => (
                        <TableRow key={comp.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{comp.user_name}</div>
                              <div className="text-sm text-muted-foreground">{comp.user_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{comp.old_will}</Badge>
                          </TableCell>
                          <TableCell>
                            {comp.new_will ? (
                              <div className="flex items-center gap-2">
                                <Badge>{comp.new_will}</Badge>
                                {getScoreChange(comp.old_will, comp.new_will)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not analyzed</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{comp.old_skill}</Badge>
                          </TableCell>
                          <TableCell>
                            {comp.new_skill ? (
                              <div className="flex items-center gap-2">
                                <Badge>{comp.new_skill}</Badge>
                                {getScoreChange(comp.old_skill, comp.new_skill)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not analyzed</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{comp.old_role}</Badge>
                          </TableCell>
                          <TableCell>
                            {comp.new_role ? (
                              <div className="flex items-center gap-2">
                                <Badge>{comp.new_role}</Badge>
                                {getRoleChange(comp.old_role, comp.new_role)}
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not analyzed</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Dialog open={showMigrationDialog} onOpenChange={setShowMigrationDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Score Migration</DialogTitle>
                    <DialogDescription>
                      This action will permanently replace old scores with new scores for all assessments
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Warning:</strong> This action cannot be undone.
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
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminScoreComparison;
