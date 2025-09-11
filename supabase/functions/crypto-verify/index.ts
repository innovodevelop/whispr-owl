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
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 verification attempts per minute per IP

function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const key = `verify_rate_limit_${clientIP}`;
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
  
  const { challenge_id, signature } = data;
  
  if (!challenge_id || typeof challenge_id !== 'string') {
    return { isValid: false, error: 'challenge_id must be a non-empty string' };
  }
  
  if (!signature || typeof signature !== 'string') {
    return { isValid: false, error: 'signature must be a non-empty string' };
  }
  
  // Validate UUID format for challenge_id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(challenge_id)) {
    return { isValid: false, error: 'challenge_id must be a valid UUID' };
  }
  
  // Basic signature validation (should be base64-like)
  if (signature.length < 10 || !/^[A-Za-z0-9+/=]+$/.test(signature)) {
    return { isValid: false, error: 'signature format is invalid' };
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
    console.warn(`Rate limit exceeded for verification from IP: ${clientIP}`);
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
      console.warn(`Invalid verification input from IP ${clientIP}:`, validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { challenge_id, signature } = requestData;
    console.log(`Verifying challenge: ${challenge_id} from IP: ${clientIP}`);

    // Get challenge from database
    const { data: challenge, error: challengeError } = await supabase
      .from('crypto_challenges')
      .select('*')
      .eq('challenge_id', challenge_id)
      .eq('used', false)
      .single();

    if (challengeError || !challenge) {
      console.error('Challenge not found:', challengeError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired challenge' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if challenge is expired
    const now = new Date();
    const expiresAt = new Date(challenge.expires_at);
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ error: 'Challenge expired' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user's public key
    const { data: user, error: userError } = await supabase
      .from('crypto_users')
      .select('public_key')
      .eq('user_id', challenge.user_id)
      .single();

    if (userError || !user) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify signature using Web Crypto API
    try {
      // Import the public key
      const publicKeyJwk = JSON.parse(atob(user.public_key));
      const publicKey = await crypto.subtle.importKey(
        "jwk",
        publicKeyJwk,
        { name: "Ed25519", namedCurve: "Ed25519" },
        false,
        ["verify"]
      );

      // Verify the signature
      const encoder = new TextEncoder();
      const data = encoder.encode(challenge.challenge_string);
      const signatureBytes = new Uint8Array(
        atob(signature).split('').map(char => char.charCodeAt(0))
      );

      const isValid = await crypto.subtle.verify(
        "Ed25519",
        publicKey,
        signatureBytes,
        data
      );

      if (!isValid) {
        console.log('Invalid signature for challenge:', challenge_id);
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Mark challenge as used
      await supabase
        .from('crypto_challenges')
        .update({ used: true })
        .eq('challenge_id', challenge_id);

      // Generate a simple token (in production, use proper JWT)
      const token = btoa(JSON.stringify({
        user_id: challenge.user_id,
        issued_at: Date.now(),
        expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      }));

      console.log('Authentication successful for user:', challenge.user_id);

      return new Response(
        JSON.stringify({
          success: true,
          user_id: challenge.user_id,
          token: token,
          message: 'Authentication successful'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (cryptoError) {
      console.error('Crypto verification error:', cryptoError);
      return new Response(
        JSON.stringify({ error: 'Signature verification failed' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});