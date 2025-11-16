import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Link as LinkIcon, Copy, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Chapter {
  id: string;
  name: string;
  slug: string;
  chapter_type: "regular" | "yuva" | "thalir";
  parent_chapter_id?: string | null;
  description: string | null;
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  display_order: number;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  welcome_message?: string | null;
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
    parent_chapter_id: undefined as string | undefined,
    description: "",
    location: "",
    contact_email: "",
    contact_phone: "",
    is_active: true,
    display_order: 0,
    logo_url: "",
    primary_color: "",
    secondary_color: "",
    welcome_message: ""
  });

  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    try {
      const { data, error } = await supabase
        .from("chapters" as any)
        .select("*")
        .order("parent_chapter_id nulls first, display_order");

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

  const openAddDialog = (parentChapterId?: string) => {
    setEditingChapter(null);
    setFormData({
      name: "",
      slug: "",
      chapter_type: "regular",
      parent_chapter_id: parentChapterId,
      description: "",
      location: "",
      contact_email: "",
      contact_phone: "",
      is_active: true,
      display_order: chapters.length,
      logo_url: "",
      primary_color: "",
      secondary_color: "",
      welcome_message: ""
    });
    setDialogOpen(true);
  };

  const openEditDialog = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setFormData({
      name: chapter.name,
      slug: chapter.slug,
      chapter_type: chapter.chapter_type,
      parent_chapter_id: chapter.parent_chapter_id || undefined,
      description: chapter.description || "",
      location: chapter.location || "",
      contact_email: chapter.contact_email || "",
      contact_phone: chapter.contact_phone || "",
      is_active: chapter.is_active,
      display_order: chapter.display_order,
      logo_url: chapter.logo_url || "",
      primary_color: chapter.primary_color || "",
      secondary_color: chapter.secondary_color || "",
      welcome_message: chapter.welcome_message || ""
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
        toast({
          title: "Success",
          description: "Chapter updated successfully"
        });
      } else {
        const { error } = await supabase
          .from("chapters" as any)
          .insert([formData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Chapter created successfully"
        });
      }

      setDialogOpen(false);
      loadChapters();
    } catch (error) {
      console.error("Error saving chapter:", error);
      toast({
        title: "Error",
        description: "Failed to save chapter",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this chapter? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("chapters" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Chapter deleted successfully"
      });
      loadChapters();
    } catch (error) {
      console.error("Error deleting chapter:", error);
      toast({
        title: "Error",
        description: "Failed to delete chapter",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("chapters" as any)
        .update({ is_active: !currentState })
        .eq("id", id);

      if (error) throw error;
      loadChapters();
    } catch (error) {
      console.error("Error toggling chapter status:", error);
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

  const getParentChapters = () => {
    return chapters.filter(c => !c.parent_chapter_id);
  };

  const getChildChapters = (parentId: string) => {
    return chapters.filter(c => c.parent_chapter_id === parentId);
  };

  const renderChapterCard = (chapter: Chapter, level: number = 0) => (
    <Card key={chapter.id} className={`${level > 0 ? 'ml-8 border-l-4 border-primary/30' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              {level > 0 && <span className="text-muted-foreground">↳</span>}
              {chapter.name}
              <Badge className={`${getChapterTypeColor(chapter.chapter_type)} text-white`}>
                {chapter.chapter_type}
              </Badge>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={chapter.is_active}
              onCheckedChange={() => toggleActive(chapter.id, chapter.is_active)}
            />
            <span className="text-sm text-muted-foreground">
              {chapter.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Slug:</span> {chapter.slug}
          </div>
          <div>
            <span className="font-medium">Location:</span> {chapter.location || "—"}
          </div>
          <div>
            <span className="font-medium">Contact:</span> {chapter.contact_email || "—"}
          </div>
          <div>
            <span className="font-medium">Phone:</span> {chapter.contact_phone || "—"}
          </div>
        </div>

        {chapter.description && (
          <p className="text-sm text-muted-foreground">{chapter.description}</p>
        )}

        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
          <LinkIcon className="h-4 w-4" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Assessment URL:</p>
            <code className="text-xs">{getAssessmentUrl(chapter.slug)}</code>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(getAssessmentUrl(chapter.slug));
              toast({
                title: "Copied",
                description: "URL copied to clipboard"
              });
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2 justify-end">
          {!chapter.parent_chapter_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAddDialog(chapter.id)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Sub-Chapter
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEditDialog(chapter)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(chapter.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div>Loading chapters...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Chapter Management</h2>
          <p className="text-muted-foreground">Create and manage parent chapters and sub-chapters</p>
        </div>
        <Button onClick={() => openAddDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Parent Chapter
        </Button>
      </div>

      <div className="space-y-6">
        {getParentChapters().map((parentChapter) => (
          <div key={parentChapter.id} className="space-y-4">
            {renderChapterCard(parentChapter, 0)}
            {getChildChapters(parentChapter.id).map((childChapter) =>
              renderChapterCard(childChapter, 1)
            )}
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChapter ? "Edit Chapter" : "Add Chapter"}
            </DialogTitle>
            <DialogDescription>
              {editingChapter 
                ? "Update the chapter information below." 
                : "Fill in the details to create a new chapter."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Chapter Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Chennai YI or Chennai Yuva North"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g., chennai-yi or chennai-yuva-north"
                />
              </div>
            </div>

            {!editingChapter && (
              <div className="space-y-2">
                <Label htmlFor="parent">Parent Chapter (Optional)</Label>
                <Select
                  value={formData.parent_chapter_id || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, parent_chapter_id: value === "none" ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None - This is a parent chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - This is a parent chapter</SelectItem>
                    {getParentChapters().map((chapter) => (
                      <SelectItem key={chapter.id} value={chapter.id}>
                        {chapter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="type">Chapter Type *</Label>
              <Select
                value={formData.chapter_type}
                onValueChange={(value: "regular" | "yuva" | "thalir") =>
                  setFormData({ ...formData, chapter_type: value })
                }
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Chapter description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Chennai, Tamil Nadu"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="contact@chapter.org"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <Input
                  id="phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="+91 1234567890"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold">Branding & Customization</h3>
              
              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo URL</Label>
                <Input
                  id="logo_url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <Input
                    id="primary_color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    placeholder="#3B82F6"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Secondary Color</Label>
                  <Input
                    id="secondary_color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    placeholder="#10B981"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcome_message">Welcome Message</Label>
                <Textarea
                  id="welcome_message"
                  value={formData.welcome_message}
                  onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
                  placeholder="Welcome! We're excited to help you discover your leadership potential..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingChapter ? "Update Chapter" : "Create Chapter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminChapters;
