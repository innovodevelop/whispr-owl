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

    const { force = false } = await req.json();

    // Get user's auto display name configuration
    const { data: config, error: configError } = await supabase
      .from('auto_display_names')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: 'Auto display name configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!config.enabled && !force) {
      return new Response(
        JSON.stringify({ error: 'Auto display name rotation is disabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const namePool = config.name_pool as string[];
    if (!namePool || namePool.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No display names configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if it's time to rotate (unless forced)
    if (!force && config.next_rotation) {
      const nextRotation = new Date(config.next_rotation);
      const now = new Date();
      
      if (now < nextRotation) {
        return new Response(
          JSON.stringify({ 
            error: 'Not yet time for rotation',
            next_rotation: config.next_rotation 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Calculate next name index
    const currentIndex = config.current_name_index || 0;
    const nextIndex = (currentIndex + 1) % namePool.length;
    const newDisplayName = namePool[nextIndex];

    // Calculate next rotation time
    const now = new Date();
    let nextRotation = new Date(now);
    
    switch (config.interval_type) {
      case 'hourly':
        nextRotation.setHours(nextRotation.getHours() + 1);
        break;
      case 'daily':
        nextRotation.setDate(nextRotation.getDate() + 1);
        break;
      case 'weekly':
        nextRotation.setDate(nextRotation.getDate() + 7);
        break;
    }

    // Update the display name in profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ display_name: newDisplayName })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to update display name' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the auto display name configuration
    const { error: updateError } = await supabase
      .from('auto_display_names')
      .update({
        current_name_index: nextIndex,
        last_rotation: now.toISOString(),
        next_rotation: nextRotation.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating config:', updateError);
    }

    // Log the rotation for security audit
    await supabase
      .from('security_audit_log')
      .insert({
        user_id: user.id,
        event_type: 'display_name_rotation',
        event_details: {
          old_name_index: currentIndex,
          new_name_index: nextIndex,
          new_display_name: newDisplayName,
          forced: force
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        new_display_name: newDisplayName,
        next_rotation: nextRotation.toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in rotate-display-name function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});