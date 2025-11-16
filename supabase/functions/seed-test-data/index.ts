import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestAdmin {
  email: string;
  password: string;
  fullName: string;
  roles: string[];
}

const TEST_ADMINS: TestAdmin[] = [
  {
    email: 'superadmin@test.com',
    password: 'SuperAdmin123!',
    fullName: 'Super Admin Test',
    roles: ['super_admin']
  },
  {
    email: 'admin@test.com',
    password: 'Admin123!',
    fullName: 'Admin Test',
    roles: ['admin']
  },
  {
    email: 'chair@test.com',
    password: 'Chair123!',
    fullName: 'Chair Test',
    roles: ['chair']
  },
  {
    email: 'cochair@test.com',
    password: 'CoChair123!',
    fullName: 'Co-Chair Test',
    roles: ['co_chair']
  },
  {
    email: 'em@test.com',
    password: 'EM123!',
    fullName: 'Executive Member Test',
    roles: ['em']
  }
];

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the requester is a super admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabaseAdmin.rpc('is_super_admin', {
      _user_id: user.id
    });

    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only super admins can seed test data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    
    for (const testAdmin of TEST_ADMINS) {
      console.log(`Creating test user: ${testAdmin.email}`);
      
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.rpc('get_user_by_email', {
        user_email: testAdmin.email
      });

      let userId: string;

      if (existingUsers && existingUsers.length > 0) {
        userId = existingUsers[0].id;
        console.log(`User ${testAdmin.email} already exists, updating...`);
        
        // Update password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password: testAdmin.password }
        );

        if (updateError) {
          console.error(`Error updating user ${testAdmin.email}:`, updateError);
          results.push({
            email: testAdmin.email,
            success: false,
            error: updateError.message
          });
          continue;
        }
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: testAdmin.email,
          password: testAdmin.password,
          email_confirm: true,
          user_metadata: {
            full_name: testAdmin.fullName
          }
        });

        if (createError || !newUser.user) {
          console.error(`Error creating user ${testAdmin.email}:`, createError);
          results.push({
            email: testAdmin.email,
            success: false,
            error: createError?.message || 'Unknown error'
          });
          continue;
        }

        userId = newUser.user.id;

        // Create profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            full_name: testAdmin.fullName
          });

        if (profileError) {
          console.error(`Error creating profile for ${testAdmin.email}:`, profileError);
        }
      }

      // Delete existing roles
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Insert new roles
      const roleInserts = testAdmin.roles.map(role => ({
        user_id: userId,
        role: role
      }));

      const { error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .insert(roleInserts);

      if (rolesError) {
        console.error(`Error assigning roles to ${testAdmin.email}:`, rolesError);
        results.push({
          email: testAdmin.email,
          success: false,
          error: rolesError.message
        });
      } else {
        results.push({
          email: testAdmin.email,
          password: testAdmin.password,
          roles: testAdmin.roles,
          success: true
        });
      }
    }

    console.log('Test data seeding complete');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test data seeded successfully',
        accounts: results,
        note: 'WARNING: These are test accounts for development only. Never use in production!'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in seed-test-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
