import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionNumber, previousResponses } = await req.json();

    console.log('Adapting question:', { questionNumber, previousResponses });

    // Currently only supporting Q2 adaptation
    if (questionNumber !== 2) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Only Q2 adaptation is supported in this version' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required data for Q2
    const { q1_part_a, q1_verticals } = previousResponses || {};
    
    if (!q1_part_a || !q1_verticals || q1_verticals.length === 0) {
      console.log('Missing Q1 data, returning default');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing Q1 responses for adaptation',
          useDefault: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Step 1: Extract concise problem summary (2-5 words)
    console.log('Extracting problem summary...');
    const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting concise summaries. Extract a 2-5 word summary of the main problem described in the text. Be specific and use the exact terminology from the text.'
          },
          {
            role: 'user',
            content: `Extract a 2-5 word problem summary from this text:\n\n"${q1_part_a}"\n\nRespond with ONLY the 2-5 word summary, nothing else. Examples: "waste management issues", "lack of youth programs", "poor road conditions", "education quality gaps".`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!summaryResponse.ok) {
      const errorText = await summaryResponse.text();
      console.error('Failed to extract problem summary:', summaryResponse.status, errorText);
      throw new Error('Failed to extract problem summary');
    }

    const summaryData = await summaryResponse.json();
    const problemSummary = summaryData.choices[0].message.content.trim();
    console.log('Extracted problem summary:', problemSummary);

    // Step 2: Generate adapted Q2 scenario
    console.log('Generating adapted Q2 scenario...');
    
    const verticalsText = q1_verticals.join(', ');
    const defaultQ2 = "Let's say Yi Erode gives you 6 months and ₹50,000 to work on the problem you described in Q1. Design your initiative: What specific actions would you take? How would you reach 10,000+ people? What lasting change would you create?";

    const adaptationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are adapting assessment questions for Yi Erode leadership candidates. Create personalized questions that reference their responses while maintaining assessment integrity and constraints.'
          },
          {
            role: 'user',
            content: `Original Q2: "${defaultQ2}"

Candidate's problem (from Q1): "${q1_part_a.substring(0, 500)}"
Problem summary (2-5 words): "${problemSummary}"
Selected verticals: ${verticalsText}

Generate an adapted Q2 that:
1. Opens by acknowledging their specific problem using the summary (e.g., "You described being irritated by ${problemSummary}...")
2. Mentions they selected these verticals: ${verticalsText}
3. Maintains the exact constraints: 6 months and ₹50,000
4. Asks how they would reach 10,000+ people
5. Ends with asking about lasting change
6. Keep it conversational and encouraging
7. Total length should be 150-200 words

Respond with ONLY the adapted question text, nothing else.`
          }
        ],
        temperature: 0.5,
      }),
    });

    if (!adaptationResponse.ok) {
      const errorText = await adaptationResponse.text();
      console.error('Failed to generate adapted scenario:', adaptationResponse.status, errorText);
      throw new Error('Failed to generate adapted scenario');
    }

    const adaptationData = await adaptationResponse.json();
    const adaptedScenario = adaptationData.choices[0].message.content.trim();
    console.log('Generated adapted scenario:', adaptedScenario.substring(0, 100) + '...');

    return new Response(
      JSON.stringify({
        success: true,
        adaptedScenario,
        contextSummary: problemSummary,
        verticals: q1_verticals
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-adaptive-question:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        useDefault: true 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
