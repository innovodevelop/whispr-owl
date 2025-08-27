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

    const { user_id } = await req.json();

    console.log('Generating challenge for user:', user_id);

    // Validate input
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: user_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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