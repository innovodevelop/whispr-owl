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
      request_id, 
      device_code, 
      signature, 
      authorizing_user_id,
      new_device_public_key,
      device_name 
    } = await req.json();

    console.log('Processing device link request:', { request_id, has_device_code: !!device_code });

    // Validate input
    if (!request_id || !signature || !authorizing_user_id || !new_device_public_key) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: request_id, signature, authorizing_user_id, new_device_public_key' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get device link request from database
    let query = supabase
      .from('device_link_requests')
      .select('*')
      .eq('request_id', request_id)
      .eq('completed', false);

    // Add device code filter if provided
    if (device_code) {
      query = query.eq('device_code', device_code);
    }

    const { data: linkRequest, error: requestError } = await query.single();

    if (requestError || !linkRequest) {
      console.error('Device link request not found:', requestError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired device link request' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if request is expired
    const now = new Date();
    const expiresAt = new Date(linkRequest.expires_at);
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ error: 'Device link request expired' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get authorizing user's public key
    const { data: user, error: userError } = await supabase
      .from('crypto_users')
      .select('public_key')
      .eq('user_id', authorizing_user_id)
      .single();

    if (userError || !user) {
      console.error('Authorizing user not found:', userError);
      return new Response(
        JSON.stringify({ error: 'Authorizing user not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify signature using Web Crypto API
    try {
      // Import the authorizing user's public key
      const publicKeyJwk = JSON.parse(atob(user.public_key));
      const publicKey = await crypto.subtle.importKey(
        "jwk",
        publicKeyJwk,
        { name: "Ed25519", namedCurve: "Ed25519" },
        false,
        ["verify"]
      );

      // Verify the signature against the challenge
      const encoder = new TextEncoder();
      const data = encoder.encode(linkRequest.challenge_string);
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
        console.log('Invalid signature for device link request:', request_id);
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Generate device ID for the new device
      const newDeviceId = crypto.randomUUID();

      // Add the new device to the crypto_devices table
      const { data: newDevice, error: deviceError } = await supabase
        .from('crypto_devices')
        .insert({
          device_id: newDeviceId,
          user_id: authorizing_user_id,
          public_key: new_device_public_key,
          device_name: device_name || 'New Device'
        })
        .select()
        .single();

      if (deviceError) {
        console.error('Failed to add new device:', deviceError);
        return new Response(
          JSON.stringify({ error: 'Failed to link device' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Mark the device link request as completed
      await supabase
        .from('device_link_requests')
        .update({ completed: true })
        .eq('request_id', request_id);

      console.log('Device linked successfully:', newDeviceId);

      return new Response(
        JSON.stringify({
          success: true,
          device_id: newDevice.device_id,
          user_id: authorizing_user_id,
          message: 'Device linked successfully'
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
    console.error('Device linking error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});