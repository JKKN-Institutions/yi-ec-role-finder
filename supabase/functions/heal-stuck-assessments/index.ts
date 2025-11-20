import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting healing process for stuck assessments...");

    // Find assessments stuck in "in_progress" but actually completed
    // Criteria:
    // 1. Status is 'in_progress'
    // 2. At question 5 (last question)
    // 3. Has results in assessment_results (meaning analysis completed)
    // 4. Created at least 5 minutes ago (to avoid race conditions)
    const { data: stuckAssessments, error: fetchError } = await supabase
      .from("assessments")
      .select("id, user_name, user_email, created_at")
      .eq("status", "in_progress")
      .eq("current_question", 5)
      .lt("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if (fetchError) {
      console.error("Error fetching stuck assessments:", fetchError);
      throw fetchError;
    }

    if (!stuckAssessments || stuckAssessments.length === 0) {
      console.log("No stuck assessments found");
      return new Response(
        JSON.stringify({ 
          success: true, 
          healed: 0,
          message: "No stuck assessments found" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter to only those that have results
    const assessmentIds = stuckAssessments.map(a => a.id);
    const { data: results } = await supabase
      .from("assessment_results")
      .select("assessment_id")
      .in("assessment_id", assessmentIds);

    const completedIds = new Set(results?.map(r => r.assessment_id) || []);
    const toHeal = stuckAssessments.filter(a => completedIds.has(a.id));

    console.log(`Found ${toHeal.length} stuck assessments to heal`);

    if (toHeal.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          healed: 0,
          message: "No assessments need healing" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update all stuck assessments to completed
    const { error: updateError } = await supabase
      .from("assessments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .in("id", toHeal.map(a => a.id));

    if (updateError) {
      console.error("Error updating assessments:", updateError);
      throw updateError;
    }

    console.log(`Successfully healed ${toHeal.length} assessments`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        healed: toHeal.length,
        assessments: toHeal.map(a => ({
          id: a.id,
          name: a.user_name,
          email: a.user_email
        })),
        message: `Successfully updated ${toHeal.length} assessment(s) to completed status`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in heal-stuck-assessments:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
