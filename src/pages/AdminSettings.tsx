import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AdminPreferences {
  notification_preferences: {
    email_new_assessments: boolean;
    email_pending_reviews: boolean;
    browser_notifications: boolean;
    daily_digest: boolean;
  };
  default_filters: {
    status: string;
    review_status: string;
    show_shortlisted_only: boolean;
  };
  dashboard_layout: {
    widgets: string[];
    widget_order: string[];
  };
}

const defaultPreferences: AdminPreferences = {
  notification_preferences: {
    email_new_assessments: true,
    email_pending_reviews: true,
    browser_notifications: true,
    daily_digest: false,
  },
  default_filters: {
    status: "all",
    review_status: "all",
    show_shortlisted_only: false,
  },
  dashboard_layout: {
    widgets: ["top_chapters", "recent_trends", "key_metrics"],
    widget_order: ["top_chapters", "recent_trends", "key_metrics"],
  },
};

const AdminSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<AdminPreferences>(defaultPreferences);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("admin_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setPreferences({
          notification_preferences: data.notification_preferences,
          default_filters: data.default_filters,
          dashboard_layout: data.dashboard_layout,
        });
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase as any)
        .from("admin_preferences")
        .upsert({
          user_id: user.id,
          notification_preferences: preferences.notification_preferences,
          default_filters: preferences.default_filters,
          dashboard_layout: preferences.dashboard_layout,
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateNotificationPref = (key: string, value: boolean) => {
    setPreferences({
      ...preferences,
      notification_preferences: {
        ...preferences.notification_preferences,
        [key]: value,
      },
    });
  };

  const updateDefaultFilter = (key: string, value: any) => {
    setPreferences({
      ...preferences,
      default_filters: {
        ...preferences.default_filters,
        [key]: value,
      },
    });
  };

  const toggleWidget = (widget: string) => {
    const widgets = preferences.dashboard_layout.widgets;
    const newWidgets = widgets.includes(widget)
      ? widgets.filter((w) => w !== widget)
      : [...widgets, widget];

    setPreferences({
      ...preferences,
      dashboard_layout: {
        ...preferences.dashboard_layout,
        widgets: newWidgets,
        widget_order: newWidgets,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground">Manage your preferences and customize your experience</p>
        </div>
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Choose how you want to be notified about important events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email_new_assessments" className="flex flex-col gap-1">
              <span>Email - New Assessments</span>
              <span className="text-sm text-muted-foreground font-normal">
                Get notified when new assessments are submitted
              </span>
            </Label>
            <Switch
              id="email_new_assessments"
              checked={preferences.notification_preferences.email_new_assessments}
              onCheckedChange={(checked) => updateNotificationPref("email_new_assessments", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="email_pending_reviews" className="flex flex-col gap-1">
              <span>Email - Pending Reviews</span>
              <span className="text-sm text-muted-foreground font-normal">
                Get notified about assessments pending review
              </span>
            </Label>
            <Switch
              id="email_pending_reviews"
              checked={preferences.notification_preferences.email_pending_reviews}
              onCheckedChange={(checked) => updateNotificationPref("email_pending_reviews", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="browser_notifications" className="flex flex-col gap-1">
              <span>Browser Notifications</span>
              <span className="text-sm text-muted-foreground font-normal">
                Show desktop notifications for important events
              </span>
            </Label>
            <Switch
              id="browser_notifications"
              checked={preferences.notification_preferences.browser_notifications}
              onCheckedChange={(checked) => updateNotificationPref("browser_notifications", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="daily_digest" className="flex flex-col gap-1">
              <span>Daily Digest Email</span>
              <span className="text-sm text-muted-foreground font-normal">
                Receive a daily summary of all activity
              </span>
            </Label>
            <Switch
              id="daily_digest"
              checked={preferences.notification_preferences.daily_digest}
              onCheckedChange={(checked) => updateNotificationPref("daily_digest", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default Filters</CardTitle>
          <CardDescription>Set your preferred default filters for the candidates page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Default Status Filter</Label>
              <Select
                value={preferences.default_filters.status}
                onValueChange={(value) => updateDefaultFilter("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Review Status Filter</Label>
              <Select
                value={preferences.default_filters.review_status}
                onValueChange={(value) => updateDefaultFilter("review_status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reviews</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show_shortlisted_only" className="flex flex-col gap-1">
                <span>Show Shortlisted Only by Default</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Filter to show only shortlisted candidates on page load
                </span>
              </Label>
              <Switch
                id="show_shortlisted_only"
                checked={preferences.default_filters.show_shortlisted_only}
                onCheckedChange={(checked) => updateDefaultFilter("show_shortlisted_only", checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard Layout</CardTitle>
          <CardDescription>Customize which widgets appear on your dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="widget_top_chapters" className="flex flex-col gap-1">
              <span>Top Performing Chapters</span>
              <span className="text-sm text-muted-foreground font-normal">
                Show chapter rankings and performance comparison
              </span>
            </Label>
            <Switch
              id="widget_top_chapters"
              checked={preferences.dashboard_layout.widgets.includes("top_chapters")}
              onCheckedChange={() => toggleWidget("top_chapters")}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="widget_recent_trends" className="flex flex-col gap-1">
              <span>Recent Trends</span>
              <span className="text-sm text-muted-foreground font-normal">
                Display assessment activity trends over time
              </span>
            </Label>
            <Switch
              id="widget_recent_trends"
              checked={preferences.dashboard_layout.widgets.includes("recent_trends")}
              onCheckedChange={() => toggleWidget("recent_trends")}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="widget_key_metrics" className="flex flex-col gap-1">
              <span>Key Metrics</span>
              <span className="text-sm text-muted-foreground font-normal">
                Show important statistics and KPIs
              </span>
            </Label>
            <Switch
              id="widget_key_metrics"
              checked={preferences.dashboard_layout.widgets.includes("key_metrics")}
              onCheckedChange={() => toggleWidget("key_metrics")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
