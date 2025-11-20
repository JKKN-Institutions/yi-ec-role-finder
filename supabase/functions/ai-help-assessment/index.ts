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

  // Declare at function scope so they're accessible in catch block
  let questionNumber: number | undefined;
  let questionType: string | undefined;

  try {
    const { 
      questionNumber: qNum, 
      questionTitle, 
      questionType: qType, 
      currentText, 
      scenario,
      adaptedQuestionText,
      adaptationContext,
      previousResponses 
    } = await req.json();

    // Assign to function-scope variables
    questionNumber = qNum;
    questionType = qType;

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
        
        // Debug logging to verify context is received
        console.log('Q2 AI Help Context:', {
          hasProblemContext: !!problemContext && problemContext !== 'a community problem',
          problemLength: problemContext?.length || 0,
          hasVerticals: verticals.length > 0,
          verticals: verticals,
          problemPreview: problemContext?.substring(0, 100)
        });
        
        if (hasContext) {
          systemPrompt = `You are a helpful writing assistant for Yi Erode leadership assessment.

The candidate wrote about this specific problem:
"${problemContext.substring(0, 300)}"

They selected these focus verticals: ${verticals.join(', ')}

Generate 3 initiative design examples that DIRECTLY respond to THEIR EXACT PROBLEM above.

CRITICAL: Each response MUST:
1. Start by referencing their specific problem in the first sentence (e.g., "To address [their problem]...")
2. Propose a concrete initiative that solves THEIR problem (not a generic one)
3. Align with their selected verticals: ${verticals.join(', ')}
4. Include measurable objectives for reaching 10,000+ people
5. Plan activities within ₹50,000 budget and 6-month timeline
6. Explain the expected change/impact specific to THEIR problem context

Make each example take a DIFFERENT approach to solving THE SAME PROBLEM they described.
Each response should be approximately 500 characters and feel personally crafted for THEIR situation.`;

          userPrompt = `CANDIDATE'S SPECIFIC PROBLEM (from Q1):
"${problemContext.substring(0, 400)}"

Selected Focus Areas: ${verticals.join(', ')}

The adapted Q2 scenario asks: ${adaptedQuestionText || scenario}

Current draft (${currentText?.length || 0} chars): ${currentText || 'Nothing written yet'}

Generate 3 initiative designs that solve THIS SPECIFIC PROBLEM (not generic issues).
Each suggestion must reference their exact problem in the opening sentence.`;
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
      
      // Handle rate limiting
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            suggestions: questionType === 'radio' 
              ? "We're experiencing high demand right now. Please try again in a moment, or continue with your own answer - your authentic voice matters most!"
              : [
                  { title: "High Demand", content: "We're experiencing high demand. Please continue with your own response - your authentic voice and personal experience are what matter most in this assessment." },
                  { title: "Rate Limited", content: "AI Help is temporarily unavailable due to high usage. Feel free to craft your own response based on the scenario provided." },
                  { title: "Continue Independently", content: "While AI assistance is temporarily unavailable, remember that your genuine thoughts and experiences are the most valuable part of this assessment." }
                ],
            questionNumber,
            questionType,
            error: 'rate_limited',
            message: 'AI Help temporarily unavailable due to high demand'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 // Return 200 with graceful degradation
          }
        );
      }
      
      // Handle payment required
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({
            suggestions: questionType === 'radio'
              ? "AI Help requires additional credits. Please contact support or continue with your own answer."
              : [
                  { title: "Credits Required", content: "AI Help requires additional credits. Your own perspective and experiences are equally valuable for this assessment." },
                  { title: "Manual Response", content: "Please continue by crafting your own response to the scenario. Your authentic voice is what we're looking for." },
                  { title: "Alternative Approach", content: "Consider drawing from your own experiences and ideas to answer this question independently." }
                ],
            questionNumber,
            questionType,
            error: 'payment_required',
            message: 'AI Help requires additional credits'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
      
      throw new Error(`Lovable AI request failed: ${aiResponse.status} - ${errorText}`);
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
        console.warn('No tool call response, using fallback');
        // Fallback structured suggestions
        suggestions = [
          { title: "Fallback Response", content: "AI tool calling failed. Please craft your own response to the question." },
          { title: "Manual Approach", content: "Draw from your own experiences and ideas to provide an authentic answer." },
          { title: "Independent Thinking", content: "Your genuine perspective is valuable - proceed with your own thoughts on this scenario." }
        ];
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

  } catch (error: any) {
    console.error('Error in ai-help-assessment:', error);
    
    // Provide graceful fallback based on question type
    const fallbackSuggestions = questionType === 'radio'
      ? "AI Help encountered an error. Please select the option that best represents your natural leadership style."
      : [
          { 
            title: "Error Occurred", 
            content: "AI Help encountered an issue. Please continue by crafting your own response based on your experiences and ideas." 
          },
          { 
            title: "Manual Response", 
            content: "While AI assistance is unavailable, your authentic voice and personal perspective are what truly matter in this assessment." 
          },
          { 
            title: "Independent Approach", 
            content: "Draw from your own experiences to provide a genuine, thoughtful response to the scenario presented." 
          }
        ];
    
    return new Response(
      JSON.stringify({
        suggestions: fallbackSuggestions,
        questionNumber: questionNumber,
        questionType: questionType,
        error: 'internal_error',
        message: error.message || 'An unexpected error occurred',
        fallback: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 for graceful degradation
      }
    );
  }
});
