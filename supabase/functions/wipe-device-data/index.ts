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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { deviceId } = await req.json();

    if (!deviceId) {
      return new Response(
        JSON.stringify({ error: 'Device ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the device belongs to the authenticated user
    const { data: device, error: deviceError } = await supabase
      .from('crypto_devices')
      .select('id, user_id')
      .eq('id', deviceId)
      .eq('user_id', user.id)
      .single();

    if (deviceError || !device) {
      return new Response(
        JSON.stringify({ error: 'Device not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start transaction to wipe device data
    // 1. Delete all conversations where this device was a participant
    const { error: conversationsError } = await supabase
      .from('conversations')
      .delete()
      .eq('participant_one', user.id)
      .or(`participant_two.eq.${user.id}`);

    if (conversationsError) {
      console.error('Error deleting conversations:', conversationsError);
    }

    // 2. Delete all messages sent by this user
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('sender_id', user.id);

    if (messagesError) {
      console.error('Error deleting messages:', messagesError);
    }

    // 3. Delete Signal Protocol keys for this user (except identity keys to preserve future comms)
    const { error: sessionError } = await supabase
      .from('signal_sessions')
      .delete()
      .eq('local_user_id', user.id);

    if (sessionError) {
      console.error('Error deleting signal sessions:', sessionError);
    }

    // 4. Delete device sessions and locations
    const { error: deviceSessionError } = await supabase
      .from('device_sessions')
      .delete()
      .eq('device_id', deviceId);

    if (deviceSessionError) {
      console.error('Error deleting device sessions:', deviceSessionError);
    }

    const { error: locationError } = await supabase
      .from('device_locations')
      .delete()
      .eq('device_id', deviceId);

    if (locationError) {
      console.error('Error deleting device locations:', locationError);
    }

    // 5. Log the wipe action for security audit
    await supabase
      .from('security_audit_log')
      .insert({
        user_id: user.id,
        event_type: 'device_data_wipe',
        event_details: {
          device_id: deviceId,
          wiped_at: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Device data wiped successfully. Contacts preserved for new device linking.' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in wipe-device-data function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});