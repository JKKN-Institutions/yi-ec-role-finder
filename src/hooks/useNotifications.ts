import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useNotifications = (userId: string | undefined) => {
  const { toast } = useToast();
  const [pendingCount, setPendingCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Check if browser notifications are supported
    if ("Notification" in window && Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }

    loadPendingCount();

    // Set up realtime subscription
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'assessments'
        },
        (payload) => {
          console.log('New assessment notification:', payload);
          loadPendingCount();
          
          // Show toast notification
          toast({
            title: "New Assessment",
            description: `${(payload.new as any).user_name} submitted an assessment`,
          });

          // Show browser notification if enabled
          if (notificationsEnabled) {
            new Notification("New Assessment Submitted", {
              body: `${(payload.new as any).user_name} has completed their assessment`,
              icon: "/favicon.ico"
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'assessments'
        },
        (payload) => {
          const oldStatus = (payload.old as any).review_status;
          const newStatus = (payload.new as any).review_status;
          
          if (oldStatus !== newStatus) {
            console.log('Assessment status changed:', payload);
            loadPendingCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, notificationsEnabled]);

  const loadPendingCount = async () => {
    try {
      const { count } = await (supabase as any)
        .from("assessments")
        .select("id", { count: "exact", head: true })
        .eq("review_status", "new")
        .eq("status", "completed");

      setPendingCount(count || 0);
    } catch (error) {
      console.error("Error loading pending count:", error);
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === "granted");
      
      if (permission === "granted") {
        toast({
          title: "Notifications Enabled",
          description: "You'll receive browser notifications for new assessments",
        });
      }
    }
  };

  return {
    pendingCount,
    notificationsEnabled,
    requestNotificationPermission
  };
};