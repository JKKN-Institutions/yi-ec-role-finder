import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, BarChart3, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SuperAdminChapters from "./SuperAdminChapters";
import SuperAdminTemplates from "./SuperAdminTemplates";

const SuperAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalChapters: 0,
    activeChapters: 0,
    totalUsers: 0,
    totalAssessments: 0,
    chaptersByType: { regular: 0, yuva: 0, thalir: 0 }
  });

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: isSuperAdmin } = await (supabase.rpc as any)("is_super_admin", {
        _user_id: user.id,
      });

      if (!isSuperAdmin) {
        navigate("/access-denied");
        return;
      }

      await loadStats();
      setLoading(false);
    } catch (error) {
      console.error("Error checking super admin:", error);
      navigate("/access-denied");
    }
  };

  const loadStats = async () => {
    try {
      const [chaptersResult, usersResult, assessmentsResult] = await Promise.all([
        supabase.from("chapters" as any).select("chapter_type, is_active"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("assessments").select("id", { count: "exact", head: true })
      ]);

      const chapters = (chaptersResult.data as any) || [];
      const chaptersByType = {
        regular: chapters.filter((c: any) => c.chapter_type === "regular").length,
        yuva: chapters.filter((c: any) => c.chapter_type === "yuva").length,
        thalir: chapters.filter((c: any) => c.chapter_type === "thalir").length
      };

      setStats({
        totalChapters: chapters.length,
        activeChapters: chapters.filter((c: any) => c.is_active).length,
        totalUsers: usersResult.count || 0,
        totalAssessments: assessmentsResult.count || 0,
        chaptersByType
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
            <Button variant="outline" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="chapters">Chapters</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Chapters</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalChapters}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeChapters} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">Across all chapters</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Assessments</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAssessments}</div>
                  <p className="text-xs text-muted-foreground">Total completed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Health</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Healthy</div>
                  <p className="text-xs text-muted-foreground">All systems operational</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Regular Chapters</CardTitle>
                  <CardDescription>Standard leadership chapters</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.chaptersByType.regular}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Yuva Chapters</CardTitle>
                  <CardDescription>Youth-focused chapters</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.chaptersByType.yuva}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Thalir Chapters</CardTitle>
                  <CardDescription>Young professional chapters</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.chaptersByType.thalir}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="chapters">
            <SuperAdminChapters onUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="templates">
            <SuperAdminTemplates />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdmin;
