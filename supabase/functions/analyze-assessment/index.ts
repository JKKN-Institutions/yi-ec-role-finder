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
    const { assessmentId } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: responses } = await supabase
      .from("assessment_responses")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("question_number");

    if (!responses || responses.length === 0) {
      throw new Error("No responses found");
    }

    const responsesText = responses
      .map((r) => `Q${r.question_number}: ${r.question_text}\nA: ${r.response_data.text}`)
      .join("\n\n");

    const systemPrompt = `You are an expert EC (Executive Committee) assessor using the WILL/SKILL matrix framework.

Analyze responses and provide:
1. WILL Score (0-100): Motivation, commitment, passion
2. SKILL Score (0-100): Experience, capabilities, proven track record
3. Quadrant placement (Q1-Q4):
   - Q1: High WILL, Low SKILL - Enthusiastic learners
   - Q2: High WILL, High SKILL - Star performers
   - Q3: Low WILL, Low SKILL - Needs development
   - Q4: Low WILL, High SKILL - Underutilizers

4. Recommended role and explanation
5. Vertical matches from: Membership Growth, Events & Programs, Social Impact, Communications, Finance & Operations, Member Engagement
6. Leadership style description
7. 3-5 actionable recommendations
8. Key insights

Return JSON only.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this EC candidate assessment:\n\n${responsesText}` }
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_analysis",
            description: "Submit the complete EC assessment analysis",
            parameters: {
              type: "object",
              properties: {
                will_score: { type: "integer", minimum: 0, maximum: 100 },
                skill_score: { type: "integer", minimum: 0, maximum: 100 },
                quadrant: { type: "string", enum: ["Q1", "Q2", "Q3", "Q4"] },
                recommended_role: { type: "string" },
                role_explanation: { type: "string" },
                vertical_matches: { type: "array", items: { type: "string" } },
                leadership_style: { type: "string" },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" }
                    }
                  }
                },
                key_insights: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string" },
                      insight: { type: "string" }
                    }
                  }
                }
              },
              required: ["will_score", "skill_score", "quadrant", "recommended_role", "role_explanation", "vertical_matches", "recommendations"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "submit_analysis" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices[0].message.tool_calls[0];
    const analysis = JSON.parse(toolCall.function.arguments);

    const { error: insertError } = await supabase
      .from("assessment_results")
      .insert({
        assessment_id: assessmentId,
        will_score: analysis.will_score,
        skill_score: analysis.skill_score,
        quadrant: analysis.quadrant,
        recommended_role: analysis.recommended_role,
        role_explanation: analysis.role_explanation,
        vertical_matches: analysis.vertical_matches,
        leadership_style: analysis.leadership_style || null,
        recommendations: analysis.recommendations,
        key_insights: analysis.key_insights || [],
        scoring_breakdown: { will: analysis.will_score, skill: analysis.skill_score },
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});