import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResponseData {
  text?: string;
  priority1?: string;
  priority2?: string;
  priority3?: string;
  response?: string;
  statement?: string;
  constraint?: string;
  handling?: string;
  leadership_style?: string;
}

interface AssessmentResponse {
  question_number: number;
  question_text: string;
  response_data: ResponseData;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessmentId } = await req.json();
    console.log(`Analyzing assessment: ${assessmentId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. FETCH DATA
    const { data: assessment } = await supabase
      .from("assessments")
      .select("*, chapters(chapter_type)")
      .eq("id", assessmentId)
      .single();

    if (!assessment) {
      throw new Error("Assessment not found");
    }

    // Fetch assessment template based on chapter type
    const chapterType = (assessment as any).chapters?.chapter_type || 'regular';
    const { data: template } = await supabase
      .from("assessment_templates")
      .select("questions")
      .eq("chapter_type", chapterType)
      .single();

    if (!template) {
      console.warn(`No template found for chapter type: ${chapterType}, using default`);
    }

    const templateQuestions = template?.questions || [];
    const questionCount = Array.isArray(templateQuestions) && templateQuestions.length > 0 
      ? templateQuestions.length 
      : 5;

    const { data: responses } = await supabase
      .from("assessment_responses")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("question_number");

    if (!responses || responses.length !== questionCount) {
      throw new Error(`All ${questionCount} responses required for analysis`);
    }

    const responseMap: Record<number, AssessmentResponse> = {};
    responses.forEach((r) => {
      responseMap[r.question_number] = r as AssessmentResponse;
    });

    // Helper function to call AI with retry
    const callAI = async (messages: any[], tools?: any, maxRetries = 1): Promise<any> => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const body: any = {
            model: "google/gemini-2.5-flash",
            messages,
          };

          if (tools) {
            body.tools = tools;
            body.tool_choice = { type: "function", function: { name: tools[0].function.name } };
          }

          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`AI Gateway error (attempt ${attempt + 1}):`, response.status, errorText);
            if (attempt < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 5000));
              continue;
            }
            throw new Error(`AI Gateway error: ${response.status}`);
          }

          return await response.json();
        } catch (error) {
          console.error(`AI call failed (attempt ${attempt + 1}):`, error);
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            continue;
          }
          throw error;
        }
      }
    };

    // 2. CALCULATE WILL SCORE (0-100)
    let willScore = 0;
    const willBreakdown: any = {};

    // Q1 - Vertical Preferences (0 points - informational only)
    willBreakdown.vertical_preferences = 0;

    // Q3 - Achievement Statement (0-25 points)
    const q3Data = responseMap[3].response_data;
    const achievementText = q3Data.statement || "";
    let q3Score = 0;

    // Contains specific numbers (5 points each, max 10)
    const numbers = achievementText.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      q3Score += Math.min(numbers.length * 5, 10);
    }

    // Contains action verbs (5 points each, max 10)
    const actionVerbs = ["built", "launched", "created", "increased", "grew", "led", "delivered", "achieved"];
    const verbMatches = actionVerbs.filter((verb) =>
      achievementText.toLowerCase().includes(verb)
    );
    q3Score += Math.min(verbMatches.length * 5, 10);

    // No hedging words (+5 bonus)
    const hedgingWords = ["try", "hopefully", "maybe", "might", "perhaps"];
    const hasHedging = hedgingWords.some((word) =>
      achievementText.toLowerCase().includes(word)
    );
    if (!hasHedging && achievementText.length > 30) {
      q3Score += 5;
    }

    willBreakdown.achievement = q3Score;
    willScore += q3Score;

    // Q4 - Constraints (0-30 points)
    const q4Data = responseMap[4].response_data;
    const constraint = q4Data.constraint || "";
    const handling = q4Data.handling || "";
    let q4Score = 0;

    if (constraint === "none") q4Score = 20;
    else if (constraint === "time") q4Score = 15;
    else if (constraint === "expectations") q4Score = 10;
    else if (constraint === "skills") q4Score = 5;

    if (constraint !== "none" && handling.length > 20) {
      q4Score += 10; // Bonus for handling explanation
    }

    willBreakdown.constraints = q4Score;
    willScore += q4Score;

    // Q5 - Leadership Style (0-20 points)
    const q5Data = responseMap[5].response_data;
    const leadershipStyle = q5Data.leadership_style || "";
    let q5Score = 0;

    if (leadershipStyle === "leader" || leadershipStyle === "strategic") q5Score = 20;
    else if (leadershipStyle === "doer") q5Score = 15;
    else if (leadershipStyle === "learning") q5Score = 10;

    willBreakdown.leadership_style = q5Score;
    willScore += q5Score;

    // Q2 - Saturday Scenario (0-25 points, AI-scored)
    const q2Data = responseMap[2].response_data;
    const scenarioResponse = q2Data.response || "";

    let q2Score = 15; // Fallback score
    let q2Reasoning = "Using fallback scoring";

    try {
      const q2Prompt = `Analyze this emergency response for commitment level. Score 0-25 based on:
- Immediate willingness (0-8 points)
- Enthusiasm and positive attitude (0-7 points)
- Constraint acknowledgment with solutions (0-5 points)
- Team-first mindset (0-5 points)

Response: "${scenarioResponse}"

Provide a score and brief reasoning.`;

      const q2Result = await callAI(
        [
          { role: "system", content: "You are an expert at assessing commitment and willingness." },
          { role: "user", content: q2Prompt }
        ],
        [
          {
            type: "function",
            function: {
              name: "score_commitment",
              description: "Score the commitment level",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "integer", minimum: 0, maximum: 25 },
                  reasoning: { type: "string" }
                },
                required: ["score", "reasoning"],
                additionalProperties: false
              }
            }
          }
        ]
      );

      const toolCall = q2Result.choices[0].message.tool_calls[0];
      const q2Analysis = JSON.parse(toolCall.function.arguments);
      q2Score = q2Analysis.score;
      q2Reasoning = q2Analysis.reasoning;
    } catch (error) {
      console.error("Q2 AI scoring failed, using fallback:", error);
    }

    willBreakdown.saturday_scenario = { score: q2Score, reasoning: q2Reasoning };
    willScore += q2Score;

    console.log(`WILL Score: ${willScore}`, willBreakdown);

    // 3. CALCULATE SKILL SCORE (0-100, AI-based)
    const q1Data = responseMap[1].response_data;
    const skillPrompt = `You are analyzing a leadership assessment for Yi Erode Executive Committee. Score the candidate's SKILL level (0-100) based on all responses.

RESPONSES:
Q1 - Vertical Preferences: Priority 1: ${q1Data.priority1 || "N/A"}, Priority 2: ${q1Data.priority2 || "N/A"}, Priority 3: ${q1Data.priority3 || "N/A"}
Q2 - Saturday Emergency: ${scenarioResponse}
Q3 - Achievement Statement: ${achievementText}
Q4 - Constraints: ${constraint} - ${handling || "No handling explanation"}
Q5 - Leadership Style: ${leadershipStyle}

Score each dimension 0-25 points:
1. SOPHISTICATION (0-25): Communication clarity, nuance, emotional intelligence, professional maturity
2. STRATEGIC THINKING (0-25): Long-term vision, systems thinking, root cause analysis vs surface solutions
3. OUTCOME ORIENTATION (0-25): Results focus, specificity, measurable goals, execution mindset
4. LEADERSHIP SIGNALS (0-25): Initiative taking, team orientation, responsibility ownership, influence

Return the scores and reasoning.`;

    let skillScore = 50; // Fallback
    let skillBreakdown: any = {
      sophistication: 12,
      strategic_thinking: 13,
      outcome_orientation: 12,
      leadership_signals: 13,
      reasoning: "Using fallback scoring due to AI unavailability"
    };

    try {
      const skillResult = await callAI(
        [
          { role: "system", content: "You are an expert EC assessor evaluating candidates." },
          { role: "user", content: skillPrompt }
        ],
        [
          {
            type: "function",
            function: {
              name: "score_skill",
              description: "Score the skill level across dimensions",
              parameters: {
                type: "object",
                properties: {
                  sophistication: { type: "integer", minimum: 0, maximum: 25 },
                  strategic_thinking: { type: "integer", minimum: 0, maximum: 25 },
                  outcome_orientation: { type: "integer", minimum: 0, maximum: 25 },
                  leadership_signals: { type: "integer", minimum: 0, maximum: 25 },
                  reasoning: { type: "string" }
                },
                required: ["sophistication", "strategic_thinking", "outcome_orientation", "leadership_signals", "reasoning"],
                additionalProperties: false
              }
            }
          }
        ]
      );

      const toolCall = skillResult.choices[0].message.tool_calls[0];
      skillBreakdown = JSON.parse(toolCall.function.arguments);
      skillScore = skillBreakdown.sophistication + skillBreakdown.strategic_thinking +
        skillBreakdown.outcome_orientation + skillBreakdown.leadership_signals;
    } catch (error) {
      console.error("Skill AI scoring failed, using fallback:", error);
    }

    console.log(`SKILL Score: ${skillScore}`, skillBreakdown);

    // 4. DETERMINE QUADRANT
    let quadrant = "";
    if (willScore >= 60 && skillScore >= 60) quadrant = "Q1";
    else if (willScore >= 60 && skillScore < 60) quadrant = "Q2";
    else if (willScore < 60 && skillScore < 60) quadrant = "Q3";
    else quadrant = "Q4";

    const quadrantLabels: Record<string, string> = {
      Q1: "STAR",
      Q2: "WILLING",
      Q3: "NOT READY",
      Q4: "RELUCTANT"
    };

    console.log(`Quadrant: ${quadrant} - ${quadrantLabels[quadrant]}`);

    // 5. RECOMMEND ROLE
    let recommendedRole = "";
    let roleExplanation = "";

    if (quadrant === "Q1") {
      recommendedRole = willScore >= 80 ? "Chair" : "Co-Chair";
      roleExplanation = `As a ${quadrantLabels[quadrant]} candidate with high WILL (${willScore}) and SKILL (${skillScore}), you demonstrate both the motivation and capability for senior leadership. ${
        willScore >= 80 ? "Your exceptional commitment qualifies you for the Chair position." : "You're well-suited for the Co-Chair role."
      }`;
    } else if (quadrant === "Q2") {
      recommendedRole = willScore >= 75 ? "Executive Member (EM)" : "Vertical Lead";
      roleExplanation = `Your high WILL (${willScore}) shows strong commitment, while your developing SKILL (${skillScore}) suggests you'd thrive in ${
        willScore >= 75 ? "an Executive Member role with mentorship" : "a Vertical Lead position to build experience"
      }.`;
    } else if (quadrant === "Q4") {
      recommendedRole = skillScore >= 75 ? "Technical Advisor" : "Subject Matter Expert";
      roleExplanation = `Your strong SKILL (${skillScore}) is valuable, though your WILL (${willScore}) suggests ${
        skillScore >= 75 ? "a Technical Advisor role" : "contributing as a Subject Matter Expert"
      } might better align with your current capacity.`;
    } else {
      recommendedRole = "Active Volunteer";
      roleExplanation = `With developing WILL (${willScore}) and SKILL (${skillScore}), starting as an Active Volunteer allows you to build experience and discover your passion within Yi.`;
    }

    // 6. VERTICAL MATCHING
    const { data: allVerticals } = await supabase
      .from("verticals")
      .select("id, name")
      .eq("is_active", true)
      .order("display_order");

    const verticalsList = allVerticals?.map((v) => v.name).join(", ") || "";
    const q1Prefs = [q1Data.priority1, q1Data.priority2, q1Data.priority3]
      .filter(Boolean)
      .join(", ");

    let verticalMatches: string[] = [];

    try {
      const verticalPrompt = `Based on the candidate's preferences and profile, select the top 3 verticals they'd be best suited for.

Available Verticals: ${verticalsList}
Candidate Preferences: ${q1Prefs}
Commitment Level: ${willScore >= 60 ? "High" : "Developing"}
Leadership Style: ${leadershipStyle}
Achievement Focus: ${achievementText.substring(0, 100)}...

Select the 3 best-fit verticals in priority order.`;

      const verticalResult = await callAI(
        [
          { role: "system", content: "You are matching candidates to organizational verticals." },
          { role: "user", content: verticalPrompt }
        ],
        [
          {
            type: "function",
            function: {
              name: "match_verticals",
              description: "Select the top 3 vertical matches",
              parameters: {
                type: "object",
                properties: {
                  vertical_names: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 1,
                    maxItems: 3
                  }
                },
                required: ["vertical_names"],
                additionalProperties: false
              }
            }
          }
        ]
      );

      const toolCall = verticalResult.choices[0].message.tool_calls[0];
      const matchResult = JSON.parse(toolCall.function.arguments);

      // Convert names to IDs
      if (allVerticals && matchResult.vertical_names) {
        verticalMatches = allVerticals
          .filter((v) => matchResult.vertical_names.includes(v.name))
          .map((v) => v.id);
      }
    } catch (error) {
      console.error("Vertical matching failed:", error);
      // Use user preferences as fallback
      verticalMatches = [q1Data.priority1, q1Data.priority2, q1Data.priority3].filter(Boolean) as string[];
    }

    // 7. GENERATE INSIGHTS
    const insightsPrompt = `Provide strategic insights about this candidate:

Scores: WILL=${willScore}, SKILL=${skillScore}
Quadrant: ${quadrant} - ${quadrantLabels[quadrant]}
Leadership Style: ${leadershipStyle}

Key Responses:
- Achievement: "${achievementText}"
- Constraint Handling: ${constraint} - "${handling}"
- Emergency Response: "${scenarioResponse.substring(0, 150)}..."

Provide insights and recommendations.`;

    let insights: any = {
      leadership_style: leadershipStyle || "Developing Leader",
      top_strengths: ["Engaged", "Willing to learn", "Team-oriented"],
      development_areas: ["Build leadership experience", "Develop strategic thinking"],
      commitment_level: willScore >= 60 ? "High" : "Developing",
      skill_readiness: skillScore >= 60 ? "Ready" : "Developing"
    };

    let recommendations: string[] = [
      "Attend Yi leadership workshops",
      "Shadow current EC members",
      "Take on project leadership roles"
    ];

    try {
      const insightsResult = await callAI(
        [
          { role: "system", content: "You are providing strategic career development insights." },
          { role: "user", content: insightsPrompt }
        ],
        [
          {
            type: "function",
            function: {
              name: "provide_insights",
              description: "Provide strategic insights and recommendations",
              parameters: {
                type: "object",
                properties: {
                  leadership_style: { type: "string" },
                  top_strengths: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 3
                  },
                  development_areas: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 1,
                    maxItems: 2
                  },
                  commitment_level: { type: "string" },
                  skill_readiness: { type: "string" },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 5
                  }
                },
                required: ["leadership_style", "top_strengths", "development_areas", "recommendations"],
                additionalProperties: false
              }
            }
          }
        ]
      );

      const toolCall = insightsResult.choices[0].message.tool_calls[0];
      const insightData = JSON.parse(toolCall.function.arguments);
      insights = { ...insights, ...insightData };
      recommendations = insightData.recommendations;
    } catch (error) {
      console.error("Insights generation failed:", error);
    }

    // 8. SAVE RESULTS
    const { error: insertError } = await supabase
      .from("assessment_results")
      .insert({
        assessment_id: assessmentId,
        will_score: willScore,
        skill_score: skillScore,
        quadrant: quadrant,
        recommended_role: recommendedRole,
        role_explanation: roleExplanation,
        vertical_matches: verticalMatches,
        leadership_style: insights.leadership_style,
        recommendations: recommendations,
        key_insights: insights,
        reasoning: `WILL: ${JSON.stringify(willBreakdown)}\n\nSKILL: ${skillBreakdown.reasoning}`,
        scoring_breakdown: {
          will: willBreakdown,
          skill: skillBreakdown
        }
      });

    if (insertError) {
      console.error("Failed to insert results:", insertError);
      throw insertError;
    }

    console.log(`Analysis complete for assessment ${assessmentId}`);

    return new Response(
      JSON.stringify({
        success: true,
        assessment_id: assessmentId,
        results: {
          will_score: willScore,
          skill_score: skillScore,
          quadrant: quadrant,
          recommended_role: recommendedRole
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error analyzing assessment:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
