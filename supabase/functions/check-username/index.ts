import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UsernameCheckRequest {
  username: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { username }: UsernameCheckRequest = await req.json();

    // Validate username format
    if (!username || typeof username !== 'string') {
      throw new Error('Username is required');
    }

    if (username.length < 3 || username.length > 24) {
      throw new Error('Username must be between 3 and 24 characters');
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain lowercase letters, numbers, and underscores');
    }

    console.log(`Checking availability for username: ${username}`);

    // Check if username exists in profiles table
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Profile check failed: ${profileError.message}`);
    }

    // Check if username exists in crypto_users table
    const { data: cryptoData, error: cryptoError } = await supabaseClient
      .from('crypto_users')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (cryptoError && cryptoError.code !== 'PGRST116') {
      throw new Error(`Crypto user check failed: ${cryptoError.message}`);
    }

    const available = !profileData && !cryptoData;

    console.log(`Username ${username} availability: ${available}`);

    return new Response(
      JSON.stringify({ 
        available,
        username: username
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Username check failed:', error);
    
    return new Response(
      JSON.stringify({ 
        available: false, 
        error: error.message || 'Username check failed' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});