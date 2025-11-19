import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Tag, X } from "lucide-react";
import { toast } from "sonner";

interface CandidateTag {
  id: string;
  name: string;
  color: string;
  category: string;
}

interface AssessmentTag {
  tag_id: string;
  candidate_tags: CandidateTag;
}

interface CandidateTagManagerProps {
  assessmentId: string;
  onTagsChange?: () => void;
}

export function CandidateTagManager({ assessmentId, onTagsChange }: CandidateTagManagerProps) {
  const [allTags, setAllTags] = useState<CandidateTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");
  const [newTagCategory, setNewTagCategory] = useState("general");

  useEffect(() => {
    loadTags();
    loadAssessmentTags();
  }, [assessmentId]);

  const loadTags = async () => {
    const { data } = await supabase
      .from("candidate_tags")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (data) setAllTags(data);
  };

  const loadAssessmentTags = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("assessment_tags")
      .select("tag_id, candidate_tags(*)")
      .eq("assessment_id", assessmentId);

    if (data) {
      setSelectedTags(data.map((at: AssessmentTag) => at.tag_id));
    }
    setLoading(false);
  };

  const createTag = async () => {
    if (!newTagName.trim()) {
      toast.error("Tag name is required");
      return;
    }

    const { data, error } = await supabase
      .from("candidate_tags")
      .insert({
        name: newTagName.trim(),
        color: newTagColor,
        category: newTagCategory,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create tag");
      return;
    }

    if (data) {
      setAllTags([...allTags, data]);
      toast.success("Tag created");
      setNewTagName("");
      setDialogOpen(false);
    }
  };

  const toggleTag = async (tagId: string) => {
    const isSelected = selectedTags.includes(tagId);

    if (isSelected) {
      // Remove tag
      const { error } = await supabase
        .from("assessment_tags")
        .delete()
        .eq("assessment_id", assessmentId)
        .eq("tag_id", tagId);

      if (error) {
        toast.error("Failed to remove tag");
        return;
      }

      setSelectedTags(selectedTags.filter((id) => id !== tagId));
      toast.success("Tag removed");
    } else {
      // Add tag
      const { error } = await supabase
        .from("assessment_tags")
        .insert({
          assessment_id: assessmentId,
          tag_id: tagId,
        });

      if (error) {
        toast.error("Failed to add tag");
        return;
      }

      setSelectedTags([...selectedTags, tagId]);
      toast.success("Tag added");
    }

    onTagsChange?.();
  };

  const getSelectedTagsDisplay = () => {
    return allTags
      .filter((tag) => selectedTags.includes(tag.id))
      .map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="gap-1 cursor-pointer hover:opacity-80"
          style={{ backgroundColor: tag.color + "20", color: tag.color, borderColor: tag.color }}
          onClick={() => toggleTag(tag.id)}
        >
          {tag.name}
          <X className="h-3 w-3" />
        </Badge>
      ));
  };

  const categoryColors = {
    favorite: "#F59E0B",
    hiring_round: "#10B981",
    position: "#EF4444",
    vertical: "#8B5CF6",
    general: "#3B82F6",
  };

  if (loading) {
    return <div className="skeleton h-8 w-32" />;
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {getSelectedTagsDisplay()}
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <Tag className="h-3 w-3" />
            Add Tag
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Create New Tag Section */}
            <div className="p-4 border rounded-lg space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Tag
              </h3>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="tag-name">Tag Name</Label>
                  <Input
                    id="tag-name"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g., Top Priority"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tag-category">Category</Label>
                  <Select value={newTagCategory} onValueChange={setNewTagCategory}>
                    <SelectTrigger id="tag-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="favorite">Favorite</SelectItem>
                      <SelectItem value="hiring_round">Hiring Round</SelectItem>
                      <SelectItem value="position">Position</SelectItem>
                      <SelectItem value="vertical">Vertical</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tag-color">Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tag-color"
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-20"
                    />
                    <Input
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                <Button onClick={createTag} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tag
                </Button>
              </div>
            </div>

            {/* Existing Tags by Category */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Select Tags</h3>
              {["favorite", "hiring_round", "position", "vertical", "general"].map((category) => {
                const categoryTags = allTags.filter((tag) => tag.category === category);
                if (categoryTags.length === 0) return null;

                return (
                  <div key={category} className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">
                      {category.replace("_", " ")}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {categoryTags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                          className="cursor-pointer hover:opacity-80"
                          style={
                            selectedTags.includes(tag.id)
                              ? { backgroundColor: tag.color, borderColor: tag.color }
                              : { borderColor: tag.color, color: tag.color }
                          }
                          onClick={() => toggleTag(tag.id)}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
