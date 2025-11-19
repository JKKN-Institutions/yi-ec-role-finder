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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting cleanup of test assessments...");

    // Find all test assessments (emails ending with @yi.com or @test.com)
    const { data: testAssessments, error: fetchError } = await supabase
      .from("assessments")
      .select("id, user_email, user_name")
      .or("user_email.ilike.%@yi.com,user_email.ilike.%@test.com");

    if (fetchError) {
      console.error("Error fetching test assessments:", fetchError);
      throw fetchError;
    }

    if (!testAssessments || testAssessments.length === 0) {
      console.log("No test assessments found");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No test assessments found",
          deleted: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${testAssessments.length} test assessments to delete`);

    const assessmentIds = testAssessments.map(a => a.id);

    // Delete assessment responses first (due to foreign key constraints)
    const { error: responsesError } = await supabase
      .from("assessment_responses")
      .delete()
      .in("assessment_id", assessmentIds);

    if (responsesError) {
      console.error("Error deleting assessment responses:", responsesError);
      throw responsesError;
    }

    // Delete assessment results
    const { error: resultsError } = await supabase
      .from("assessment_results")
      .delete()
      .in("assessment_id", assessmentIds);

    if (resultsError) {
      console.error("Error deleting assessment results:", resultsError);
      throw resultsError;
    }

    // Finally, delete the assessments themselves
    const { error: assessmentsError } = await supabase
      .from("assessments")
      .delete()
      .in("id", assessmentIds);

    if (assessmentsError) {
      console.error("Error deleting assessments:", assessmentsError);
      throw assessmentsError;
    }

    console.log(`Successfully deleted ${testAssessments.length} test assessments`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully deleted ${testAssessments.length} test assessments`,
        deleted: testAssessments.length,
        deletedAssessments: testAssessments.map(a => ({ 
          name: a.user_name, 
          email: a.user_email 
        }))
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in cleanup-test-assessments function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
