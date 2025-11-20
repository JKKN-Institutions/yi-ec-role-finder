import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResponseData {
  partA?: string;
  priority1?: string;
  priority2?: string;
  priority3?: string;
  response?: string;
  leadershipStyle?: string;
  hasAnalyzed?: boolean;
  suggestedVerticals?: string[];
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

    // 1. FETCH ASSESSMENT DATA
    const { data: assessment } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", assessmentId)
      .single();

    if (!assessment) {
      throw new Error("Assessment not found");
    }

    const { data: responses } = await supabase
      .from("assessment_responses")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("question_number");

    if (!responses || responses.length !== 5) {
      throw new Error("All 5 responses required for analysis");
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
              await new Promise((resolve) => setTimeout(resolve, 3000));
              continue;
            }
            throw new Error(`AI Gateway error: ${response.status}`);
          }

          return await response.json();
        } catch (error) {
          console.error(`AI call failed (attempt ${attempt + 1}):`, error);
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            continue;
          }
          throw error;
        }
      }
    };

    // Extract response data
    const q1Data = responseMap[1].response_data;
    const q2Data = responseMap[2].response_data;
    const q3Data = responseMap[3].response_data;
    const q4Data = responseMap[4].response_data;
    const q5Data = responseMap[5].response_data;

    const problemDescription = q1Data.partA || "";
    const initiativeDesign = q2Data.response || "";
    const saturdayResponse = q3Data.response || "";
    const achievementStory = q4Data.response || "";
    const leadershipStyle = q5Data.leadershipStyle || "";

    // 2. CALCULATE PERSONAL OWNERSHIP SCORE (Q1) - 0-100
    let personalOwnershipScore = 50; // Fallback
    let personalOwnershipBreakdown: any = {
      emotional_connection: 12,
      specific_moment: 12,
      personal_stakes: 13,
      community_impact: 13,
      reasoning: "Using fallback scoring due to AI unavailability"
    };

    try {
      const poPrompt = `You are analyzing Q1 of a leadership assessment. Score how deeply this candidate cares about a community problem.

QUESTION: "Describe a problem in Erode/your community that IRRITATES you so much you can't ignore it. What specific moment made you feel 'I have to do something about this'?"

RESPONSE: "${problemDescription}"

Score 0-25 points for each dimension (be generous with 12-20 for reasonable effort):
1. EMOTIONAL CONNECTION (0-25): How deeply do they feel about this? Any personal irritation = 12-15, strong emotion = 16-20, visceral passion = 21-25
2. SPECIFIC MOMENT (0-25): Did they share a concrete moment? Vague mention = 10-14, some detail = 15-19, vivid story = 20-25
3. PERSONAL STAKES (0-25): Why does this matter to THEM? Some relevance = 12-16, clear personal connection = 17-21, deeply personal = 22-25
4. COMMUNITY IMPACT (0-25): Do they connect personal to community? Basic awareness = 12-16, clear connection = 17-21, systemic view = 22-25

Return scores and brief reasoning.`;

      const poResult = await callAI(
        [
          { role: "system", content: "You are an expert at assessing personal ownership and authentic passion." },
          { role: "user", content: poPrompt }
        ],
        [
          {
            type: "function",
            function: {
              name: "score_personal_ownership",
              description: "Score personal ownership of a community problem",
              parameters: {
                type: "object",
                properties: {
                  emotional_connection: { type: "integer", minimum: 0, maximum: 25 },
                  specific_moment: { type: "integer", minimum: 0, maximum: 25 },
                  personal_stakes: { type: "integer", minimum: 0, maximum: 25 },
                  community_impact: { type: "integer", minimum: 0, maximum: 25 },
                  reasoning: { type: "string" }
                },
                required: ["emotional_connection", "specific_moment", "personal_stakes", "community_impact", "reasoning"],
                additionalProperties: false
              }
            }
          }
        ]
      );

      const toolCall = poResult.choices[0].message.tool_calls[0];
      personalOwnershipBreakdown = JSON.parse(toolCall.function.arguments);
      personalOwnershipScore = 
        personalOwnershipBreakdown.emotional_connection +
        personalOwnershipBreakdown.specific_moment +
        personalOwnershipBreakdown.personal_stakes +
        personalOwnershipBreakdown.community_impact;
    } catch (error) {
      console.error("Personal Ownership scoring failed:", error);
    }

    console.log(`Personal Ownership Score: ${personalOwnershipScore}`, personalOwnershipBreakdown);

    // 3. CALCULATE IMPACT READINESS SCORE (Q2) - 0-100
    let impactReadinessScore = 50; // Fallback
    let impactReadinessBreakdown: any = {
      strategic_thinking: 12,
      scale_planning: 13,
      resource_awareness: 12,
      measurable_outcomes: 13,
      reasoning: "Using fallback scoring due to AI unavailability"
    };

    try {
      const irPrompt = `You are analyzing Q2 of a leadership assessment. Score how ready this candidate is to create real impact.

QUESTION: "Let's say Yi Erode gives you 6 months and ₹50,000 to work on the problem you described. Design your initiative - what would you do, who would you work with, how would you reach 10,000+ people, and what specific change would you create?"

RESPONSE: "${initiativeDesign}"

Score 0-25 points for each dimension:
1. STRATEGIC THINKING (0-25): Is there a clear plan? Vague ideas = 8-12, some structure = 13-18, detailed strategy = 19-25
2. SCALE PLANNING (0-25): Can they realistically reach 10,000+ people? No scale plan = 5-10, some approach = 11-17, concrete plan = 18-25
3. RESOURCE AWARENESS (0-25): Do they understand 6 months and ₹50K constraints? Unrealistic = 5-10, somewhat aware = 11-17, practical = 18-25
4. MEASURABLE OUTCOMES (0-25): Can they define specific change? Vague goals = 8-12, some clarity = 13-18, specific metrics = 19-25

Return scores and brief reasoning.`;

      const irResult = await callAI(
        [
          { role: "system", content: "You are an expert at assessing initiative design and impact planning." },
          { role: "user", content: irPrompt }
        ],
        [
          {
            type: "function",
            function: {
              name: "score_impact_readiness",
              description: "Score readiness to create measurable impact",
              parameters: {
                type: "object",
                properties: {
                  strategic_thinking: { type: "integer", minimum: 0, maximum: 25 },
                  scale_planning: { type: "integer", minimum: 0, maximum: 25 },
                  resource_awareness: { type: "integer", minimum: 0, maximum: 25 },
                  measurable_outcomes: { type: "integer", minimum: 0, maximum: 25 },
                  reasoning: { type: "string" }
                },
                required: ["strategic_thinking", "scale_planning", "resource_awareness", "measurable_outcomes", "reasoning"],
                additionalProperties: false
              }
            }
          }
        ]
      );

      const toolCall = irResult.choices[0].message.tool_calls[0];
      impactReadinessBreakdown = JSON.parse(toolCall.function.arguments);
      impactReadinessScore = 
        impactReadinessBreakdown.strategic_thinking +
        impactReadinessBreakdown.scale_planning +
        impactReadinessBreakdown.resource_awareness +
        impactReadinessBreakdown.measurable_outcomes;
    } catch (error) {
      console.error("Impact Readiness scoring failed:", error);
    }

    console.log(`Impact Readiness Score: ${impactReadinessScore}`, impactReadinessBreakdown);

    // 4. CALCULATE WILL SCORE (Q3) - 0-100
    let willScore = 50; // Fallback
    let willBreakdown: any = {
      immediate_response: 12,
      sacrifice_willingness: 13,
      problem_solving: 12,
      reliability: 13,
      reasoning: "Using fallback scoring due to AI unavailability"
    };

    try {
      const willPrompt = `You are analyzing Q3 of a leadership assessment. Score the candidate's commitment and willingness to show up when needed.

QUESTION: "It's Saturday, 6 PM. You're relaxing with family when your vertical head calls: 'We need urgent help preparing for tomorrow's major event. Can you come to the office now for 3-4 hours?' What's your honest response?"

RESPONSE: "${saturdayResponse}"

Score 0-25 points for each dimension (value HONESTY over "perfect" answers):
1. IMMEDIATE RESPONSE (0-25): What's their first instinct? Clear no = 5-10, maybe/conditional = 11-17, immediate yes = 18-25
2. SACRIFICE WILLINGNESS (0-25): Will they prioritize Yi over personal time? Not willing = 5-10, reluctant but willing = 11-17, eager = 18-25
3. PROBLEM SOLVING (0-25): Do they think about how to help? No alternatives = 8-12, some solutions = 13-18, proactive = 19-25
4. RELIABILITY (0-25): Can Yi count on them in crisis? Unreliable = 5-10, situational = 11-17, dependable = 18-25

Be honest in scoring - "no but here's why" shows self-awareness and is better than fake enthusiasm.

Return scores and brief reasoning.`;

      const willResult = await callAI(
        [
          { role: "system", content: "You are an expert at assessing commitment and reliability." },
          { role: "user", content: willPrompt }
        ],
        [
          {
            type: "function",
            function: {
              name: "score_will",
              description: "Score commitment and willingness to sacrifice",
              parameters: {
                type: "object",
                properties: {
                  immediate_response: { type: "integer", minimum: 0, maximum: 25 },
                  sacrifice_willingness: { type: "integer", minimum: 0, maximum: 25 },
                  problem_solving: { type: "integer", minimum: 0, maximum: 25 },
                  reliability: { type: "integer", minimum: 0, maximum: 25 },
                  reasoning: { type: "string" }
                },
                required: ["immediate_response", "sacrifice_willingness", "problem_solving", "reliability", "reasoning"],
                additionalProperties: false
              }
            }
          }
        ]
      );

      const toolCall = willResult.choices[0].message.tool_calls[0];
      willBreakdown = JSON.parse(toolCall.function.arguments);
      willScore = 
        willBreakdown.immediate_response +
        willBreakdown.sacrifice_willingness +
        willBreakdown.problem_solving +
        willBreakdown.reliability;
    } catch (error) {
      console.error("WILL scoring failed:", error);
    }

    console.log(`WILL Score: ${willScore}`, willBreakdown);

    // 5. CALCULATE SKILL SCORE (Q4 + Q5) - 0-100
    let skillScore = 50; // Fallback
    let skillBreakdown: any = {
      goal_clarity: 15,
      realistic_ambition: 15,
      challenge_anticipation: 10,
      leadership_approach: 10,
      reasoning: "Using fallback scoring due to AI unavailability"
    };

    try {
      const skillPrompt = `You are analyzing Q4 and Q5 of a leadership assessment. Score the candidate's goal-setting capability and leadership style.

Q4 - "What's the most significant achievement you want to accomplish in Yi Erode 2026? Describe a specific, ambitious goal you want to reach this year. What impact do you want to create, what challenges do you expect to face, and what success would look like?"
RESPONSE: "${achievementStory}"

Q5 - "Your team misses a critical deadline. What's your first instinct?"
RESPONSE: ${leadershipStyle}

Score these dimensions:
1. GOAL CLARITY (0-30): How specific, measurable, and well-defined is their 2026 goal? Vague aspirations = 10-15, some specificity = 16-23, crystal clear goal = 24-30
2. REALISTIC AMBITION (0-30): Is the goal ambitious yet achievable within 2026 Yi Erode context? Too easy/unrealistic = 10-15, balanced = 16-23, perfectly ambitious = 24-30
3. CHALLENGE ANTICIPATION (0-20): Do they demonstrate realistic awareness of obstacles? No obstacles mentioned = 5-10, some awareness = 11-15, thorough understanding = 16-20
4. LEADERSHIP APPROACH (0-20): Does their natural style fit EC work? Poor fit = 5-10, okay fit = 11-15, strong fit = 16-20

Consider leadership style meanings:
- "leader": Takes ownership, rallies team (Chair/Co-Chair profile)
- "doer": Gets hands dirty, delivers (Vertical Lead profile)
- "learning": Reflects, improves process (EM/Advisor profile)
- "strategic": Assesses impact, prioritizes (Chair/Advisor profile)

Return scores and brief reasoning.`;

      const skillResult = await callAI(
        [
          { role: "system", content: "You are an expert at assessing execution capability and leadership potential." },
          { role: "user", content: skillPrompt }
        ],
        [
          {
            type: "function",
            function: {
              name: "score_skill",
              description: "Score goal-setting capability and leadership style fit",
              parameters: {
                type: "object",
                properties: {
                  goal_clarity: { type: "integer", minimum: 0, maximum: 30 },
                  realistic_ambition: { type: "integer", minimum: 0, maximum: 30 },
                  challenge_anticipation: { type: "integer", minimum: 0, maximum: 20 },
                  leadership_approach: { type: "integer", minimum: 0, maximum: 20 },
                  reasoning: { type: "string" }
                },
                required: ["goal_clarity", "realistic_ambition", "challenge_anticipation", "leadership_approach", "reasoning"],
                additionalProperties: false
              }
            }
          }
        ]
      );

      const toolCall = skillResult.choices[0].message.tool_calls[0];
      skillBreakdown = JSON.parse(toolCall.function.arguments);
      skillScore = 
        skillBreakdown.goal_clarity +
        skillBreakdown.realistic_ambition +
        skillBreakdown.challenge_anticipation +
        skillBreakdown.leadership_approach;
    } catch (error) {
      console.error("SKILL scoring failed:", error);
    }

    console.log(`SKILL Score: ${skillScore}`, skillBreakdown);

    // 6. DETERMINE ROLE BASED ON 4D THRESHOLDS
    let recommendedRole = "EC Member";
    let roleExplanation = "";

    const po = personalOwnershipScore;
    const ir = impactReadinessScore;
    const will = willScore;
    const skill = skillScore;

    // Role thresholds (in priority order)
    if (po >= 70 && ir >= 60 && will >= 65 && skill >= 60) {
      recommendedRole = "Chair / Co-Chair";
      roleExplanation = `Strong across all dimensions - Personal Ownership (${po}), Impact Readiness (${ir}), Commitment (${will}), and Execution (${skill}). Ready for top leadership roles.`;
    } else if (po >= 60 && ir >= 50 && will >= 55 && skill >= 50) {
      recommendedRole = "Vertical Lead";
      roleExplanation = `Solid performance across dimensions - Personal Ownership (${po}), Impact Readiness (${ir}), Commitment (${will}), and Execution (${skill}). Well-suited to lead a specific vertical.`;
    } else if (po >= 50 && ir >= 40 && will >= 50 && skill >= 45) {
      recommendedRole = "EC Member";
      roleExplanation = `Good baseline in all areas - Personal Ownership (${po}), Impact Readiness (${ir}), Commitment (${will}), and Execution (${skill}). Ready to contribute as an EC member.`;
    } else if (po >= 40 && (ir >= 70 || skill >= 70) && will >= 40) {
      recommendedRole = "Advisor / Specialist";
      roleExplanation = `Exceptional in specific area${ir >= 70 ? ' (Impact Planning)' : ' (Execution)'}. Personal Ownership (${po}), Impact Readiness (${ir}), Commitment (${will}), Execution (${skill}). Best suited for specialized advisory role.`;
    } else {
      recommendedRole = "Needs Development";
      roleExplanation = `Current scores - Personal Ownership (${po}), Impact Readiness (${ir}), Commitment (${will}), Execution (${skill}). Consider building experience before taking on EC responsibilities.`;
    }

    // 7. DETERMINE QUADRANT (mapped to Q1-Q4 for database)
    let quadrant = "Q4"; // developing
    if (will >= 60 && skill >= 60) {
      quadrant = "Q1"; // leader
    } else if (will >= 60 && skill < 60) {
      quadrant = "Q2"; // enthusiast
    } else if (will < 60 && skill >= 60) {
      quadrant = "Q3"; // specialist
    } else {
      quadrant = "Q4"; // developing
    }

    // 8. MATCH VERTICALS (use Q1 priorities)
    const { data: allVerticals } = await supabase
      .from("verticals")
      .select("id, name")
      .eq("is_active", true)
      .order("display_order");

    let verticalMatches: string[] = [];

    // Use candidate's Q1 selections directly
    verticalMatches = [q1Data.priority1, q1Data.priority2, q1Data.priority3]
      .filter(Boolean) as string[];

    // 9. GENERATE KEY INSIGHTS AND RECOMMENDATIONS
    const insightsPrompt = `Provide strategic insights for this leadership candidate:

SCORES (0-100 scale):
- Personal Ownership: ${personalOwnershipScore} (passion for community problem)
- Impact Readiness: ${impactReadinessScore} (ability to create change at scale)
- WILL (Commitment): ${willScore} (willingness to sacrifice for the cause)
- SKILL (Execution): ${skillScore} (track record of getting things done)

RECOMMENDED ROLE: ${recommendedRole}
LEADERSHIP STYLE: ${leadershipStyle}

KEY RESPONSES:
Problem they care about: "${problemDescription.substring(0, 200)}..."
Initiative idea: "${initiativeDesign.substring(0, 200)}..."
Achievement: "${achievementStory.substring(0, 150)}..."

Provide:
1. Top 3 strengths (be specific to their responses)
2. Top 3 development areas (actionable areas for growth)
3. 3-4 specific recommendations for their Yi Erode journey`;

    let keyStrengths: string[] = ["Engaged and willing to contribute", "Shows up when needed", "Team-oriented approach"];
    let developmentAreas: string[] = ["Build leadership experience", "Develop strategic thinking", "Strengthen execution skills"];
    let recommendations: string[] = ["Attend Yi leadership workshops", "Shadow current EC members", "Take on small project leadership roles"];

    try {
      const insightsResult = await callAI(
        [
          { role: "system", content: "You are providing career development insights for student leaders." },
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
                  key_strengths: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 3
                  },
                  development_areas: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 3
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 4
                  }
                },
                required: ["key_strengths", "development_areas", "recommendations"],
                additionalProperties: false
              }
            }
          }
        ]
      );

      const toolCall = insightsResult.choices[0].message.tool_calls[0];
      const insights = JSON.parse(toolCall.function.arguments);
      
      keyStrengths = insights.key_strengths;
      developmentAreas = insights.development_areas;
      recommendations = insights.recommendations;
    } catch (error) {
      console.error("Insights generation failed:", error);
    }

    // 10. SAVE RESULTS TO DATABASE
    const resultData = {
      assessment_id: assessmentId,
      personal_ownership_score: personalOwnershipScore,
      impact_readiness_score: impactReadinessScore,
      will_score: willScore,
      skill_score: skillScore,
      quadrant,
      recommended_role: recommendedRole,
      role_explanation: roleExplanation,
      vertical_matches: verticalMatches,
      key_strengths: keyStrengths,
      development_areas: developmentAreas,
      recommendations,
      scoring_breakdown: {
        personal_ownership: personalOwnershipBreakdown,
        impact_readiness: impactReadinessBreakdown,
        will: willBreakdown,
        skill: skillBreakdown,
      },
      leadership_style: leadershipStyle,
    };

    const { error: insertError } = await supabase
      .from("assessment_results")
      .upsert(resultData, { onConflict: "assessment_id" });

    if (insertError) {
      console.error("Error inserting results:", insertError);
      throw insertError;
    }

    console.log("Analysis complete:", {
      personalOwnershipScore,
      impactReadinessScore,
      willScore,
      skillScore,
      recommendedRole,
    });

    return new Response(
      JSON.stringify({
        success: true,
        scores: {
          personal_ownership: personalOwnershipScore,
          impact_readiness: impactReadinessScore,
          will: willScore,
          skill: skillScore,
        },
        recommended_role: recommendedRole,
        quadrant,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-assessment:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
