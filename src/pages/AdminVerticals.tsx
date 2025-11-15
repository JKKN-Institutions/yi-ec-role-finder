import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Edit, Trash2, GripVertical, Download, Upload, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Vertical = {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  usage_count?: number;
};

const AdminVerticals = () => {
  const [loading, setLoading] = useState(true);
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<string>("display_order");
  const [reorderMode, setReorderMode] = useState(false);
  const [addingVertical, setAddingVertical] = useState(false);
  const [editingVertical, setEditingVertical] = useState<Vertical | null>(null);
  const [deletingVertical, setDeletingVertical] = useState<Vertical | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [selectedVerticals, setSelectedVerticals] = useState<string[]>([]);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [draggedItem, setDraggedItem] = useState<Vertical | null>(null);
  const [importingVerticals, setImportingVerticals] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [verticalsRes, responsesRes] = await Promise.all([
        supabase.from("verticals").select("*").order("display_order"),
        supabase.from("assessment_responses").select("*").eq("question_number", 1),
      ]);

      if (verticalsRes.error) throw verticalsRes.error;
      if (responsesRes.error) throw responsesRes.error;

      // Calculate usage count for each vertical
      const verticalUsage: { [key: string]: number } = {};
      (responsesRes.data || []).forEach((response) => {
        const data = response.response_data as any;
        [data.priority1, data.priority2, data.priority3].forEach((v) => {
          if (v) verticalUsage[v] = (verticalUsage[v] || 0) + 1;
        });
      });

      const verticalsWithUsage = (verticalsRes.data || []).map((v) => ({
        ...v,
        usage_count: verticalUsage[v.name] || 0,
      }));

      setVerticals(verticalsWithUsage);
      setResponses(responsesRes.data || []);
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const getSortedVerticals = () => {
    const sorted = [...verticals];
    if (sortBy === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "popularity") {
      sorted.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
    } else {
      sorted.sort((a, b) => a.display_order - b.display_order);
    }
    return sorted;
  };

  const addVertical = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const maxOrder = Math.max(...verticals.map((v) => v.display_order), 0);

    const { error } = await supabase.from("verticals").insert({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      display_order: parseInt(formData.get("display_order") as string) || maxOrder + 1,
      is_active: formData.get("is_active") === "on",
    });

    if (error) {
      toast({ title: "Error creating vertical", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vertical created successfully" });
      loadData();
      setAddingVertical(false);
    }
  };

  const updateVertical = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingVertical) return;

    const formData = new FormData(e.currentTarget);

    const { error } = await supabase
      .from("verticals")
      .update({
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        display_order: parseInt(formData.get("display_order") as string),
        is_active: formData.get("is_active") === "on",
      })
      .eq("id", editingVertical.id);

    if (error) {
      toast({ title: "Error updating vertical", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vertical updated successfully" });
      loadData();
      setEditingVertical(null);
    }
  };

  const deleteVertical = async () => {
    if (!deletingVertical) return;

    const { error } = await supabase
      .from("verticals")
      .update({ is_active: false })
      .eq("id", deletingVertical.id);

    if (error) {
      toast({ title: "Error deactivating vertical", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vertical deactivated successfully" });
      loadData();
      setDeletingVertical(null);
    }
  };

  const deleteAllVerticals = async () => {
    try {
      const { error } = await supabase
        .from("verticals")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all records

      if (error) throw error;

      toast({ title: "Success", description: "All verticals permanently deleted" });
      setDeletingAll(false);
      setSelectedVerticals([]);
      loadData();
    } catch (error: any) {
      toast({ title: "Error deleting verticals", description: error.message, variant: "destructive" });
    }
  };

  const deleteSelectedVerticals = async () => {
    try {
      const { error } = await supabase
        .from("verticals")
        .update({ is_active: false })
        .in("id", selectedVerticals);

      if (error) throw error;

      toast({ title: "Success", description: `${selectedVerticals.length} verticals deactivated successfully` });
      setDeletingSelected(false);
      setSelectedVerticals([]);
      loadData();
    } catch (error: any) {
      toast({ title: "Error deactivating verticals", description: error.message, variant: "destructive" });
    }
  };

  const toggleSelectAll = () => {
    if (selectedVerticals.length === sortedVerticals.length) {
      setSelectedVerticals([]);
    } else {
      setSelectedVerticals(sortedVerticals.map(v => v.id));
    }
  };

  const toggleSelectVertical = (id: string) => {
    setSelectedVerticals(prev => 
      prev.includes(id) ? prev.filter(vId => vId !== id) : [...prev, id]
    );
  };

  const handleDragStart = (vertical: Vertical) => {
    setDraggedItem(vertical);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetVertical: Vertical) => {
    if (!draggedItem || draggedItem.id === targetVertical.id) return;

    const sortedVerticals = getSortedVerticals();
    const draggedIndex = sortedVerticals.findIndex((v) => v.id === draggedItem.id);
    const targetIndex = sortedVerticals.findIndex((v) => v.id === targetVertical.id);

    const newOrder = [...sortedVerticals];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    // Update display_order for all affected verticals
    const updates = newOrder.map((v, idx) => ({
      id: v.id,
      display_order: idx + 1,
    }));

    try {
      for (const update of updates) {
        await supabase.from("verticals").update({ display_order: update.display_order }).eq("id", update.id);
      }
      toast({ title: "Order updated" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error updating order", description: error.message, variant: "destructive" });
    }

    setDraggedItem(null);
  };

  const exportVerticals = () => {
    const csvData = [
      ["Name", "Description", "Display Order", "Active"],
      ...verticals.map((v) => [v.name, v.description || "", v.display_order.toString(), v.is_active ? "Yes" : "No"]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "verticals-config.csv";
    a.click();
    toast({ title: "Verticals exported" });
  };

  const downloadTemplate = () => {
    const csv = [
      ["name", "description", "display_order", "is_active"],
      ["Membership Growth", "Focus on expanding membership base and engagement", "1", "true"],
      ["Community Service", "Organize and execute community service projects", "2", "true"],
      ["Professional Development", "Enhance skills and career growth opportunities", "3", "true"],
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "verticals-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Template downloaded", description: "Fill in the CSV with your verticals data" });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast({ title: "Invalid file type", description: "Please upload a CSV file", variant: "destructive" });
      return;
    }

    setImportFile(file);

    // Parse CSV file
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      
      if (lines.length < 2) {
        toast({ title: "Empty file", description: "CSV file has no data", variant: "destructive" });
        return;
      }

      // Parse header
      const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim().toLowerCase());
      
      // Validate headers
      const requiredHeaders = ["name", "description", "display_order", "is_active"];
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        toast({
          title: "Invalid CSV format",
          description: `Missing columns: ${missingHeaders.join(", ")}`,
          variant: "destructive",
        });
        return;
      }

      // Parse data rows
      const preview = lines.slice(1).map((line, index) => {
        const values = line.split(",").map((v) => v.replace(/"/g, "").trim());
        const row: any = {};
        
        headers.forEach((header, i) => {
          row[header] = values[i] || "";
        });

        return {
          rowNumber: index + 2,
          name: row.name,
          description: row.description,
          display_order: parseInt(row.display_order) || index + 1,
          is_active: row.is_active.toLowerCase() === "true",
          valid: row.name && row.description,
        };
      });

      setImportPreview(preview);
    };

    reader.readAsText(file);
  };

  const executeBulkImport = async () => {
    if (importPreview.length === 0) {
      toast({ title: "No data to import", variant: "destructive" });
      return;
    }

    const invalidRows = importPreview.filter((row) => !row.valid);
    if (invalidRows.length > 0) {
      toast({
        title: "Validation failed",
        description: `${invalidRows.length} rows have missing name or description`,
        variant: "destructive",
      });
      return;
    }

    try {
      const verticalsToInsert = importPreview.map((row) => ({
        name: row.name,
        description: row.description,
        display_order: row.display_order,
        is_active: row.is_active,
      }));

      const { error } = await supabase.from("verticals").insert(verticalsToInsert);

      if (error) throw error;

      toast({
        title: "Import successful",
        description: `${importPreview.length} verticals imported`,
      });

      setImportingVerticals(false);
      setImportFile(null);
      setImportPreview([]);
      loadData();
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getVerticalPopularity = () => {
    const popularity: { [key: string]: { p1: number; p2: number; p3: number } } = {};

    responses.forEach((response) => {
      const data = response.response_data as any;
      if (data.priority1) {
        if (!popularity[data.priority1]) popularity[data.priority1] = { p1: 0, p2: 0, p3: 0 };
        popularity[data.priority1].p1++;
      }
      if (data.priority2) {
        if (!popularity[data.priority2]) popularity[data.priority2] = { p1: 0, p2: 0, p3: 0 };
        popularity[data.priority2].p2++;
      }
      if (data.priority3) {
        if (!popularity[data.priority3]) popularity[data.priority3] = { p1: 0, p2: 0, p3: 0 };
        popularity[data.priority3].p3++;
      }
    });

    return Object.entries(popularity).map(([name, counts]) => ({
      name,
      Priority1: counts.p1,
      Priority2: counts.p2,
      Priority3: counts.p3,
      total: counts.p1 + counts.p2 + counts.p3,
    })).sort((a, b) => b.total - a.total);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sortedVerticals = getSortedVerticals();
  const popularityData = getVerticalPopularity();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Verticals Management</h1>
          <p className="text-muted-foreground">Manage organization departments and focus areas</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={addingVertical} onOpenChange={setAddingVertical}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Vertical
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Vertical</DialogTitle>
                <DialogDescription>Create a new organization vertical</DialogDescription>
              </DialogHeader>
              <form onSubmit={addVertical}>
                <div className="space-y-4">
                  <div>
                    <Label>Vertical Name *</Label>
                    <Input name="name" required maxLength={100} placeholder="e.g., Membership Growth" />
                  </div>
                  <div>
                    <Label>Description *</Label>
                    <Textarea
                      name="description"
                      required
                      maxLength={500}
                      placeholder="Brief description of this vertical's focus area..."
                    />
                  </div>
                  <div>
                    <Label>Display Order</Label>
                    <Input
                      name="display_order"
                      type="number"
                      defaultValue={Math.max(...verticals.map((v) => v.display_order), 0) + 1}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch name="is_active" defaultChecked id="add-active" />
                    <Label htmlFor="add-active">Is Active</Label>
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button type="submit">Create Vertical</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button 
            variant="destructive" 
            onClick={() => setDeletingAll(true)}
            disabled={verticals.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All
          </Button>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Dialog open={importingVerticals} onOpenChange={setImportingVerticals}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Bulk Import Verticals</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to import multiple verticals at once
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="csv-upload">Choose CSV File</Label>
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    CSV must include columns: name, description, display_order, is_active
                  </p>
                </div>

                {importPreview.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">
                      Preview ({importPreview.length} rows)
                    </h3>
                    <div className="border rounded-lg max-h-96 overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="p-2 text-left">#</th>
                            <th className="p-2 text-left">Name</th>
                            <th className="p-2 text-left">Description</th>
                            <th className="p-2 text-center">Order</th>
                            <th className="p-2 text-center">Active</th>
                            <th className="p-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.map((row) => (
                            <tr
                              key={row.rowNumber}
                              className={row.valid ? "" : "bg-destructive/10"}
                            >
                              <td className="p-2">{row.rowNumber}</td>
                              <td className="p-2">{row.name || "—"}</td>
                              <td className="p-2 text-xs truncate max-w-xs">
                                {row.description || "—"}
                              </td>
                              <td className="p-2 text-center">{row.display_order}</td>
                              <td className="p-2 text-center">
                                {row.is_active ? (
                                  <Check className="h-4 w-4 text-green-500 mx-auto" />
                                ) : (
                                  <X className="h-4 w-4 text-muted-foreground mx-auto" />
                                )}
                              </td>
                              <td className="p-2 text-center">
                                {row.valid ? (
                                  <Badge variant="outline" className="bg-green-50">
                                    Valid
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">Invalid</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportingVerticals(false);
                    setImportFile(null);
                    setImportPreview([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={executeBulkImport}
                  disabled={importPreview.length === 0}
                >
                  Import {importPreview.length} Verticals
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => setReorderMode(!reorderMode)}>
            <GripVertical className="h-4 w-4 mr-2" />
            {reorderMode ? "Done Reordering" : "Reorder Verticals"}
          </Button>
          <Button variant="outline" onClick={exportVerticals}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Verticals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{verticals.length}</p>
            <p className="text-sm text-muted-foreground">
              {verticals.filter((v) => v.is_active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Popular</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {popularityData[0]?.name || "N/A"}
            </p>
            <p className="text-sm text-muted-foreground">
              {popularityData[0]?.total || 0} selections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Least Popular</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {popularityData[popularityData.length - 1]?.name || "N/A"}
            </p>
            <p className="text-sm text-muted-foreground">
              {popularityData[popularityData.length - 1]?.total || 0} selections
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sort Options and Batch Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Label>Sort by:</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="display_order">Display Order</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="popularity">Popularity</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="select-all" 
              checked={selectedVerticals.length === sortedVerticals.length && selectedVerticals.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <Label htmlFor="select-all" className="cursor-pointer">
              Select All ({selectedVerticals.length})
            </Label>
          </div>
          
          {selectedVerticals.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setDeletingSelected(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedVerticals.length})
            </Button>
          )}
        </div>
      </div>

      {/* Verticals Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedVerticals.map((vertical) => (
          <Card
            key={vertical.id}
            draggable={reorderMode}
            onDragStart={() => handleDragStart(vertical)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(vertical)}
            className={cn(
              "transition-all",
              reorderMode && "cursor-move hover:shadow-lg",
              draggedItem?.id === vertical.id && "opacity-50"
            )}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  {!reorderMode && (
                    <Checkbox 
                      checked={selectedVerticals.includes(vertical.id)}
                      onCheckedChange={() => toggleSelectVertical(vertical.id)}
                      className="mt-1"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {reorderMode && <GripVertical className="h-5 w-5 text-muted-foreground" />}
                      <CardTitle className="text-lg">{vertical.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className="mt-1">
                      Order: {vertical.display_order}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center">
                  {vertical.is_active ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <X className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="line-clamp-3">{vertical.description}</CardDescription>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Selected <span className="font-semibold text-foreground">{vertical.usage_count || 0}</span> times
                  as Priority 1
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingVertical(vertical)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeletingVertical(vertical)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingVertical} onOpenChange={() => setEditingVertical(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vertical</DialogTitle>
            <DialogDescription>Update vertical information</DialogDescription>
          </DialogHeader>
          {editingVertical && (
            <form onSubmit={updateVertical}>
              <div className="space-y-4">
                <div>
                  <Label>Vertical Name *</Label>
                  <Input name="name" required maxLength={100} defaultValue={editingVertical.name} />
                </div>
                <div>
                  <Label>Description *</Label>
                  <Textarea
                    name="description"
                    required
                    maxLength={500}
                    defaultValue={editingVertical.description || ""}
                  />
                </div>
                <div>
                  <Label>Display Order</Label>
                  <Input name="display_order" type="number" defaultValue={editingVertical.display_order} />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch name="is_active" defaultChecked={editingVertical.is_active} id="edit-active" />
                  <Label htmlFor="edit-active">Is Active</Label>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Created: {format(new Date(editingVertical.created_at), "PPP")}</p>
                  <p>Used in {editingVertical.usage_count || 0} assessments</p>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingVertical} onOpenChange={() => setDeletingVertical(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Vertical?</AlertDialogTitle>
            <AlertDialogDescription>
              This vertical is used in {deletingVertical?.usage_count || 0} assessments.
              <br />
              <br />
              Deactivating will not affect past assessments, but it won't appear in new ones.
              <br />
              <br />
              Are you sure you want to deactivate "{deletingVertical?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteVertical}>Deactivate Vertical</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation */}
      <AlertDialog open={deletingAll} onOpenChange={setDeletingAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete All Verticals?</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>permanently delete all {verticals.length} verticals</strong> from the database.
              <br />
              <br />
              ⚠️ <strong>This action cannot be undone.</strong>
              <br />
              <br />
              Past assessments will not be affected, but all vertical data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAllVerticals} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Permanently Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Selected Confirmation */}
      <AlertDialog open={deletingSelected} onOpenChange={setDeletingSelected}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Verticals?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate {selectedVerticals.length} selected verticals. 
              <br />
              <br />
              This will not affect past assessments, but these verticals won't appear in new ones.
              <br />
              <br />
              You can reactivate them later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSelectedVerticals} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vertical Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Vertical Popularity</CardTitle>
          <CardDescription>Selection counts by priority level</CardDescription>
        </CardHeader>
        <CardContent>
          {popularityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={popularityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Priority1" fill="hsl(var(--chart-1))" />
                <Bar dataKey="Priority2" fill="hsl(var(--chart-2))" />
                <Bar dataKey="Priority3" fill="hsl(var(--chart-3))" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">No data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminVerticals;
