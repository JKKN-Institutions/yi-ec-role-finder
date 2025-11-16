import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

interface Chapter {
  chapter_id: string;
  chapter_name: string;
  chapter_type: "regular" | "yuva" | "thalir";
  chapter_slug: string;
  user_role: string;
  parent_chapter_id: string | null;
  is_parent: boolean;
}

interface ChapterSelectorProps {
  value: string;
  onChange: (chapterId: string) => void;
}

const ChapterSelector = ({ value, onChange }: ChapterSelectorProps) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserChapters();
  }, []);

  const loadUserChapters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if super admin
      const { data: superAdmin } = await (supabase.rpc as any)("is_super_admin", {
        _user_id: user.id,
      });

      setIsSuperAdmin(!!superAdmin);

      if (superAdmin) {
        // Load all chapters for super admin
        const { data, error } = await supabase
          .from("chapters" as any)
          .select("id, name, chapter_type, slug")
          .eq("is_active", true)
          .order("display_order");

        if (error) throw error;

        const allChapters: Chapter[] = ((data as any) || []).map((c: any) => ({
          chapter_id: c.id,
          chapter_name: c.name,
          chapter_type: c.chapter_type as "regular" | "yuva" | "thalir",
          chapter_slug: c.slug,
          user_role: "super_admin"
        }));

        setChapters(allChapters);
      } else {
        // Load user's chapters
        const { data, error } = await (supabase.rpc as any)("get_user_chapters", {
          _user_id: user.id,
        });

        if (error) throw error;
        setChapters((data as any) || []);
      }
    } catch (error) {
      console.error("Error loading chapters:", error);
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

  const getParentChapters = () => {
    return chapters.filter(c => c.is_parent);
  };

  const getChildChapters = (parentId: string) => {
    return chapters.filter(c => c.parent_chapter_id === parentId);
  };

  if (loading) {
    return <div className="w-64 h-10 bg-muted animate-pulse rounded-md" />;
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select chapter" />
        </SelectTrigger>
        <SelectContent>
          {isSuperAdmin && (
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Badge variant="outline">All Chapters</Badge>
              </div>
            </SelectItem>
          )}
          {getParentChapters().map((parentChapter) => (
            <>
              <SelectItem key={parentChapter.chapter_id} value={parentChapter.chapter_id}>
                <div className="flex items-center gap-2 font-semibold">
                  <span>{parentChapter.chapter_name}</span>
                  <Badge className={`${getTypeColor(parentChapter.chapter_type)} text-white text-xs`}>
                    {parentChapter.chapter_type}
                  </Badge>
                </div>
              </SelectItem>
              {getChildChapters(parentChapter.chapter_id).map((childChapter) => (
                <SelectItem key={childChapter.chapter_id} value={childChapter.chapter_id}>
                  <div className="flex items-center gap-2 pl-4">
                    <span className="text-muted-foreground">↳</span>
                    <span>{childChapter.chapter_name}</span>
                    <Badge className={`${getTypeColor(childChapter.chapter_type)} text-white text-xs`}>
                      {childChapter.chapter_type}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ChapterSelector;
