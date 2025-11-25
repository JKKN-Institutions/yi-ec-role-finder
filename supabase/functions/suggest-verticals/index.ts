import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { checkRateLimit } from "../_shared/rate-limit.ts";

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
    const { problemDescription } = await req.json();

    if (!problemDescription || problemDescription.length < 50) {
      return new Response(
        JSON.stringify({ error: 'Problem description must be at least 50 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // RATE LIMITING: Max 10 calls per IP per minute
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';

    const rateLimitResult = await checkRateLimit(supabase, {
      key: `suggest:${clientIP}`,
      limit: 10,
      windowSeconds: 60 // 1 minute
    });

    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: 'Too many requests. Please wait a moment before trying again.',
          resetAt: rateLimitResult.resetAt 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch active verticals from database
    const { data: verticals, error: verticalsError } = await supabase
      .from('verticals')
      .select('id, name, description')
      .eq('is_active', true)
      .order('display_order');

    if (verticalsError || !verticals || verticals.length === 0) {
      console.error('Error fetching verticals:', verticalsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch verticals from database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare vertical context for AI
    const verticalsList = verticals.map((v, idx) => 
      `${idx + 1}. ${v.name} (ID: ${v.id})${v.description ? `: ${v.description}` : ''}`
    ).join('\n');

    // Call Lovable AI to analyze and suggest verticals
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are an expert at matching community problems with Yi Erode's vertical focus areas. 

Yi Erode Verticals:
${verticalsList}

Your task is to analyze the user's problem description and suggest 3-5 most relevant verticals based on:
- Direct keyword matches (e.g., "child safety" → Masoom)
- Thematic connections (e.g., "pollution" → Climate Change, "traffic accidents" → Road Safety)
- Target audience overlap (e.g., "students struggling" → Yuva, "school infrastructure" → Thalir)

Respond with ONLY a JSON array of vertical IDs (no other text). If no strong matches exist, return the 3 most general/relevant verticals. Always return 3-5 IDs.

Example format: ["uuid-1", "uuid-2", "uuid-3"]`
          },
          {
            role: 'user',
            content: `Problem description: "${problemDescription}"\n\nSuggest 3-5 relevant vertical IDs:`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      // Fallback: Return first 5 verticals if AI fails
      const fallbackIds = verticals.slice(0, 5).map(v => v.id);
      return new Response(
        JSON.stringify({ 
          suggestedVerticals: fallbackIds,
          fallback: true,
          message: 'Using default suggestions due to AI service unavailability'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiSuggestion = aiData.choices?.[0]?.message?.content?.trim();

    console.log('AI suggestion raw:', aiSuggestion);

    if (!aiSuggestion) {
      throw new Error('No suggestion received from AI');
    }

    // Parse AI response (should be JSON array of IDs)
    let suggestedIds: string[];
    try {
      suggestedIds = JSON.parse(aiSuggestion);
      
      // Validate that IDs exist in our verticals
      const validIds = suggestedIds.filter(id => 
        verticals.some(v => v.id === id)
      );

      // If less than 3 valid IDs, add from remaining verticals
      if (validIds.length < 3) {
        const remainingVerticals = verticals
          .filter(v => !validIds.includes(v.id))
          .slice(0, 5 - validIds.length);
        validIds.push(...remainingVerticals.map(v => v.id));
      }

      // Ensure we return 3-5 verticals
      suggestedIds = validIds.slice(0, 5);

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, 'Response:', aiSuggestion);
      // Fallback to first 5 verticals
      suggestedIds = verticals.slice(0, 5).map(v => v.id);
    }

    // Log the match for debugging
    console.log('Problem keywords:', problemDescription.toLowerCase().split(' ').filter((w: string) => w.length > 3).slice(0, 10));
    console.log('Suggested vertical IDs:', suggestedIds);
    console.log('Suggested vertical names:', 
      suggestedIds.map(id => verticals.find(v => v.id === id)?.name).filter(Boolean)
    );

    return new Response(
      JSON.stringify({ 
        suggestedVerticals: suggestedIds,
        verticalNames: suggestedIds.map(id => 
          verticals.find(v => v.id === id)?.name
        ).filter(Boolean)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-verticals:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Failed to analyze problem and suggest verticals'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
