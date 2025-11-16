import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, TrendingUp, Users, FileText, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Chapter {
  id: string;
  name: string;
  slug: string;
  chapter_type: "regular" | "yuva" | "thalir";
  parent_chapter_id: string | null;
  is_active: boolean;
  location: string | null;
}

interface ChapterStats {
  chapterId: string;
  totalAssessments: number;
  pendingReviews: number;
  shortlisted: number;
  admins: number;
}

interface RecentActivity {
  id: string;
  chapter_name: string;
  user_name: string;
  user_email: string;
  status: string;
  created_at: string;
}

const SuperAdminDashboard = () => {
  const { toast } = useToast();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterStats, setChapterStats] = useState<Record<string, ChapterStats>>({});
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemStats, setSystemStats] = useState({
    totalAssessments: 0,
    totalCandidates: 0,
    totalChapters: 0,
    avgCompletionRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        loadChapters(),
        loadRecentActivity(),
        loadSystemStats()
      ]);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadChapters = async () => {
    const { data, error } = await supabase
      .from("chapters" as any)
      .select("*")
      .order("name");

    if (error) throw error;

    const chaptersData = (data as any) || [];
    setChapters(chaptersData);

    // Load stats for each chapter
    const statsPromises = chaptersData.map((chapter: Chapter) => loadChapterStats(chapter.id));
    const stats = await Promise.all(statsPromises);
    
    const statsMap: Record<string, ChapterStats> = {};
    stats.forEach((stat, index) => {
      if (stat) {
        statsMap[chaptersData[index].id] = stat;
      }
    });
    setChapterStats(statsMap);
  };

  const loadChapterStats = async (chapterId: string) => {
    try {
      const assessmentQuery = await supabase
        .from("assessments")
        .select("id, review_status, is_shortlisted")
        .eq("chapter_id", chapterId);

      const adminsQuery = await supabase
        .from("user_roles" as any)
        .select("id")
        .eq("chapter_id", chapterId);

      const reviews = assessmentQuery.data || [];
      const pendingReviews = reviews.filter((a: any) => a.review_status === "new").length;
      const shortlisted = reviews.filter((a: any) => a.is_shortlisted).length;

      return {
        chapterId,
        totalAssessments: reviews.length,
        pendingReviews,
        shortlisted,
        admins: adminsQuery.data?.length || 0
      };
    } catch (error) {
      console.error(`Error loading stats for chapter ${chapterId}:`, error);
      return null;
    }
  };

  const loadRecentActivity = async () => {
    const { data, error } = await supabase
      .from("assessments")
      .select(`
        id,
        user_name,
        user_email,
        status,
        created_at,
        chapter_id
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    // Get chapter names
    const assessmentData = (data as any) || [];
    const chapterIds = [...new Set(assessmentData.map((a: any) => a.chapter_id))];
    const { data: chapterData } = await supabase
      .from("chapters" as any)
      .select("id, name")
      .in("id", chapterIds);

    const chapterMap = new Map((chapterData as any || []).map((c: any) => [c.id, c.name]));

    const activities = assessmentData.map((a: any) => ({
      id: a.id,
      chapter_name: chapterMap.get(a.chapter_id) || "Unknown",
      user_name: a.user_name,
      user_email: a.user_email,
      status: a.status,
      created_at: a.created_at
    }));

    setRecentActivity(activities);
  };

  const loadSystemStats = async () => {
    const [assessments, chapters] = await Promise.all([
      supabase
        .from("assessments")
        .select("id, status", { count: "exact" }),
      supabase
        .from("chapters" as any)
        .select("id", { count: "exact" })
    ]);

    const assessmentData = assessments.data || [];
    const completed = assessmentData.filter((a: any) => a.status === "completed").length;
    const total = assessments.count || 0;

    setSystemStats({
      totalAssessments: total,
      totalCandidates: total,
      totalChapters: chapters.count || 0,
      avgCompletionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    });
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "regular": return "bg-blue-500";
      case "yuva": return "bg-green-500";
      case "thalir": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const renderChapterTree = () => {
    const parentChapters = chapters.filter(c => !c.parent_chapter_id);
    
    return parentChapters.map(parent => {
      const children = chapters.filter(c => c.parent_chapter_id === parent.id);
      const isExpanded = expandedChapters.has(parent.id);
      const stats = chapterStats[parent.id];
      
      // Calculate aggregate stats for parent
      const aggregateStats = children.reduce((acc, child) => {
        const childStats = chapterStats[child.id];
        if (childStats) {
          acc.totalAssessments += childStats.totalAssessments;
          acc.pendingReviews += childStats.pendingReviews;
          acc.shortlisted += childStats.shortlisted;
        }
        return acc;
      }, { totalAssessments: 0, pendingReviews: 0, shortlisted: 0 });

      return (
        <div key={parent.id} className="space-y-2">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {children.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleChapter(parent.id)}
                      className="h-8 w-8 p-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{parent.name}</h3>
                      <Badge className={getTypeColor(parent.chapter_type)}>
                        {parent.chapter_type.toUpperCase()}
                      </Badge>
                      {!parent.is_active && (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                    {parent.location && (
                      <p className="text-sm text-muted-foreground">{parent.location}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{aggregateStats.totalAssessments}</p>
                    <p className="text-muted-foreground">Assessments</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{aggregateStats.pendingReviews}</p>
                    <p className="text-muted-foreground">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{aggregateStats.shortlisted}</p>
                    <p className="text-muted-foreground">Shortlisted</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isExpanded && children.length > 0 && (
            <div className="ml-12 space-y-2">
              {children.map(child => {
                const childStats = chapterStats[child.id];
                return (
                  <Card key={child.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{child.name}</h4>
                              <Badge className={getTypeColor(child.chapter_type)} variant="outline">
                                {child.chapter_type.toUpperCase()}
                              </Badge>
                            </div>
                            {child.location && (
                              <p className="text-sm text-muted-foreground">{child.location}</p>
                            )}
                          </div>
                        </div>

                        {childStats && (
                          <div className="flex gap-6 text-sm">
                            <div className="text-center">
                              <p className="text-xl font-bold">{childStats.totalAssessments}</p>
                              <p className="text-muted-foreground">Assessments</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold">{childStats.pendingReviews}</p>
                              <p className="text-muted-foreground">Pending</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold">{childStats.shortlisted}</p>
                              <p className="text-muted-foreground">Shortlisted</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System-wide Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Chapters</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalChapters}</div>
            <p className="text-xs text-muted-foreground">Active organizations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalAssessments}</div>
            <p className="text-xs text-muted-foreground">All chapters combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalCandidates}</div>
            <p className="text-xs text-muted-foreground">Unique participants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.avgCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">Average across all</p>
          </CardContent>
        </Card>
      </div>

      {/* Chapter Tree View */}
      <Card>
        <CardHeader>
          <CardTitle>Chapter Hierarchy</CardTitle>
          <CardDescription>
            Overview of all chapters and their sub-chapters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {renderChapterTree()}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest assessments across all chapters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map(activity => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{activity.user_name}</p>
                  <p className="text-sm text-muted-foreground">{activity.user_email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.chapter_name} • {new Date(activity.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={activity.status === "completed" ? "default" : "secondary"}>
                  {activity.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;