import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UsernameCreateRequest {
  username: string;
  displayName?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { username, displayName }: UsernameCreateRequest = await req.json();

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

    console.log(`Creating username ${username} for user ${user.id}`);

    // Double-check availability
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    const { data: existingCryptoUser } = await supabaseClient
      .from('crypto_users')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (existingProfile || existingCryptoUser) {
      throw new Error('Username is already taken');
    }

    // Create or update profile with username and display name
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        user_id: user.id,
        username: username,
        display_name: displayName || null,
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }

    // Also update crypto_users if record exists
    const { error: cryptoUpdateError } = await supabaseClient
      .from('crypto_users')
      .update({
        username: username,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    // Don't fail if crypto_users update fails (user might not have a crypto record yet)
    if (cryptoUpdateError) {
      console.log('Crypto user update failed (this may be expected):', cryptoUpdateError.message);
    }

    console.log(`Username ${username} created successfully for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        username: username,
        displayName: displayName || null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Username creation failed:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Username creation failed' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});