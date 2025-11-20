import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface Note {
  id: string;
  note_text: string;
  created_by: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
}

interface CandidateNotesProps {
  assessmentId: string;
  candidateName: string;
}

export const CandidateNotes = ({ assessmentId, candidateName }: CandidateNotesProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNoteText, setNewNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      loadNotes();
      getCurrentUser();
    }
  }, [open, assessmentId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("candidate_notes")
        .select("*")
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error loading notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) {
      toast.error("Note cannot be empty");
      return;
    }

    if (newNoteText.length > 2000) {
      toast.error("Note must be less than 2000 characters");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("candidate_notes")
        .insert({
          assessment_id: assessmentId,
          note_text: newNoteText.trim(),
          created_by: user.id,
          created_by_email: user.email || "Unknown",
        });

      if (error) throw error;

      toast.success("Note added successfully");
      setNewNoteText("");
      await loadNotes();
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;

    try {
      const { error } = await supabase
        .from("candidate_notes")
        .delete()
        .eq("id", deleteNoteId);

      if (error) throw error;

      toast.success("Note deleted");
      setDeleteNoteId(null);
      await loadNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Notes
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notes for {candidateName}</DialogTitle>
            <DialogDescription>
              Private admin notes visible only to other administrators
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add new note */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add New Note</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Enter your note here (max 2000 characters)..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  className="resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {newNoteText.length}/2000 characters
                  </span>
                  <Button
                    onClick={handleAddNote}
                    disabled={saving || !newNoteText.trim()}
                    size="sm"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      "Add Note"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Existing notes */}
            <div className="space-y-3">
              <h3 className="font-semibold">Previous Notes ({notes.length})</h3>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : notes.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No notes yet. Add the first note above.
                  </CardContent>
                </Card>
              ) : (
                notes.map((note) => (
                  <Card key={note.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium">{note.created_by_email}</span>
                            <span>•</span>
                            <span>{format(new Date(note.created_at), "MMM dd, yyyy 'at' h:mm a")}</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {note.note_text}
                          </p>
                        </div>
                        {currentUserId === note.created_by && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteNoteId(note.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={() => setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this note. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
