import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Chapter {
  id: string;
  name: string;
  slug: string;
  chapter_type: "regular" | "yuva" | "thalir";
  description: string | null;
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  display_order: number;
}

interface SuperAdminChaptersProps {
  onUpdate?: () => void;
}

const SuperAdminChapters = ({ onUpdate }: SuperAdminChaptersProps) => {
  const { toast } = useToast();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    chapter_type: "regular" as "regular" | "yuva" | "thalir",
    description: "",
    location: "",
    contact_email: "",
    contact_phone: "",
    is_active: true,
    display_order: 0
  });

  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    try {
      const { data, error } = await supabase
        .from("chapters" as any)
        .select("*")
        .order("display_order");

      if (error) throw error;
      setChapters((data as any) || []);
      onUpdate?.();
    } catch (error) {
      console.error("Error loading chapters:", error);
      toast({
        title: "Error",
        description: "Failed to load chapters",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name)
    });
  };

  const openAddDialog = () => {
    setEditingChapter(null);
    setFormData({
      name: "",
      slug: "",
      chapter_type: "regular",
      description: "",
      location: "",
      contact_email: "",
      contact_phone: "",
      is_active: true,
      display_order: chapters.length
    });
    setDialogOpen(true);
  };

  const openEditDialog = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setFormData({
      name: chapter.name,
      slug: chapter.slug,
      chapter_type: chapter.chapter_type,
      description: chapter.description || "",
      location: chapter.location || "",
      contact_email: chapter.contact_email || "",
      contact_phone: chapter.contact_phone || "",
      is_active: chapter.is_active,
      display_order: chapter.display_order
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingChapter) {
        const { error } = await supabase
          .from("chapters" as any)
          .update(formData)
          .eq("id", editingChapter.id);

        if (error) throw error;
        toast({ title: "Success", description: "Chapter updated successfully" });
      } else {
        const { error } = await supabase
          .from("chapters" as any)
          .insert(formData);

        if (error) throw error;
        toast({ title: "Success", description: "Chapter created successfully" });
      }

      setDialogOpen(false);
      loadChapters();
    } catch (error: any) {
      console.error("Error saving chapter:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save chapter",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this chapter? All associated data will be lost.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("chapters" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Chapter deleted successfully" });
      loadChapters();
    } catch (error: any) {
      console.error("Error deleting chapter:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete chapter",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (chapter: Chapter) => {
    try {
      const { error } = await supabase
        .from("chapters" as any)
        .update({ is_active: !chapter.is_active })
        .eq("id", chapter.id);

      if (error) throw error;
      toast({
        title: "Success",
        description: `Chapter ${!chapter.is_active ? "activated" : "deactivated"}`
      });
      loadChapters();
    } catch (error) {
      console.error("Error toggling chapter:", error);
      toast({
        title: "Error",
        description: "Failed to update chapter status",
        variant: "destructive"
      });
    }
  };

  const getChapterTypeColor = (type: string) => {
    switch (type) {
      case "regular": return "bg-blue-500";
      case "yuva": return "bg-green-500";
      case "thalir": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const getAssessmentUrl = (slug: string) => {
    return `${window.location.origin}/chapter/${slug}`;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Chapter Management</h2>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Chapter
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {chapters.map((chapter) => (
          <Card key={chapter.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{chapter.name}</CardTitle>
                  <CardDescription className="mt-1">
                    <Badge className={getChapterTypeColor(chapter.chapter_type)}>
                      {chapter.chapter_type}
                    </Badge>
                  </CardDescription>
                </div>
                <Switch
                  checked={chapter.is_active}
                  onCheckedChange={() => toggleActive(chapter)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {chapter.location && (
                <p className="text-sm text-muted-foreground">{chapter.location}</p>
              )}
              {chapter.description && (
                <p className="text-sm">{chapter.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <code className="bg-muted px-2 py-1 rounded text-xs">
                  /{chapter.slug}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(getAssessmentUrl(chapter.slug), "_blank")}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(chapter)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(chapter.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChapter ? "Edit Chapter" : "Create New Chapter"}
            </DialogTitle>
            <DialogDescription>
              Configure chapter details and assessment portal settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Chapter Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Chennai Yuva Chapter"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="chennai-yuva"
              />
              <p className="text-xs text-muted-foreground">
                Assessment URL: {window.location.origin}/chapter/{formData.slug}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chapter_type">Chapter Type *</Label>
              <Select
                value={formData.chapter_type}
                onValueChange={(value: any) => setFormData({ ...formData, chapter_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="yuva">Yuva</SelectItem>
                  <SelectItem value="thalir">Thalir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Chennai, Tamil Nadu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the chapter"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="admin@chapter.org"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Chapter is active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingChapter ? "Update" : "Create"} Chapter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminChapters;
