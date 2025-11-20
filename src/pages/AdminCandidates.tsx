import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Eye, Filter, RefreshCw, TrendingUp, CheckSquare, Square, Trash2, Download, Tags } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CandidateTagManager } from "@/components/admin/CandidateTagManager";
import { CandidateNotes } from "@/components/admin/CandidateNotes";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [searchParams] = useSearchParams();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewFilter, setReviewFilter] = useState<string>("all");
  const [quadrantFilter, setQuadrantFilter] = useState<string>("all");
  const [reanalyzing, setReanalyzing] = useState<string | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [selectedStatusChange, setSelectedStatusChange] = useState<string>("");
  const [bulkReanalyzing, setBulkReanalyzing] = useState(false);

  useEffect(() => {
    // Apply URL params on mount
    const status = searchParams.get("status");
    const review = searchParams.get("review");
    const quadrant = searchParams.get("quadrant");
    const shortlisted = searchParams.get("shortlisted");
    
    if (status) setStatusFilter(status);
    if (review) setReviewFilter(review);
    if (quadrant) setQuadrantFilter(quadrant);
    if (shortlisted === "true") setReviewFilter("shortlisted");
    
    loadCandidates();
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from("candidate_tags")
        .select("id, name, color")
        .order("name");

      if (error) throw error;
      setAvailableTags(data || []);
    } catch (error) {
      console.error("Error loading tags:", error);
    }
  };

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

    const matchesReview = 
      reviewFilter === "all" 
        ? true 
        : reviewFilter === "shortlisted"
        ? candidate.is_shortlisted
        : candidate.review_status === reviewFilter;

    const matchesQuadrant = quadrantFilter === "all" || candidate.quadrant === quadrantFilter;

    return matchesSearch && matchesStatus && matchesReview && matchesQuadrant;
  });

  const toggleSelectAll = () => {
    if (selectedCandidates.size === filteredCandidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(filteredCandidates.map(c => c.id)));
    }
  };

  const toggleSelectCandidate = (candidateId: string) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId);
    } else {
      newSelected.add(candidateId);
    }
    setSelectedCandidates(newSelected);
  };

  const handleBulkShortlist = async () => {
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from("assessments")
        .update({ is_shortlisted: true, review_status: "reviewed" })
        .in("id", Array.from(selectedCandidates));

      if (error) throw error;

      toast.success(`${selectedCandidates.size} candidates shortlisted`);
      setSelectedCandidates(new Set());
      await loadCandidates();
    } catch (error) {
      console.error("Error bulk shortlisting:", error);
      toast.error("Failed to shortlist candidates");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkReject = async () => {
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from("assessments")
        .update({ review_status: "rejected", is_shortlisted: false })
        .in("id", Array.from(selectedCandidates));

      if (error) throw error;

      toast.success(`${selectedCandidates.size} candidates rejected`);
      setSelectedCandidates(new Set());
      await loadCandidates();
    } catch (error) {
      console.error("Error bulk rejecting:", error);
      toast.error("Failed to reject candidates");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkActionLoading(true);
    setShowDeleteDialog(false);
    try {
      const selectedIds = Array.from(selectedCandidates);
      
      // Delete related records first (cascade)
      await supabase.from("adaptation_analytics").delete().in("assessment_id", selectedIds);
      await supabase.from("assessment_tags").delete().in("assessment_id", selectedIds);
      await supabase.from("assessment_responses").delete().in("assessment_id", selectedIds);
      await supabase.from("assessment_results").delete().in("assessment_id", selectedIds);
      
      // Finally delete assessments
      const { error } = await supabase
        .from("assessments")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;

      toast.success(`${selectedCandidates.size} candidates deleted permanently`);
      setSelectedCandidates(new Set());
      await loadCandidates();
    } catch (error) {
      console.error("Error bulk deleting:", error);
      toast.error("Failed to delete candidates");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkTagAssignment = async () => {
    if (!selectedTagId) {
      toast.error("Please select a tag first");
      return;
    }
    
    setBulkActionLoading(true);
    try {
      const selectedIds = Array.from(selectedCandidates);
      
      // Insert tag associations (ignore duplicates)
      const tagAssignments = selectedIds.map(assessmentId => ({
        assessment_id: assessmentId,
        tag_id: selectedTagId,
      }));

      const { error } = await supabase
        .from("assessment_tags")
        .upsert(tagAssignments, { onConflict: "assessment_id,tag_id", ignoreDuplicates: true });

      if (error) throw error;

      const tagName = availableTags.find(t => t.id === selectedTagId)?.name;
      toast.success(`Tag "${tagName}" added to ${selectedCandidates.size} candidates`);
      setSelectedCandidates(new Set());
      setSelectedTagId("");
      await loadCandidates();
    } catch (error) {
      console.error("Error bulk tag assignment:", error);
      toast.error("Failed to assign tags");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkStatusChange = async () => {
    if (!selectedStatusChange) {
      toast.error("Please select a status first");
      return;
    }
    
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from("assessments")
        .update({ review_status: selectedStatusChange })
        .in("id", Array.from(selectedCandidates));

      if (error) throw error;

      toast.success(`${selectedCandidates.size} candidates marked as ${selectedStatusChange}`);
      setSelectedCandidates(new Set());
      setSelectedStatusChange("");
      await loadCandidates();
    } catch (error) {
      console.error("Error bulk status change:", error);
      toast.error("Failed to change status");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkReanalyze = async () => {
    setBulkReanalyzing(true);
    const selectedIds = Array.from(selectedCandidates);
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < selectedIds.length; i++) {
        const assessmentId = selectedIds[i];
        try {
          const { error } = await supabase.functions.invoke("analyze-assessment", {
            body: { assessmentId },
          });

          if (error) throw error;
          successCount++;
          
          // Update toast with progress
          toast.loading(`Re-analyzing: ${i + 1}/${selectedIds.length}`, { id: "bulk-reanalyze" });
        } catch (error) {
          console.error(`Error re-analyzing ${assessmentId}:`, error);
          failCount++;
        }
      }

      toast.dismiss("bulk-reanalyze");
      
      if (successCount > 0) {
        toast.success(`Re-analyzed ${successCount} candidate${successCount > 1 ? 's' : ''}`);
      }
      if (failCount > 0) {
        toast.error(`Failed to re-analyze ${failCount} candidate${failCount > 1 ? 's' : ''}`);
      }

      setSelectedCandidates(new Set());
      await loadCandidates();
    } catch (error) {
      console.error("Error bulk re-analyzing:", error);
      toast.error("Failed to re-analyze candidates");
    } finally {
      setBulkReanalyzing(false);
    }
  };

  const handleBulkExport = () => {
    const selectedIds = Array.from(selectedCandidates);
    const exportData = candidates
      .filter(c => selectedIds.includes(c.id))
      .map(c => ({
        Name: c.user_name,
        Email: c.user_email,
        Status: c.status,
        "Review Status": c.review_status,
        "Recommended Role": c.recommended_role || "N/A",
        Quadrant: c.quadrant || "N/A",
        Shortlisted: c.is_shortlisted ? "Yes" : "No",
        "Submitted Date": c.created_at ? format(new Date(c.created_at), "MMM dd, yyyy") : "N/A",
      }));

    // Convert to CSV
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(","),
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escape commas and quotes
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(",")
      ),
    ].join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidates_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success(`Exported ${selectedCandidates.size} candidates to CSV`);
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={quadrantFilter} onValueChange={setQuadrantFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by quadrant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quadrants</SelectItem>
                <SelectItem value="leader">Leader</SelectItem>
                <SelectItem value="enthusiast">Enthusiast</SelectItem>
                <SelectItem value="specialist">Specialist</SelectItem>
                <SelectItem value="developing">Developing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedCandidates.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                <span className="font-semibold">{selectedCandidates.size} selected</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Row 1: Primary Actions */}
                <Button 
                  onClick={handleBulkShortlist} 
                  disabled={bulkActionLoading || bulkReanalyzing}
                  size="sm"
                  className="w-full"
                >
                  {bulkActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Shortlist
                </Button>
                <Button 
                  onClick={handleBulkReject} 
                  disabled={bulkActionLoading || bulkReanalyzing}
                  variant="destructive"
                  size="sm"
                  className="w-full"
                >
                  {bulkActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Reject
                </Button>
                <Button 
                  onClick={() => setShowDeleteDialog(true)} 
                  disabled={bulkActionLoading || bulkReanalyzing}
                  variant="destructive"
                  size="sm"
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>

                {/* Row 2: Tag Assignment */}
                <div className="flex gap-2 col-span-1 md:col-span-2">
                  <Select value={selectedTagId} onValueChange={setSelectedTagId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select tag..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTags.map(tag => (
                        <SelectItem key={tag.id} value={tag.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: tag.color }}
                            />
                            {tag.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleBulkTagAssignment}
                    disabled={bulkActionLoading || bulkReanalyzing || !selectedTagId}
                    size="sm"
                  >
                    <Tags className="h-4 w-4 mr-2" />
                    Add Tag
                  </Button>
                </div>

                {/* Row 3: Status Change */}
                <div className="flex gap-2 col-span-1 md:col-span-2">
                  <Select value={selectedStatusChange} onValueChange={setSelectedStatusChange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Change status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Mark as New</SelectItem>
                      <SelectItem value="pending_review">Mark as Pending Review</SelectItem>
                      <SelectItem value="reviewed">Mark as Reviewed</SelectItem>
                      <SelectItem value="rejected">Mark as Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleBulkStatusChange}
                    disabled={bulkActionLoading || bulkReanalyzing || !selectedStatusChange}
                    size="sm"
                  >
                    Change Status
                  </Button>
                </div>

                {/* Row 4: Additional Actions */}
                <Button 
                  onClick={handleBulkReanalyze}
                  disabled={bulkActionLoading || bulkReanalyzing}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {bulkReanalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Re-analyze
                </Button>
                <Button 
                  onClick={handleBulkExport}
                  disabled={bulkActionLoading || bulkReanalyzing}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button 
                  onClick={() => setSelectedCandidates(new Set())} 
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCandidates.size} Candidate{selectedCandidates.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected candidates and all their assessment data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedCandidates.size === filteredCandidates.length && filteredCandidates.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
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
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No candidates found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCandidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedCandidates.has(candidate.id)}
                        onCheckedChange={() => toggleSelectCandidate(candidate.id)}
                      />
                    </TableCell>
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
                        <CandidateNotes 
                          assessmentId={candidate.id}
                          candidateName={candidate.user_name}
                        />
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
