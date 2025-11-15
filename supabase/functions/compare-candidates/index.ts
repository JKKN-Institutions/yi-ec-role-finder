import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidates } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Compare these EC candidates for leadership roles (Chair, Co-Chair, Executive Member roles). 

Candidates:
${candidates.map((c: any, idx: number) => `
${idx + 1}. ${c.name}
   - WILL Score: ${c.will}/100
   - SKILL Score: ${c.skill}/100
   - Quadrant: ${c.quadrant}
   - Recommended Role: ${c.role}
   - Leadership Style: ${c.leadership}
`).join('\n')}

Provide:
1. Ranking for each role type (Chair, Co-Chair, EM - list candidate names in order)
2. Team composition suggestions (who works well together, complementary skills)
3. Each candidate's unique strengths (3-4 points per person)
4. Any concerns or development areas (2-3 points per person)
5. Overall recommendation for hiring priority

Format as JSON with structure:
{
  "ranking": {
    "Chair": ["name1", "name2", ...],
    "Co-Chair": ["name1", "name2", ...],
    "Executive Member": ["name1", "name2", ...]
  },
  "teamComposition": ["suggestion1", "suggestion2", ...],
  "strengths": {
    "name1": ["strength1", "strength2", ...],
    "name2": ["strength1", "strength2", ...]
  },
  "concerns": {
    "name1": ["concern1", "concern2", ...],
    "name2": ["concern1", "concern2", ...]
  },
  "recommendation": "Overall hiring priority and reasoning"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert in leadership assessment and team composition for student organizations. Analyze candidates objectively and provide actionable insights."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const report = JSON.parse(content);

    return new Response(
      JSON.stringify({ report }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in compare-candidates function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
