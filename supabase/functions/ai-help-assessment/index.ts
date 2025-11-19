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
    const { questionNumber, questionTitle, questionType, currentText, scenario } = await req.json();

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

      } else if (questionNumber === 3) {
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

      } else if (questionNumber === 4) {
        systemPrompt = `You are a helpful writing assistant for Yi Erode leadership assessment.
Generate 3 complete achievement story examples that candidates can choose from.
Each response should:
1. Describe what they actually did (actions taken)
1. Share a specific achievement with concrete details
2. Explain specific obstacles they overcame
3. Share measurable outcomes or impact
4. Reflect on what they learned

Make each example DIFFERENT - academic, volunteer, personal, professional achievements.
Each response should be approximately 200 characters (about 50% of the 400 character limit) and showcase real impact.`;

        userPrompt = `Question: "${questionTitle}"
Scenario: ${scenario}

Current text (${currentText?.length || 0} characters): ${currentText || 'Nothing written yet'}

Generate 3 complete, different achievement stories covering different types of accomplishments.`;
      }

    } else if (questionType === 'radio') {
      systemPrompt = `You are a helpful assistant for Yi Erode leadership assessment.
Provide a brief explanation of what each leadership style option means and when it's most effective.`;

      userPrompt = `Question: "${questionTitle}"
Scenario: ${scenario}

Current selection: ${currentText || 'None selected yet'}

Provide a brief explanation (3-4 sentences) helping them understand what each leadership style option means.`;
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
