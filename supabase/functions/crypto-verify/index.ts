import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { challenge_id, signature } = await req.json();

    console.log('Verifying challenge:', challenge_id);

    // Validate input
    if (!challenge_id || !signature) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: challenge_id, signature' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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