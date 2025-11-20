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
      systemPrompt = `You help people write answers for Yi Erode assessment.
Write 3 simple example answers that candidates can pick from.
Each answer should:
1. Show how a community problem makes them feel
2. Tell about one moment that made them care
3. Say why this problem matters to them
4. Explain why others should care too

Make each example DIFFERENT - talk about different topics like schools, garbage, youth programs, roads, or environment.
Each answer should be about 400 letters (50% of the 800 limit) and sound real.`;

      userPrompt = `Question: "${questionTitle}"
Scenario: What problem in Erode bothers you the most? Tell us about the moment when you thought 'I need to fix this'.

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
          systemPrompt = `You help people write answers for Yi Erode assessment.

The person wrote about this problem:
"${problemContext.substring(0, 300)}"

They picked these areas: ${verticals.join(', ')}

Write 3 examples that DIRECTLY solve THEIR problem.

IMPORTANT: Each answer MUST:
1. Start by talking about their exact problem (like "To fix [their problem]...")
2. Give a real plan that solves THEIR problem (not something else)
3. Match their picked areas: ${verticals.join(', ')}
4. Include clear ways to reach 10,000+ people
5. Say who will help (partners, groups)
6. Explain what will change

Make each example take a DIFFERENT way to solve THE SAME PROBLEM.
Each answer should be about 500 letters and feel like it was made just for THEIR situation.`;

          userPrompt = `CANDIDATE'S SPECIFIC PROBLEM (from Q1):
"${problemContext.substring(0, 400)}"

Selected Focus Areas: ${verticals.join(', ')}

The adapted Q2 scenario asks: ${adaptedQuestionText || scenario}

Current draft (${currentText?.length || 0} chars): ${currentText || 'Nothing written yet'}

Generate 3 initiative designs that solve THIS SPECIFIC PROBLEM (not generic issues).
Each suggestion must reference their exact problem in the opening sentence.`;
        } else {
          systemPrompt = `You help people write answers for Yi Erode assessment.
Write 3 complete examples for a 6-month, ₹50,000 plan.

Q1 answers not available, using basic Q2 prompt.

Each answer should:
1. Say clear goals you can measure
2. Say who you want to reach and how to reach 10,000+ people
3. List clear actions and timeline
4. Explain what will change
5. Say who will help and what you need

Make each example DIFFERENT - talk about different problems (schools, garbage, youth programs, roads).
Each answer should be about 500 letters and feel real and doable.`;

          userPrompt = `Question: "${questionTitle}"
Scenario: ${scenario}

Current text (${currentText?.length || 0} characters): ${currentText || 'Nothing written yet'}

Generate 3 complete, different initiative design examples with different approaches to reaching 10,000+ people.`;
        }

      } else if (questionNumber === 3) {
        const initiativeContext = previousResponses?.q2_initiative || 'their initiative';
        const hasContext = previousResponses?.q2_initiative;
        
        if (hasContext) {
          systemPrompt = `You help people write answers for Yi Erode assessment.
The person made this plan: "${initiativeContext.substring(0, 200)}..."

Write 3 honest example answers for THEIR plan's Saturday deadline crisis.
Each answer should:
1. Talk about their specific plan
2. Show different choices (come now, come later, can't come)
3. Say why honestly
4. Handle it in a good way

Make each example show different choices while staying real.
Each answer should be about 250 letters (50% of limit).`;

          userPrompt = `Their Initiative: "${initiativeContext}"
Crisis Scenario: ${adaptedQuestionText || scenario}

Current text (${currentText?.length || 0} characters): ${currentText || 'Nothing written yet'}

Generate 3 responses showing different commitment levels for THEIR specific initiative.`;
        } else {
          systemPrompt = `You help people write answers for Yi Erode assessment.
Write 3 simple example answers that show different choices.
Each answer should:
1. Give an honest answer showing different levels of being free (can come right now, can come but later, sorry can't come)
2. Say why and any reasons they can't
3. Show how they would handle it in a good way
4. Be honest about what they can really do

Make each example DIFFERENT - show different answers (yes right now, yes but with conditions, sorry no).
Each answer should be about 250 letters (50% of the 500 limit) and sound real.`;

          userPrompt = `Question: "${questionTitle}"
Scenario: ${scenario}

Current text (${currentText?.length || 0} characters): ${currentText || 'Nothing written yet'}

Generate 3 complete, different response examples showing different commitment levels.`;
        }

      } else if (questionNumber === 4) {
        systemPrompt = `You help people write answers for Yi Erode assessment.

The person is being asked about their goals for Yi Erode 2026.

Write 3 simple examples of future goals.
Each answer should:
1. Say a clear, big goal for Yi Erode 2026
2. Say what good change they want to make
3. Talk about real problems they might face (money, people saying yes, growing bigger, keeping it going)
4. Say what success looks like with clear measures

Make each example DIFFERENT - helping people learn skills, helping community, new ideas, changing systems, etc.
Each answer should be about 200 letters (50% of the 400 limit) and feel big but real.`;

        userPrompt = `Question: "${questionTitle}"
Scenario: ${adaptedQuestionText || scenario}

Current text (${currentText?.length || 0} characters): ${currentText || 'Nothing written yet'}

Generate 3 complete goal statements for Yi Erode 2026, each with a different focus area.`;
      }

    } else if (questionType === 'radio') {
      systemPrompt = `You help people with Yi Erode assessment. Explain what each leadership style means and when it works best.`;
      
      userPrompt = `Question: "${questionTitle}"
Scenario: ${scenario || 'Leadership style selection'}

Explain what each leadership style option means and when it might work best, in a simple and friendly way.`;
    }

    // Build the request body
    const requestBody: any = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
    };

    // For non-radio questions, use tool calling to get structured output
    if (questionType !== 'radio') {
      requestBody.tools = [
        {
          type: 'function',
          function: {
            name: 'provide_suggestions',
            description: 'Provide 3 example response suggestions for the assessment question',
            parameters: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      content: { 
                        type: 'string',
                        description: 'The complete example response text'
                      }
                    },
                    required: ['content']
                  },
                  minItems: 3,
                  maxItems: 3
                }
              },
              required: ['suggestions']
            }
          }
        }
      ];
      requestBody.tool_choice = { type: 'function', function: { name: 'provide_suggestions' } };
    }

    console.log('Calling AI with question:', questionNumber, 'type:', questionType);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limit hit, returning graceful fallback');
        return new Response(
          JSON.stringify({ 
            suggestions: [
              { content: "We're getting a lot of requests right now. Please try again in a moment, or write your answer in your own words." }
            ],
            questionNumber,
            questionType,
            fallback: true 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Handle payment required
      if (response.status === 402) {
        console.log('Payment required, returning graceful fallback');
        return new Response(
          JSON.stringify({ 
            suggestions: [
              { content: "AI Help is temporarily unavailable. Please write your answer in your own words." }
            ],
            questionNumber,
            questionType,
            fallback: true 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    let suggestions;

    if (questionType === 'radio') {
      // For radio questions, return the direct content
      suggestions = [{ content: data.choices[0].message.content }];
    } else {
      // For other questions, extract from tool calls
      const toolCalls = data.choices[0].message.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        const functionArgs = JSON.parse(toolCalls[0].function.arguments);
        suggestions = functionArgs.suggestions;
      } else {
        // Fallback if tool calling fails
        console.warn('Tool calling failed, attempting to extract suggestions from content');
        const content = data.choices[0].message.content;
        
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(content);
          suggestions = parsed.suggestions || [{ content }];
        } catch {
          // If not JSON, return as single suggestion
          suggestions = [{ content }];
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        suggestions, 
        questionNumber,
        questionType 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-help-assessment:', error);
    
    // Return a graceful fallback response that won't break the UI
    return new Response(
      JSON.stringify({ 
        suggestions: [
          { content: "AI Help is having trouble right now. Please write your answer in your own words, or try again in a moment." }
        ],
        questionNumber: questionNumber || 0,
        questionType: questionType || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: true 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
