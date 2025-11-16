import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Manage User Roles function started')

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get the authenticated user making the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: isAdmin, error: adminCheckError } = await supabaseClient
      .rpc('is_admin_user', { _user_id: user.id })
    
    if (adminCheckError || !isAdmin) {
      throw new Error('User is not an admin')
    }

    const { action, email, fullName, password, roles, userId, role } = await req.json()
    console.log('Action:', action, 'Email:', email, 'Roles:', roles, 'UserId:', userId, 'Role:', role)

    if (action === 'update_roles') {
      // Find or create the user
      let userId: string

      // Try to find existing user by email
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) throw listError

      const existingUser = existingUsers.users.find(u => u.email === email)

      if (existingUser) {
        userId = existingUser.id
        console.log('Found existing user:', userId)
      } else {
        // Create new user with provided password
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: password || crypto.randomUUID(),
          email_confirm: true,
          user_metadata: { full_name: fullName },
        })

        if (createError) throw createError
        if (!newUser.user) throw new Error('Failed to create user')
        
        userId = newUser.user.id
        console.log('Created new user:', userId)
      }

      // Delete existing roles
      const { error: deleteError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)

      if (deleteError) {
        console.error('Error deleting old roles:', deleteError)
        throw deleteError
      }

      // Insert new roles
      if (roles && roles.length > 0) {
        const roleInserts = roles.map((role: string) => ({
          user_id: userId,
          role: role,
        }))

        const { error: insertError } = await supabaseAdmin
          .from('user_roles')
          .insert(roleInserts)

        if (insertError) {
          console.error('Error inserting roles:', insertError)
          throw insertError
        }
      }

      // Log audit
      await supabaseAdmin.from('user_role_audit').insert({
        action: 'updated_roles',
        performed_by: user.id,
        affected_user: userId,
        role_name: roles?.join(', ') || 'none',
      })

      return new Response(
        JSON.stringify({ success: true, userId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'remove_roles') {
      // Find user by email
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) throw listError

      const existingUser = existingUsers.users.find(u => u.email === email)
      if (!existingUser) {
        throw new Error('User not found')
      }

      const userId = existingUser.id

      // Delete all roles
      const { error: deleteError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)

      if (deleteError) throw deleteError

      // Log audit
      await supabaseAdmin.from('user_role_audit').insert({
        action: 'removed_all_roles',
        performed_by: user.id,
        affected_user: userId,
        role_name: 'all',
      })

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'reset_password') {
      // Find user by email
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) throw listError

      const existingUser = existingUsers.users.find(u => u.email === email)
      if (!existingUser) {
        throw new Error('User not found')
      }

      const userId = existingUser.id

      // Update user password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      )

      if (updateError) throw updateError

      // Log audit
      await supabaseAdmin.from('user_role_audit').insert({
        action: 'reset_password',
        performed_by: user.id,
        affected_user: userId,
        role_name: null,
      })

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'assign_role') {
      if (!userId || !role) {
        throw new Error('userId and role are required')
      }

      // Check if role already exists
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', role)
        .single()

      if (existingRole) {
        throw new Error('User already has this role')
      }

      // Insert new role
      const { error: insertError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role })

      if (insertError) throw insertError

      // Log audit
      await supabaseAdmin.from('user_role_audit').insert({
        action: 'assigned_role',
        performed_by: user.id,
        affected_user: userId,
        role_name: role,
      })

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'revoke_role') {
      if (!userId || !role) {
        throw new Error('userId and role are required')
      }

      // Delete specific role
      const { error: deleteError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role)

      if (deleteError) throw deleteError

      // Log audit
      await supabaseAdmin.from('user_role_audit').insert({
        action: 'revoked_role',
        performed_by: user.id,
        affected_user: userId,
        role_name: role,
      })

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'get_user_email') {
      if (!userId) {
        throw new Error('userId is required')
      }

      // Get user from auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
      
      if (authError) throw authError
      if (!authUser.user) throw new Error('User not found')

      return new Response(
        JSON.stringify({ email: authUser.user.email }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
