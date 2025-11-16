import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, MapPin, Mail, Phone } from "lucide-react";

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
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  welcome_message?: string | null;
}

const ChapterLanding = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    loadChapter();
  }, [slug]);

  const loadChapter = async () => {
    try {
      const { data, error } = await supabase
        .from("chapters" as any)
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) throw error;

      if (!(data as any).is_active) {
        toast({
          title: "Chapter Inactive",
          description: "This chapter is currently not accepting assessments",
          variant: "destructive"
        });
        navigate("/");
        return;
      }

      setChapter(data as any);
    } catch (error) {
      console.error("Error loading chapter:", error);
      toast({
        title: "Error",
        description: "Chapter not found",
        variant: "destructive"
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = async () => {
    if (!name.trim() || !email.trim()) {
      toast({
        title: "Required Fields",
        description: "Please enter your name and email",
        variant: "destructive"
      });
      return;
    }

    setStarting(true);
    try {
      const { data: assessment, error } = await supabase
        .from("assessments")
        .insert({
          user_name: name.trim(),
          user_email: email.trim(),
          chapter_id: chapter!.id,
          status: "in_progress",
          current_question: 1,
        })
        .select()
        .single();

      if (error) throw error;

      navigate(`/assessment/${assessment.id}`);
    } catch (error: any) {
      console.error("Error creating assessment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start assessment",
        variant: "destructive"
      });
    } finally {
      setStarting(false);
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "regular": return "Regular Chapter";
      case "yuva": return "Yuva Chapter";
      case "thalir": return "Thalir Chapter";
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!chapter) {
    return null;
  }

  const customStyle = chapter.primary_color ? {
    '--chapter-primary': chapter.primary_color,
    '--chapter-secondary': chapter.secondary_color || chapter.primary_color,
  } as React.CSSProperties : {};

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4"
      style={customStyle}
    >
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4">
          {chapter.logo_url && (
            <div className="flex justify-center mb-4">
              <img 
                src={chapter.logo_url} 
                alt={`${chapter.name} logo`}
                className="h-20 w-auto object-contain"
              />
            </div>
          )}
          <div className="flex justify-center">
            <Badge 
              className="text-white px-4 py-1"
              style={chapter.primary_color ? { backgroundColor: chapter.primary_color } : {}}
            >
              {getTypeLabel(chapter.chapter_type)}
            </Badge>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold">{chapter.name}</CardTitle>
            {chapter.welcome_message ? (
              <CardDescription className="text-base whitespace-pre-line">
                {chapter.welcome_message}
              </CardDescription>
            ) : chapter.description ? (
              <CardDescription className="text-base">
                {chapter.description}
              </CardDescription>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {(chapter.location || chapter.contact_email || chapter.contact_phone) && (
            <div className="grid gap-3 p-4 bg-muted/50 rounded-lg">
              {chapter.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{chapter.location}</span>
                </div>
              )}
              {chapter.contact_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{chapter.contact_email}</span>
                </div>
              )}
              {chapter.contact_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{chapter.contact_phone}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleStartAssessment}
            disabled={starting}
            className="w-full"
            size="lg"
            style={chapter.primary_color ? { backgroundColor: chapter.primary_color, borderColor: chapter.primary_color } : {}}
          >
            {starting ? "Starting..." : "Start Assessment"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            This assessment will help us understand your leadership potential and match you with the right role in {chapter.name}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChapterLanding;
