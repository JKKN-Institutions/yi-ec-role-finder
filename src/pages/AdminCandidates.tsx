import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Eye, Filter } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, formatAssessmentsForExport } from "@/lib/export";
import { Download } from "lucide-react";
import { useChapterContext } from "./Admin";

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
  const { chapterId, isSuperAdmin } = useChapterContext();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewFilter, setReviewFilter] = useState<string>("all");

  useEffect(() => {
    loadCandidates();

    // Set up realtime subscription
    const channel = supabase
      .channel('candidates-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assessments'
        },
        (payload) => {
          console.log('Assessment changed:', payload);
          loadCandidates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chapterId]);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("assessments" as any)
        .select(`
          *,
          assessment_results(recommended_role, quadrant)
        `);

      // Filter by chapter if not super admin viewing all
      if (!isSuperAdmin || (chapterId && chapterId !== "all")) {
        query = query.eq("chapter_id", chapterId);
      }

      const { data: assessments, error } = await query.order("created_at", { ascending: false });

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

  const handleExport = () => {
    const exportData = formatAssessmentsForExport(filteredCandidates);
    exportToCSV(exportData, `candidates-${chapterId}-${new Date().toISOString().split('T')[0]}`);
    toast({
      title: "Export Successful",
      description: "Candidate data has been exported to CSV"
    });
  };

  const handleShortlist = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("assessments")
        .update({ is_shortlisted: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const candidate = candidates.find(c => c.id === id);
        await (supabase as any).rpc("log_admin_action", {
          _admin_user_id: user.id,
          _admin_email: user.email,
          _action_type: "assessment_shortlisted",
          _target_type: "assessment",
          _target_id: id,
          _details: {
            candidate_name: candidate?.user_name,
            candidate_email: candidate?.user_email,
            shortlisted: !currentStatus
          }
        });
      }

      await loadCandidates();
      toast({
        title: "Success",
        description: `Candidate ${!currentStatus ? "shortlisted" : "removed from shortlist"}`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

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
        <div className="flex gap-2 items-center">
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
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
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                      {format(new Date(candidate.created_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/candidate/${candidate.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
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
