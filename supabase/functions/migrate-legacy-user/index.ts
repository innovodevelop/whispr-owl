import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationRequest {
  legacyUserId: string;
  cryptoUserId: string;
  username: string;
  displayName: string;
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

    const { legacyUserId, cryptoUserId, username, displayName }: MigrationRequest = await req.json();

    // Verify the user is migrating their own account
    if (user.id !== legacyUserId) {
      throw new Error('Unauthorized: Can only migrate your own account');
    }

    console.log(`Starting migration for user ${legacyUserId} to crypto user ${cryptoUserId}`);

    // Start a transaction-like operation
    const { error: migrationError } = await supabaseClient
      .from('user_migrations')
      .update({
        new_crypto_user_id: cryptoUserId,
        migration_status: 'in_progress'
      })
      .eq('legacy_user_id', legacyUserId);

    if (migrationError) {
      throw new Error(`Migration update failed: ${migrationError.message}`);
    }

    // Update profile with username and display name
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        user_id: legacyUserId,
        username: username,
        display_name: displayName,
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile update failed:', profileError);
      // Don't fail the entire migration for profile update issues
    }

    // Create crypto_users record if it doesn't exist
    const { error: cryptoUserError } = await supabaseClient
      .from('crypto_users')
      .upsert({
        user_id: cryptoUserId,
        username: username,
        updated_at: new Date().toISOString()
      });

    if (cryptoUserError) {
      console.error('Crypto user creation failed:', cryptoUserError);
      // Don't fail the entire migration for this
    }

    // Mark migration as completed
    const { error: completionError } = await supabaseClient
      .from('user_migrations')
      .update({
        migration_status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('legacy_user_id', legacyUserId);

    if (completionError) {
      throw new Error(`Migration completion failed: ${completionError.message}`);
    }

    console.log(`Migration completed successfully for user ${legacyUserId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Migration completed successfully',
        cryptoUserId: cryptoUserId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Migration failed:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Migration failed' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});