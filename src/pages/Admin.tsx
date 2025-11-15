import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, Star } from "lucide-react";

interface Assessment {
  id: string;
  user_name: string;
  user_email: string;
  status: string;
  review_status: string;
  is_shortlisted: boolean;
  admin_notes: string | null;
  created_at: string;
  completed_at: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      const { data: isAdminData } = await supabase.rpc('is_admin_user', {
        _user_id: session.user.id,
      });

      if (!isAdminData) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      loadAssessments();
    };

    checkAdmin();
  }, [navigate]);

  const loadAssessments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("assessments")
      .select("*")
      .order("created_at", { ascending: false });

    setAssessments(data || []);
    setLoading(false);
  };

  const updateReviewStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("assessments")
      .update({ review_status: status })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated");
      loadAssessments();
    }
  };

  const toggleShortlist = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("assessments")
      .update({ 
        is_shortlisted: !currentStatus,
        review_status: !currentStatus ? "shortlisted" : "reviewed"
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update shortlist");
    } else {
      toast.success(!currentStatus ? "Added to shortlist" : "Removed from shortlist");
      loadAssessments();
    }
  };

  const saveNotes = async (id: string) => {
    const { error } = await supabase
      .from("assessments")
      .update({ admin_notes: noteText })
      .eq("id", id);

    if (error) {
      toast.error("Failed to save notes");
    } else {
      toast.success("Notes saved");
      setEditingNotes(null);
      loadAssessments();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const stats = {
    total: assessments.length,
    completed: assessments.filter((a) => a.status === "completed").length,
    shortlisted: assessments.filter((a) => a.is_shortlisted).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-2">Total Assessments</div>
            <div className="text-3xl font-bold">{stats.total}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-2">Completed</div>
            <div className="text-3xl font-bold">{stats.completed}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-2">Shortlisted</div>
            <div className="text-3xl font-bold text-primary">{stats.shortlisted}</div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">All Assessments</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.map((assessment) => (
                <TableRow key={assessment.id}>
                  <TableCell className="font-medium">{assessment.user_name}</TableCell>
                  <TableCell>{assessment.user_email}</TableCell>
                  <TableCell>
                    <Badge variant={assessment.status === "completed" ? "default" : "secondary"}>
                      {assessment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={assessment.review_status}
                      onValueChange={(value) => updateReviewStatus(assessment.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="shortlisted">Shortlisted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant={assessment.is_shortlisted ? "default" : "outline"}
                        onClick={() => toggleShortlist(assessment.id, assessment.is_shortlisted)}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                      {assessment.status === "completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/results/${assessment.id}`, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};

export default Admin;