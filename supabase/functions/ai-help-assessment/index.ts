import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      questionNumber, 
      questionTitle, 
      questionType, 
      currentText, 
      scenario,
      adaptedQuestionText,
      adaptationContext,
      previousResponses 
    } = await req.json();

    if (!questionNumber || !questionTitle || !questionType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: questionNumber, questionTitle, questionType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build context-specific prompt based on question type
    let systemPrompt = '';
    let userPrompt = '';

    if (questionType === 'irritation-vertical') {
      systemPrompt = `You are a helpful writing assistant for Yi Erode leadership assessment. 
Generate 3 complete, authentic example responses that candidates can choose from.
Each response should:
1. Express genuine emotional impact of a community problem
2. Share a specific moment that drove their concern
3. Explain why this problem matters personally
4. Connect their concern to broader community impact

Make each example DIFFERENT - cover different topics like education, sanitation, youth engagement, infrastructure, or environment.
Each response should be approximately 400 characters (about 50% of the 800 character limit) and feel personal and authentic.`;

      userPrompt = `Question: "${questionTitle}"
Scenario: Describe a problem in Erode/your community that IRRITATES you so much you can't ignore it. What specific moment made you feel 'I have to do something about this'?

Current text (${currentText?.length || 0} characters): ${currentText || 'Nothing written yet'}

Generate 3 complete, different example responses covering different community problems in Erode.`;

    } else if (questionType === 'long-text') {
      if (questionNumber === 2) {
        const problemContext = previousResponses?.q1_part_a || 'a community problem';
        const verticals = previousResponses?.q1_verticals || [];
        const hasContext = previousResponses?.q1_part_a && verticals.length > 0;
        
        if (hasContext) {
          systemPrompt = `You are a helpful writing assistant for Yi Erode leadership assessment.
The candidate described this problem: "${problemContext.substring(0, 200)}..."
They selected these focus areas: ${verticals.join(', ')}

Generate 3 complete initiative design examples specifically addressing THEIR problem.
Each response should:
1. Directly address the problem they described
2. Align with their selected verticals
3. Include clear, measurable objectives for reaching 10,000+ people
4. Plan concrete activities within ₹50,000 and 6 months
5. Explain expected change/impact

Make each example DIFFERENT approaches to solving THEIR specific problem.
Each response should be approximately 500 characters (50% of limit) and feel personally relevant.`;

          userPrompt = `Their Problem: "${problemContext}"
Selected Verticals: ${verticals.join(', ')}
Adapted Scenario: ${adaptedQuestionText || scenario}

Current text (${currentText?.length || 0} characters): ${currentText || 'Nothing written yet'}

Generate 3 initiative examples specifically for THEIR problem, not generic examples.`;
        } else {
          systemPrompt = `You are a helpful writing assistant for Yi Erode leadership assessment.
Generate 3 complete, practical initiative design examples that candidates can choose from.
Each response should:
1. Define clear, measurable objectives
2. Identify specific target audiences and how to reach them
3. Plan concrete activities and partnerships
4. Explain the expected change/impact

Make each example DIFFERENT - different approaches, strategies, and community problems.
Each response should be approximately 500 characters (about 50% of the 1000 character limit) and feel realistic and implementable.`;

          userPrompt = `Question: "${questionTitle}"
Scenario: ${scenario}

Current text (${currentText?.length || 0} characters): ${currentText || 'Nothing written yet'}

Generate 3 complete, different initiative design examples with different approaches to reaching 10,000+ people.`;
        }

      } else if (questionNumber === 3) {
        const initiativeContext = previousResponses?.q2_initiative || 'their initiative';
        const hasContext = previousResponses?.q2_initiative;
        
        if (hasContext) {
          systemPrompt = `You are a helpful writing assistant for Yi Erode leadership assessment.
The candidate designed this initiative: "${initiativeContext.substring(0, 200)}..."

Generate 3 honest response examples to a Saturday deadline crisis for THEIR initiative.
Each response should:
1. Reference their specific initiative context
2. Show different commitment levels (immediate yes, conditional yes, apologetic no)
3. Explain reasoning and constraints honestly
4. Demonstrate responsibility and self-awareness

Make each example show different availability levels while staying authentic.
Each response should be approximately 250 characters (50% of limit).`;

          userPrompt = `Their Initiative: "${initiativeContext}"
Crisis Scenario: ${adaptedQuestionText || scenario}

Current text (${currentText?.length || 0} characters): ${currentText || 'Nothing written yet'}

Generate 3 responses showing different commitment levels for THEIR specific initiative.`;
        } else {
          systemPrompt = `You are a helpful writing assistant for Yi Erode leadership assessment.
Generate 3 complete, honest response examples that candidates can choose from.
Each response should:
1. Give an honest, authentic response showing different levels of availability
2. Explain their reasoning and any constraints they face
3. Show how they would handle the situation responsibly
4. Demonstrate self-awareness about their capacity

Make each example DIFFERENT - show different commitment levels (immediate yes, conditional yes, apologetic no).
Each response should be approximately 250 characters (about 50% of the 500 character limit) and feel genuine.`;

          userPrompt = `Question: "${questionTitle}"
Scenario: ${scenario}

Current text (${currentText?.length || 0} characters): ${currentText || 'Nothing written yet'}

Generate 3 complete, different honest responses showing various commitment levels and boundary-setting approaches.`;
        }

      } else if (questionNumber === 4) {
        const problemContext = previousResponses?.q1_part_a || 'community issues';
        const initiativeContext = previousResponses?.q2_initiative || 'community work';
        const hasContext = previousResponses?.q1_part_a || previousResponses?.q2_initiative;
        
        if (hasContext) {
          systemPrompt = `You are a helpful writing assistant for Yi Erode leadership assessment.
Based on their interests:
- Problem: "${problemContext.substring(0, 150)}..."
- Initiative: "${initiativeContext.substring(0, 150)}..."

The candidate is being asked about their 2026 aspirations for Yi Erode.

Generate 3 FUTURE-ORIENTED goal examples in domains RELEVANT to their interests.
Each response should:
1. Describe a specific, ambitious goal they could pursue in Yi Erode 2026
2. Connect naturally to their problem/initiative interests but show bigger thinking
3. Explain the impact they want to create and why it matters
4. Anticipate realistic challenges they might face (resources, buy-in, scale, etc.)
5. Define what success would look like by end of 2026 with measurable criteria

Make each example cover DIFFERENT goal types (e.g., scaling their initiative, starting something new, building capacity, creating systemic change) relevant to THEIR context.
Each response should be approximately 200 characters (50% of limit) and feel aspirational yet achievable.`;

          userPrompt = `Their Context:
Problem Interest: "${problemContext.substring(0, 100)}..."
Initiative Type: "${initiativeContext.substring(0, 100)}..."

Adapted Scenario: ${adaptedQuestionText || scenario}

Current text (${currentText?.length || 0} characters): ${currentText || 'Nothing written yet'}

Generate 3 aspirational 2026 goal examples specifically connected to THEIR interests in Yi Erode, not generic goals.`;
        } else {
          systemPrompt = `You are a helpful writing assistant for Yi Erode leadership assessment.

The candidate is being asked about their aspirations for Yi Erode 2026.

Generate 3 complete future goal examples that candidates can draw inspiration from.
Each response should:
1. Describe a specific, ambitious goal for Yi Erode 2026
2. Explain the impact they want to create
3. Anticipate realistic challenges (resources, buy-in, scale, sustainability)
4. Define what success looks like with measurable criteria

Make each example DIFFERENT - capacity building, community impact, innovation, systems change, etc.
Each response should be approximately 200 characters (about 50% of the 400 character limit) and feel aspirational yet grounded.`;

          userPrompt = `Question: "${questionTitle}"
Scenario: ${scenario}

Current text (${currentText?.length || 0} characters): ${currentText || 'Nothing written yet'}

Generate 3 complete, different future goal examples for Yi Erode 2026 covering different types of aspirations.`;
        }
      }

    } else if (questionType === 'radio') {
      const initiativeContext = previousResponses?.q2_initiative || 'their initiative';
      const hasContext = previousResponses?.q2_initiative && questionNumber === 5;
      
      if (hasContext) {
        systemPrompt = `You are a helpful assistant for Yi Erode leadership assessment.
The candidate designed this initiative: "${initiativeContext.substring(0, 200)}..."

Explain each leadership style option in the context of THEIR specific initiative.
Show how each style would apply to their particular project and team dynamics.
Provide 3-4 sentences per style.`;

        userPrompt = `Their Initiative: "${initiativeContext}"
Scenario: ${adaptedQuestionText || scenario}

Current selection: ${currentText || 'None selected yet'}

Explain each leadership style specifically in the context of THEIR initiative.`;
      } else {
        systemPrompt = `You are a helpful assistant for Yi Erode leadership assessment.
Provide a brief explanation of what each leadership style option means and when it's most effective.`;

        userPrompt = `Question: "${questionTitle}"
Scenario: ${scenario}

Current selection: ${currentText || 'None selected yet'}

Provide a brief explanation (3-4 sentences) helping them understand what each leadership style option means.`;
      }
    }

    // Call Lovable AI with tool calling for structured output
    const body: any = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
    };

    // Only use tool calling for non-radio questions
    if (questionType !== 'radio') {
      body.tools = [
        {
          type: "function",
          function: {
            name: "provide_suggestions",
            description: "Return 3 complete example responses for the assessment question.",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Brief title describing this approach (3-5 words)" },
                      content: { type: "string", description: "Complete response text" }
                    },
                    required: ["title", "content"],
                    additionalProperties: false
                  },
                  minItems: 3,
                  maxItems: 3
                }
              },
              required: ["suggestions"],
              additionalProperties: false
            }
          }
        }
      ];
      body.tool_choice = { type: "function", function: { name: "provide_suggestions" } };
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`Lovable AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    let suggestions;
    if (questionType === 'radio') {
      suggestions = aiData.choices[0].message.content;
    } else {
      const toolCall = aiData.choices[0].message.tool_calls?.[0];
      if (toolCall && toolCall.function) {
        const args = JSON.parse(toolCall.function.arguments);
        suggestions = args.suggestions;
      } else {
        throw new Error('No tool call response received');
      }
    }

    console.log('AI Help generated successfully for Q', questionNumber);

    return new Response(
      JSON.stringify({
        suggestions,
        questionNumber,
        questionType,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-help-assessment:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        fallback: 'Unable to generate AI suggestions at this time. Please continue writing based on your own thoughts and experiences.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
