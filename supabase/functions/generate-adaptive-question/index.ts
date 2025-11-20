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

    // Support Q2, Q3, Q4, and Q5 adaptation
    if (questionNumber !== 2 && questionNumber !== 3 && questionNumber !== 4 && questionNumber !== 5) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Only Q2, Q3, Q4, and Q5 adaptation is supported in this version' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required data based on question number
    const { q1_part_a, q1_verticals, q2_initiative } = previousResponses || {};
    
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
    } else if (questionNumber === 5) {
      if (!q2_initiative) {
        console.log('Missing Q2 data for Q5, returning default');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing Q2 responses for Q5 adaptation',
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
    
    // Handle Q5 adaptation
    if (questionNumber === 5) {
      return await adaptQ5(q2_initiative!, LOVABLE_API_KEY, corsHeaders);
    }

    // Fallback if not Q2, Q3, Q4, or Q5
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Unsupported question number',
        useDefault: true 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-adaptive-question:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        useDefault: true 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Q2 Adaptation: Personalize based on Q1 problem and verticals
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
          content: 'You help make assessment questions personal for Yi Erode candidates. Keep it fair and the same for everyone.'
        },
        {
          role: 'user',
          content: `The person wrote about this problem (Q1):
"${problemText.substring(0, 400)}"

Write a short problem summary in 2-5 words that shows the main issue.
For example:
- "street dogs attacking children" → "street dog problem"
- "garbage piling up in markets" → "waste problem"
- "youth lacking opportunities" → "youth jobs"

IMPORTANT: Only write the 2-5 word summary, nothing else.`
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
  const defaultQ2 = "Yi Erode gives you 6 months and ₹50,000 to fix the problem from Q1. What would you do? Who would help you? How would you reach 10,000+ people? What change would you make?";

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
          content: 'You help make assessment questions personal for Yi Erode candidates. Make questions that use their answers but keep the test fair.'
        },
        {
          role: 'user',
          content: `Original Q2: "${defaultQ2}"

Person's problem (from Q1): "${problemText.substring(0, 200)}"
Problem in short (2-5 words): "${problemSummary}"
Areas they picked: ${verticalsText}

Make a new Q2 that:
1. Starts by talking about their problem using the short version (like "You said you care about [summary]...")
2. Says they picked these areas: ${verticalsText}
3. Keeps the same rules: 6 months and ₹50,000
4. Asks how they would reach 10,000+ people
5. Ends by asking what change they would make
6. Sound friendly and helpful
7. Be 150-200 words long

Write ONLY the new question, nothing else.`
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

  // Step 1: Extract initiative summary (3-6 words)
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
          content: 'You help make Q3 personal for Yi Erode candidates. Keep it fair for everyone.'
        },
        {
          role: 'user',
          content: `The person's Q2 plan:
"${initiativeText.substring(0, 300)}"

The person's Q1 problem:
"${problemText.substring(0, 200)}"

Write a short 3-6 word summary of their PLAN (what they're doing, not the problem).
For example:
- "awareness campaign about street dog safety" → "street dog safety campaign"
- "waste segregation training for vendors" → "waste training program"
- "youth skill development workshops" → "youth skills workshops"

IMPORTANT: Only write the 3-6 word plan summary, nothing else.`
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
          content: 'Get a short problem summary.'
        },
        {
          role: 'user',
          content: `Get a 2-5 word problem summary: "${problemText.substring(0, 300)}"`
        }
      ],
      temperature: 0.3,
    }),
  });

  const problemSummaryData = await problemSummaryResponse.json();
  const problemSummary = problemSummaryData.choices[0].message.content.trim();

  // Determine primary vertical
  const primaryVertical = verticals[0] || 'your chosen area';

  // Step 3: Generate adapted Q3 scenario
  const defaultQ3 = "It's Saturday, 6 PM. You're with family. Your team leader calls: 'We need help right now for tomorrow's big event. Can you come for 3-4 hours?' What would you say?";

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
          content: 'You help make Q3 personal for Yi Erode candidates. Keep it fair while making the crisis feel real to their work.'
        },
        {
          role: 'user',
          content: `Original Q3: "${defaultQ3}"

Person's plan summary: "${initiativeSummary}"
Person's problem focus: "${problemSummary}"
Main area: ${primaryVertical}

Make a new Q3 that:
1. Starts by saying they are working on ${initiativeSummary} in the ${primaryVertical} area
2. Keeps the same setup: Saturday 6 PM, family time, urgent call
3. Makes the urgent work about THEIR plan getting ready for the event
4. Asks for their honest answer
5. Sound real and direct
6. Be 80-120 words long

Write ONLY the new question, nothing else.`
        }
      ],
      temperature: 0.5,
    }),
  });

  if (!adaptationResponse.ok) {
    const errorText = await adaptationResponse.text();
    console.error('Failed to generate Q3 adapted scenario:', adaptationResponse.status, errorText);
    throw new Error('Failed to generate adapted scenario');
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
          content: 'You help find what areas people care about. Find their interest areas.'
        },
        {
          role: 'user',
          content: `Based on this problem: "${problemText.substring(0, 400)}"
And this plan: "${initiativeText.substring(0, 400)}"

What 2-3 areas would fit this person? 

Pick from: community health, schools, environment, youth help, roads, garbage, safety, social help, skills training, speaking up

Write ONLY a list with commas, nothing else.`
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
          content: 'Get a short problem summary.'
        },
        {
          role: 'user',
          content: `Get a 2-5 word problem summary: "${problemText.substring(0, 300)}"`
        }
      ],
      temperature: 0.3,
    }),
  });

  const problemSummaryData = await problemSummaryResponse.json();
  const problemSummary = problemSummaryData.choices[0].message.content.trim();

  // Step 3: Generate adapted Q4 scenario
  const defaultQ4 = "What do you want to do in Yi Erode 2026 that would make you really proud? What is your big goal? What change do you want to make? What problems might you face? How will you know you succeeded?";

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
          content: 'You help make Q4 personal for Yi Erode candidates. Keep it fair while connecting to what they care about.'
        },
        {
          role: 'user',
          content: `Original Q4: "${defaultQ4}"

Person's problem focus: "${problemSummary}"
Areas that matter: ${relevantDomains}

Make a new Q4 that:
1. Starts by saying they care about ${problemSummary} and work in ${relevantDomains}
2. Asks about their big goal for Yi Erode 2026 in THESE areas
3. Asks what change they want to make
4. Asks what problems they might face
5. Asks how they will know they won
6. Sound hopeful but real
7. Be 100-150 words long

Write ONLY the new question, nothing else.`
        }
      ],
      temperature: 0.5,
    }),
  });

  if (!adaptationResponse.ok) {
    const errorText = await adaptationResponse.text();
    console.error('Failed to generate Q4 adapted scenario:', adaptationResponse.status, errorText);
    throw new Error('Failed to generate adapted scenario');
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

// Q5 Adaptation: Frame the team deadline scenario around their initiative
async function adaptQ5(
  initiativeText: string,
  apiKey: string,
  corsHeaders: Record<string, string>
) {
  console.log('Adapting Q5 based on Q2...');

  // Step 1: Extract initiative summary (4-7 words)
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
          content: 'You help make Q5 personal. Keep it short.'
        },
        {
          role: 'user',
          content: `The person's Q2 plan:
"${initiativeText.substring(0, 250)}"

Write a 4-7 word summary of their plan that fits into:
"Your [SUMMARY] team misses an important deadline."

For example:
- "awareness campaign" → "street dog safety campaign"
- "training program" → "waste management training"
- "workshop series" → "youth skills workshop"

IMPORTANT: Only write the 4-7 word summary that fits the sentence, nothing else.`
        }
      ],
      temperature: 0.3,
    }),
  });

  if (!initiativeSummaryResponse.ok) {
    const errorText = await initiativeSummaryResponse.text();
    console.error('Failed to extract initiative summary for Q5:', initiativeSummaryResponse.status, errorText);
    throw new Error('Failed to extract initiative summary');
  }

  const initiativeSummaryData = await initiativeSummaryResponse.json();
  const initiativeSummary = initiativeSummaryData.choices[0].message.content.trim();
  console.log('Extracted initiative summary for Q5:', initiativeSummary);

  // Step 2: Generate adapted Q5 scenario
  const defaultQ5 = "Your team misses an important deadline. What do you do first?";

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
          content: 'You help make Q5 personal. Keep it short and direct.'
        },
        {
          role: 'user',
          content: `Original Q5: "${defaultQ5}"

Person's plan: ${initiativeSummary}

Make a new Q5 that:
1. Says the team working on "${initiativeSummary}" missed an important deadline
2. Makes it urgent and real
3. Ends with "What do you do first?"
4. Keep it short: 2-3 sentences max
5. Be 30-50 words

Write ONLY the new question, nothing else.`
        }
      ],
      temperature: 0.5,
    }),
  });

  if (!adaptationResponse.ok) {
    const errorText = await adaptationResponse.text();
    console.error('Failed to generate Q5 adapted scenario:', adaptationResponse.status, errorText);
    throw new Error('Failed to generate adapted scenario');
  }

  const adaptationData = await adaptationResponse.json();
  const adaptedScenario = adaptationData.choices[0].message.content.trim();
  console.log('Generated Q5 adapted scenario:', adaptedScenario.substring(0, 100) + '...');

  return new Response(
    JSON.stringify({
      success: true,
      adaptedScenario,
      contextSummary: initiativeSummary
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
