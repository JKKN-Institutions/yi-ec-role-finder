import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Eye, Filter, RefreshCw, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CandidateTagManager } from "@/components/admin/CandidateTagManager";

interface Candidate {
  id: string;
  user_name: string;
  user_email: string;
  status: string;
  review_status: string;
  is_shortlisted: boolean;
  created_at: string;
  completed_at: string | null;
  recommended_role?: string;
  quadrant?: string;
}

const AdminCandidates = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewFilter, setReviewFilter] = useState<string>("all");
  const [reanalyzing, setReanalyzing] = useState<string | null>(null);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const { data: assessments, error } = await supabase
        .from("assessments")
        .select(`
          *,
          assessment_results(recommended_role, quadrant)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedCandidates = assessments?.map((assessment: any) => ({
        id: assessment.id,
        user_name: assessment.user_name,
        user_email: assessment.user_email,
        status: assessment.status,
        review_status: assessment.review_status,
        is_shortlisted: assessment.is_shortlisted,
        created_at: assessment.created_at,
        completed_at: assessment.completed_at,
        recommended_role: assessment.assessment_results?.[0]?.recommended_role,
        quadrant: assessment.assessment_results?.[0]?.quadrant,
      })) || [];

      setCandidates(formattedCandidates);
    } catch (error) {
      console.error("Error loading candidates:", error);
    } finally {
      setLoading(false);
    }
  };

  const reanalyzeAssessment = async (assessmentId: string) => {
    setReanalyzing(assessmentId);
    try {
      const { error } = await supabase.functions.invoke("analyze-assessment", {
        body: { assessmentId },
      });

      if (error) throw error;

      // Reload candidates to get updated scores
      await loadCandidates();
      
      const candidate = candidates.find(c => c.id === assessmentId);
      if (candidate) {
        // Show toast with link to comparison page
        console.log(`Re-analyzed ${candidate.user_name}`);
      }
    } catch (error: any) {
      console.error("Error re-analyzing:", error);
    } finally {
      setReanalyzing(null);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getReviewBadgeVariant = (reviewStatus: string) => {
    switch (reviewStatus) {
      case "reviewed":
        return "default";
      case "pending":
        return "secondary";
      case "flagged":
        return "destructive";
      default:
        return "outline";
    }
  };

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      candidate.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || candidate.status === statusFilter;
    const matchesReview = reviewFilter === "all" || candidate.review_status === reviewFilter;
    return matchesSearch && matchesStatus && matchesReview;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Candidates</h1>
          <p className="text-muted-foreground">View and manage all assessment candidates</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/admin/score-comparison")} variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            Score Comparison
          </Button>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {filteredCandidates.length} Total
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reviewFilter} onValueChange={setReviewFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by review" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reviews</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Recommended Role</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No candidates found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCandidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {candidate.user_name}
                        {candidate.is_shortlisted && (
                          <Badge variant="default" className="text-xs">Shortlisted</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{candidate.user_email}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(candidate.status)}>
                        {candidate.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getReviewBadgeVariant(candidate.review_status)}>
                        {candidate.review_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {candidate.recommended_role || (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <CandidateTagManager 
                        assessmentId={candidate.id}
                        onTagsChange={loadCandidates}
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(candidate.created_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {candidate.status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reanalyzeAssessment(candidate.id)}
                            disabled={reanalyzing === candidate.id}
                          >
                            {reanalyzing === candidate.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Re-analyze
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/candidate/${candidate.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCandidates;
