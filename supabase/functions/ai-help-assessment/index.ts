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
Help candidates articulate their personal connection to community problems in an authentic, compelling way.
Provide 3-4 specific writing suggestions that help them:
1. Express the emotional impact of the problem
2. Share a specific moment that drove their concern
3. Explain why this problem matters personally
4. Connect their concern to broader community impact

Keep suggestions practical, actionable, and encourage genuine personal reflection.`;

      userPrompt = `Question: "${questionTitle}"
Scenario: Describe a problem in Erode/your community that IRRITATES you so much you can't ignore it. What specific moment made you feel 'I have to do something about this'?

Current text (${currentText?.length || 0} characters): ${currentText || 'Nothing written yet'}

Provide 3-4 specific suggestions to improve this answer. Focus on helping them express authentic personal connection.`;

    } else if (questionType === 'long-text') {
      if (questionNumber === 2) {
        systemPrompt = `You are a helpful writing assistant for Yi Erode leadership assessment.
Help candidates design practical, impactful initiatives with clear strategic thinking.
Provide 3-4 specific suggestions that help them:
1. Define clear, measurable objectives
2. Identify specific target audiences and how to reach them
3. Plan concrete activities and partnerships
4. Explain the expected change/impact

Keep suggestions practical and focused on realistic implementation.`;

        userPrompt = `Question: "${questionTitle}"
Scenario: ${scenario}

Current text (${currentText?.length || 0} characters): ${currentText || 'Nothing written yet'}

Provide 3-4 specific suggestions to strengthen their initiative design. Focus on clarity, feasibility, and impact.`;

      } else if (questionNumber === 3) {
        systemPrompt = `You are a helpful writing assistant for Yi Erode leadership assessment.
Help candidates honestly express their commitment and boundaries in a weekend emergency scenario.
Provide 3-4 specific suggestions that help them:
1. Give an honest, authentic response (not what they think we want to hear)
2. Explain their reasoning and any constraints they face
3. Show how they would handle the situation responsibly
4. Demonstrate self-awareness about their capacity and priorities

Encourage genuine reflection over "ideal" answers.`;

        userPrompt = `Question: "${questionTitle}"
Scenario: ${scenario}

Current text (${currentText?.length || 0} characters): ${currentText || 'Nothing written yet'}

Provide 3-4 specific suggestions to help them express an honest, thoughtful response. Encourage authenticity over perfectionism.`;

      } else if (questionNumber === 4) {
        systemPrompt = `You are a helpful writing assistant for Yi Erode leadership assessment.
Help candidates showcase their achievements with specific evidence and reflection.
Provide 3-4 specific suggestions that help them:
1. Describe what they actually did (actions taken)
2. Explain specific obstacles they overcame
3. Share measurable outcomes or impact
4. Reflect on what they learned

Keep suggestions focused on concrete details and genuine learning.`;

        userPrompt = `Question: "${questionTitle}"
Scenario: ${scenario}

Current text (${currentText?.length || 0} characters): ${currentText || 'Nothing written yet'}

Provide 3-4 specific suggestions to strengthen their achievement story. Focus on specific details, challenges overcome, and outcomes.`;
      }

    } else if (questionType === 'radio') {
      systemPrompt = `You are a helpful assistant for Yi Erode leadership assessment.
Help candidates understand what each leadership style option reveals about their natural approach.
Provide a brief explanation of what each option means and when it's most effective.`;

      userPrompt = `Question: "${questionTitle}"
Scenario: ${scenario}

Current selection: ${currentText || 'None selected yet'}

Provide a brief explanation (3-4 sentences) helping them understand what each leadership style option means and encouraging them to choose based on their natural instinct.`;
    }

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`Lovable AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const suggestions = aiData.choices[0].message.content;

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
