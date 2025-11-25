import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitConfig {
  key: string;           // Unique identifier (e.g., "analyze:assessment-id")
  limit: number;         // Max allowed calls
  windowSeconds: number; // Time window in seconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(
  supabase: any,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + config.windowSeconds * 1000);

  try {
    // Check existing rate limit record
    const { data: existing, error: selectError } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("key", config.key)
      .maybeSingle();

    if (selectError) {
      console.error("Rate limit check error:", selectError);
      // On error, allow the request but log the issue
      return { allowed: true, remaining: config.limit - 1, resetAt };
    }

    if (!existing) {
      // First request - create new record
      const { error: insertError } = await supabase.from("rate_limits").insert({
        key: config.key,
        count: 1,
        reset_at: resetAt.toISOString()
      });
      
      if (insertError) {
        console.error("Rate limit insert error:", insertError);
      }
      
      return { allowed: true, remaining: config.limit - 1, resetAt };
    }

    const existingResetAt = new Date(existing.reset_at);

    if (now > existingResetAt) {
      // Window expired - reset counter
      const { error: updateError } = await supabase
        .from("rate_limits")
        .update({ 
          count: 1, 
          reset_at: resetAt.toISOString(), 
          updated_at: now.toISOString() 
        })
        .eq("id", existing.id);
        
      if (updateError) {
        console.error("Rate limit reset error:", updateError);
      }
      
      return { allowed: true, remaining: config.limit - 1, resetAt };
    }

    if (existing.count >= config.limit) {
      // Rate limit exceeded
      console.log(`Rate limit exceeded for key: ${config.key}, count: ${existing.count}, limit: ${config.limit}`);
      return { allowed: false, remaining: 0, resetAt: existingResetAt };
    }

    // Increment counter
    const { error: updateError } = await supabase
      .from("rate_limits")
      .update({ 
        count: existing.count + 1, 
        updated_at: now.toISOString() 
      })
      .eq("id", existing.id);
      
    if (updateError) {
      console.error("Rate limit increment error:", updateError);
    }

    return { 
      allowed: true, 
      remaining: config.limit - existing.count - 1, 
      resetAt: existingResetAt 
    };
  } catch (error) {
    console.error("Rate limit error:", error);
    // On unexpected error, allow the request
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }
}
