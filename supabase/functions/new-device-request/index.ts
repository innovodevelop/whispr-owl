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

    const { requesting_device_id, use_device_code = false } = await req.json();

    console.log('Creating device link request:', { requesting_device_id, use_device_code });

    // Validate input
    if (!requesting_device_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: requesting_device_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate unique request ID and challenge
    const requestId = crypto.randomUUID();
    const challengeBytes = new Uint8Array(32);
    crypto.getRandomValues(challengeBytes);
    const challengeString = btoa(String.fromCharCode(...challengeBytes));
    
    // Generate device code if requested (6-digit code)
    let deviceCode = null;
    if (use_device_code) {
      deviceCode = Math.floor(100000 + Math.random() * 900000).toString();
    }
    
    // Set expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store device link request in database
    const { data: linkRequest, error } = await supabase
      .from('device_link_requests')
      .insert({
        request_id: requestId,
        requesting_device_id,
        challenge_string: challengeString,
        device_code: deviceCode,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create device link request' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Device link request created:', requestId);

    // Return the request data for QR code generation or device code display
    const response = {
      request_id: linkRequest.request_id,
      challenge_string: linkRequest.challenge_string,
      expires_at: linkRequest.expires_at,
      ...(deviceCode && { device_code: deviceCode })
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Device link request error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});