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

    // Support Q2, Q3, and Q4 adaptation
    if (questionNumber !== 2 && questionNumber !== 3 && questionNumber !== 4) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Only Q2, Q3, and Q4 adaptation is supported in this version' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required data based on question number
    const { q1_part_a, q1_verticals, q2_initiative, q3_crisis } = previousResponses || {};
    
    if (questionNumber === 2) {
      if (!q1_part_a || !q1_verticals || q1_verticals.length === 0) {
        console.log('Missing Q1 data for Q2, returning default');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing Q1 responses for Q2 adaptation',
            useDefault: true 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (questionNumber === 3) {
      if (!q1_part_a || !q2_initiative) {
        console.log('Missing Q1/Q2 data for Q3, returning default');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing Q1/Q2 responses for Q3 adaptation',
            useDefault: true 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (questionNumber === 4) {
      if (!q1_part_a || !q2_initiative) {
        console.log('Missing Q1/Q2 data for Q4, returning default');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing Q1/Q2 responses for Q4 adaptation',
            useDefault: true 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Handle Q2 adaptation
    if (questionNumber === 2) {
      return await adaptQ2(q1_part_a!, q1_verticals!, LOVABLE_API_KEY, corsHeaders);
    }
    
    // Handle Q3 adaptation
    if (questionNumber === 3) {
      return await adaptQ3(q1_part_a!, q1_verticals || [], q2_initiative!, LOVABLE_API_KEY, corsHeaders);
    }
    
    // Handle Q4 adaptation
    if (questionNumber === 4) {
      return await adaptQ4(q1_part_a!, q1_verticals || [], q2_initiative!, LOVABLE_API_KEY, corsHeaders);
    }

    // Fallback if not Q2, Q3, or Q4
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Unsupported question number',
        useDefault: true 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

// Q2 Adaptation: Reference problem and verticals
async function adaptQ2(
  problemText: string, 
  verticals: string[], 
  apiKey: string,
  corsHeaders: Record<string, string>
) {
  // Step 1: Extract concise problem summary (2-5 words)
  console.log('Extracting problem summary for Q2...');
  const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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
          content: `Extract a 2-5 word problem summary from this text:\n\n"${problemText}"\n\nRespond with ONLY the 2-5 word summary, nothing else. Examples: "waste management issues", "lack of youth programs", "poor road conditions", "education quality gaps".`
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
  
  const verticalsText = verticals.join(', ');
  const defaultQ2 = "Let's say Yi Erode gives you 6 months and ₹50,000 to work on the problem you described in Q1. Design your initiative: What specific actions would you take? How would you reach 10,000+ people? What lasting change would you create?";

  const adaptationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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

Candidate's problem (from Q1): "${problemText.substring(0, 500)}"
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
    console.error('Failed to generate Q2 adapted scenario:', adaptationResponse.status, errorText);
    throw new Error('Failed to generate adapted scenario');
  }

  const adaptationData = await adaptationResponse.json();
  const adaptedScenario = adaptationData.choices[0].message.content.trim();
  console.log('Generated Q2 adapted scenario:', adaptedScenario.substring(0, 100) + '...');

  return new Response(
    JSON.stringify({
      success: true,
      adaptedScenario,
      contextSummary: problemSummary,
      verticals
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Q3 Adaptation: Reference problem, verticals, and initiative from Q2
async function adaptQ3(
  problemText: string,
  verticals: string[],
  initiativeText: string,
  apiKey: string,
  corsHeaders: Record<string, string>
) {
  console.log('Adapting Q3 based on Q1 and Q2...');

  // Step 1: Extract initiative summary (3-7 words)
  const initiativeSummaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting concise initiative summaries. Extract a 3-7 word summary that captures the core activity or campaign name.'
        },
        {
          role: 'user',
          content: `Extract a 3-7 word initiative summary from this text:\n\n"${initiativeText.substring(0, 600)}"\n\nRespond with ONLY the 3-7 word summary, nothing else. Examples: "community waste segregation campaign", "youth skills training program", "neighborhood cleanliness drive", "digital literacy workshops for students".`
        }
      ],
      temperature: 0.3,
    }),
  });

  if (!initiativeSummaryResponse.ok) {
    const errorText = await initiativeSummaryResponse.text();
    console.error('Failed to extract initiative summary:', initiativeSummaryResponse.status, errorText);
    throw new Error('Failed to extract initiative summary');
  }

  const initiativeSummaryData = await initiativeSummaryResponse.json();
  const initiativeSummary = initiativeSummaryData.choices[0].message.content.trim();
  console.log('Extracted initiative summary:', initiativeSummary);

  // Step 2: Extract problem summary for context
  const problemSummaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'Extract a 2-5 word problem summary.'
        },
        {
          role: 'user',
          content: `Extract a 2-5 word problem summary: "${problemText.substring(0, 300)}"`
        }
      ],
      temperature: 0.3,
    }),
  });

  const problemSummaryData = await problemSummaryResponse.json();
  const problemSummary = problemSummaryData.choices[0].message.content.trim();

  // Step 3: Get primary vertical (first one if available)
  const primaryVertical = verticals.length > 0 ? verticals[0] : 'your vertical';

  // Step 4: Generate adapted Q3 scenario
  const defaultQ3 = "It's Saturday, 6 PM. You're relaxing with family when your vertical head calls: 'We need urgent help preparing for tomorrow's major event. Can you come to the office now for 3-4 hours?' What's your honest response?";

  const adaptationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are adapting assessment questions for Yi Erode leadership candidates. Create personalized scenarios that reference their previous responses while maintaining the Saturday crisis test of commitment.'
        },
        {
          role: 'user',
          content: `Original Q3: "${defaultQ3}"

Context from previous questions:
- Problem they care about: ${problemSummary}
- Initiative they designed: ${initiativeSummary}
- Primary vertical: ${primaryVertical}

Generate an adapted Q3 that:
1. Sets the same scene: Saturday 6 PM, relaxing with family
2. References their PRIMARY VERTICAL (${primaryVertical}) as the caller
3. References their INITIATIVE (${initiativeSummary}) as what needs preparation for tomorrow's launch/event
4. Maintains the time pressure: come now for 3-4 hours
5. Ends with the same question: "What's your honest response?"
6. Keep it conversational and realistic
7. Total length should be 100-150 words

Example structure:
"It's Saturday, 6 PM. You're with family when your ${primaryVertical} vertical head calls: 'We need urgent help preparing for tomorrow's launch of your ${initiativeSummary}. Can you come to the office now for 3-4 hours to finalize materials?' What's your honest response?"

Respond with ONLY the adapted question text, nothing else.`
        }
      ],
      temperature: 0.5,
    }),
  });

  if (!adaptationResponse.ok) {
    const errorText = await adaptationResponse.text();
    console.error('Failed to generate Q3 adapted scenario:', adaptationResponse.status, errorText);
    throw new Error('Failed to generate Q3 adapted scenario');
  }

  const adaptationData = await adaptationResponse.json();
  const adaptedScenario = adaptationData.choices[0].message.content.trim();
  console.log('Generated Q3 adapted scenario:', adaptedScenario.substring(0, 100) + '...');

  return new Response(
    JSON.stringify({
      success: true,
      adaptedScenario,
      contextSummary: initiativeSummary,
      problemSummary,
      primaryVertical
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Q4 Adaptation: Ask for achievements relevant to their problem/initiative type
async function adaptQ4(
  problemText: string,
  verticals: string[],
  initiativeText: string,
  apiKey: string,
  corsHeaders: Record<string, string>
) {
  console.log('Adapting Q4 based on Q1 and Q2...');

  // Step 1: Determine the type of work/domain from Q1 and Q2
  const domainResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at identifying work domains and skill areas. Extract 2-4 relevant domains/skill areas that would be most relevant for demonstrating past achievements.'
        },
        {
          role: 'user',
          content: `Based on this problem: "${problemText.substring(0, 400)}"
And this initiative: "${initiativeText.substring(0, 400)}"

What 2-4 domains or skill areas would be most relevant for this person to highlight in past achievements? 

Examples: "community organizing", "environmental action", "youth engagement", "digital literacy", "health awareness", "infrastructure advocacy", "education programs"

Respond with ONLY a comma-separated list of 2-4 domains, nothing else.`
        }
      ],
      temperature: 0.3,
    }),
  });

  if (!domainResponse.ok) {
    const errorText = await domainResponse.text();
    console.error('Failed to extract domains:', domainResponse.status, errorText);
    throw new Error('Failed to extract domains');
  }

  const domainData = await domainResponse.json();
  const relevantDomains = domainData.choices[0].message.content.trim();
  console.log('Extracted relevant domains:', relevantDomains);

  // Step 2: Extract problem summary for context
  const problemSummaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'Extract a 2-5 word problem summary.'
        },
        {
          role: 'user',
          content: `Extract a 2-5 word problem summary: "${problemText.substring(0, 300)}"`
        }
      ],
      temperature: 0.3,
    }),
  });

  const problemSummaryData = await problemSummaryResponse.json();
  const problemSummary = problemSummaryData.choices[0].message.content.trim();

  // Step 3: Generate adapted Q4 scenario
  const defaultQ4 = "Describe your most significant achievement in the last 2 years - something you're genuinely proud of (can be academic, personal, volunteer, or professional). What did you do, what obstacles did you face, and what was the outcome?";

  const adaptationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are adapting assessment questions for Yi Erode leadership candidates. Create personalized questions that guide them to share relevant achievements while maintaining the SKILL assessment criteria.'
        },
        {
          role: 'user',
          content: `Original Q4: "${defaultQ4}"

Context from previous questions:
- Problem they care about: ${problemSummary}
- Relevant skill domains: ${relevantDomains}
- Selected verticals: ${verticals.join(', ')}

Generate an adapted Q4 that:
1. Acknowledges their passion for ${problemSummary}
2. References their initiative design showing interest in ${relevantDomains}
3. Asks for a significant achievement that demonstrates relevant execution skills
4. Specifically suggests looking for achievements in: ${relevantDomains}
5. Maintains the core criteria: what they did, obstacles faced, outcomes achieved
6. Still allows achievements from any domain (academic, personal, volunteer, professional)
7. Total length should be 150-180 words

Example structure:
"You've shown passion for ${problemSummary} and designed an initiative involving ${relevantDomains}. Now share a past achievement that demonstrates you can actually execute complex plans - ideally related to ${relevantDomains.split(',')[0]}, or any area where you've delivered tangible results. What obstacles did you overcome?"

Respond with ONLY the adapted question text, nothing else.`
        }
      ],
      temperature: 0.5,
    }),
  });

  if (!adaptationResponse.ok) {
    const errorText = await adaptationResponse.text();
    console.error('Failed to generate Q4 adapted scenario:', adaptationResponse.status, errorText);
    throw new Error('Failed to generate Q4 adapted scenario');
  }

  const adaptationData = await adaptationResponse.json();
  const adaptedScenario = adaptationData.choices[0].message.content.trim();
  console.log('Generated Q4 adapted scenario:', adaptedScenario.substring(0, 100) + '...');

  return new Response(
    JSON.stringify({
      success: true,
      adaptedScenario,
      contextSummary: relevantDomains,
      problemSummary,
      verticals
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
