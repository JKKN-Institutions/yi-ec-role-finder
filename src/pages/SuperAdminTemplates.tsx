import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle2 } from "lucide-react";

interface Template {
  id: string;
  chapter_type: "regular" | "yuva" | "thalir";
  template_name: string;
  questions: any[];
  is_active: boolean;
}

const SuperAdminTemplates = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("assessment_templates" as any)
        .select("*")
        .order("chapter_type");

      if (error) throw error;
      setTemplates((data as any) || []);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "regular": return "bg-blue-500";
      case "yuva": return "bg-green-500";
      case "thalir": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Assessment Templates</h2>
          <p className="text-muted-foreground mt-1">
            Manage assessment questions for each chapter type
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{template.template_name}</CardTitle>
                  <CardDescription className="mt-2">
                    <Badge className={getTypeColor(template.chapter_type)}>
                      {template.chapter_type.toUpperCase()}
                    </Badge>
                  </CardDescription>
                </div>
                {template.is_active && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{template.questions.length} questions</span>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Questions:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {template.questions.slice(0, 3).map((q: any, idx: number) => (
                    <li key={idx} className="truncate">
                      {idx + 1}. {q.title}
                    </li>
                  ))}
                  {template.questions.length > 3 && (
                    <li className="text-xs">+ {template.questions.length - 3} more</li>
                  )}
                </ul>
              </div>

              <Button variant="outline" className="w-full" disabled>
                Edit Template (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No templates found</p>
            <p className="text-sm text-muted-foreground">
              Assessment templates will appear here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SuperAdminTemplates;
