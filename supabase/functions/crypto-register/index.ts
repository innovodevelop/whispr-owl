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

    const { 
      user_id, 
      device_id, 
      public_key, 
      recovery_phrase_hash, 
      device_fingerprint, 
      username 
    } = await req.json();

    console.log('Registering new crypto user:', { 
      user_id, 
      device_id,
      username,
      has_recovery: !!recovery_phrase_hash,
      has_fingerprint: !!device_fingerprint
    });

    // Validate input
    if (!user_id || !public_key) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, public_key' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('crypto_users')
      .select('user_id')
      .eq('user_id', user_id)
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'User already exists' }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Insert new crypto user with enhanced data
    const { data, error } = await supabase
      .from('crypto_users')
      .insert({
        user_id,
        device_id,
        public_key,
        recovery_phrase_hash,
        device_fingerprint,
        username
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to register user' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create device record if device_id is provided
    if (device_id) {
      const { error: deviceError } = await supabase
        .from('crypto_devices')
        .insert({
          user_id,
          device_id,
          public_key,
          device_fingerprint,
          device_name: `Device ${device_id.substring(0, 8)}`
        });

      if (deviceError) {
        console.warn('Failed to create device record:', deviceError);
        // Don't fail the whole registration for device record issues
      }
    }

    console.log('User registered successfully:', data.user_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: data.user_id,
        username: data.username,
        message: 'User registered successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});