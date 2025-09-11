import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Secure CORS headers - restrict to specific domains in production
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // TODO: Restrict to specific domains in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400', // 24 hours
};

// Rate limiting storage (in-memory for demo - use Redis in production)
const rateLimitStore = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const key = `rate_limit_${clientIP}`;
  const existing = rateLimitStore.get(key);
  
  if (!existing || now - existing.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(key, { count: 1, lastReset: now });
    return true;
  }
  
  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  existing.count++;
  return true;
}

function validateInput(data: any): { isValid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid request body' };
  }
  
  const { user_id } = data;
  
  if (!user_id || typeof user_id !== 'string') {
    return { isValid: false, error: 'user_id must be a non-empty string' };
  }
  
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(user_id)) {
    return { isValid: false, error: 'user_id must be a valid UUID' };
  }
  
  return { isValid: true };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  // Rate limiting check
  if (!checkRateLimit(clientIP)) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': '60'
        } 
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Enhanced input validation
    const validation = validateInput(requestData);
    if (!validation.isValid) {
      console.warn(`Invalid input from IP ${clientIP}:`, validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { user_id } = requestData;
    console.log(`Generating challenge for user: ${user_id} from IP: ${clientIP}`);

    // Check if user exists
    const { data: user } = await supabase
      .from('crypto_users')
      .select('user_id')
      .eq('user_id', user_id)
      .single();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate random challenge
    const challengeId = crypto.randomUUID();
    const challengeBytes = new Uint8Array(32);
    crypto.getRandomValues(challengeBytes);
    const challengeString = btoa(String.fromCharCode(...challengeBytes));
    
    // Set expiration time (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store challenge in database
    const { data: challenge, error } = await supabase
      .from('crypto_challenges')
      .insert({
        challenge_id: challengeId,
        user_id,
        challenge_string: challengeString,
        challenge_type: 'auth',
        expires_at: expiresAt
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create challenge' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Challenge created:', challengeId);

    return new Response(
      JSON.stringify({
        challenge_id: challenge.challenge_id,
        challenge_string: challenge.challenge_string,
        expires_at: challenge.expires_at
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Challenge generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});