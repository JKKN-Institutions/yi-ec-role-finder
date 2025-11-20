import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Eye } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface NoteWithCandidate {
  id: string;
  note_text: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
  assessment: {
    id: string;
    user_name: string;
    user_email: string;
  };
}

export const NotesActivityFeed = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteWithCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentNotes();
  }, []);

  const loadRecentNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("candidate_notes")
        .select(`
          id,
          note_text,
          created_by_email,
          created_at,
          updated_at,
          assessment_id,
          assessments!inner (
            id,
            user_name,
            user_email
          )
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Transform the data to match our interface
      const formattedNotes = (data || []).map((note: any) => ({
        id: note.id,
        note_text: note.note_text,
        created_by_email: note.created_by_email,
        created_at: note.created_at,
        updated_at: note.updated_at,
        assessment: {
          id: note.assessments?.id || note.assessment_id,
          user_name: note.assessments?.user_name || "Unknown",
          user_email: note.assessments?.user_email || "Unknown",
        },
      }));

      setNotes(formattedNotes);
    } catch (error) {
      console.error("Error loading recent notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Recent Notes Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No notes yet. Add notes to candidates to see activity here.
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="border-l-2 border-primary/30 pl-4 py-2 hover:border-primary/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {note.assessment.user_name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {note.assessment.user_email}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {truncateText(note.note_text)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>By {note.created_by_email}</span>
                      <span>•</span>
                      <span>{format(new Date(note.created_at), "MMM dd, h:mm a")}</span>
                      {note.updated_at !== note.created_at && (
                        <>
                          <span>•</span>
                          <Badge variant="secondary" className="text-xs">
                            Edited
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/admin/candidate/${note.assessment.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
