import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify the calling user is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Client to verify the calling user
    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !caller) throw new Error('Unauthorized')

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Check if caller is admin
    const { data: callerProfile } = await adminClient
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'admin' || !callerProfile.is_active) {
      throw new Error('Forbidden: Admin role required')
    }

    // 2. Parse the request body
    const body = await req.json()
    const { action } = body

    if (action === 'create') {
      const { email, password, full_name, account_name, department_id, role = 'user' } = body

      if (!email || !password || !full_name) {
        throw new Error('email, password, and full_name are required')
      }

      // Create user in Supabase Auth
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      })

      if (createError) throw createError
      if (!newUser.user) throw new Error('Failed to create user')

      // Create user_profile
      const { error: profileError } = await adminClient
        .from('user_profiles')
        .insert({
          id: newUser.user.id,
          email,
          full_name,
          account_name: account_name || email.split('@')[0],
          department_id: department_id || null,
          role,
          is_active: true,
        })

      if (profileError) {
        // Rollback: delete the auth user
        await adminClient.auth.admin.deleteUser(newUser.user.id)
        throw profileError
      }

      return new Response(
        JSON.stringify({ success: true, user: { id: newUser.user.id, email } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (action === 'update_password') {
      const { user_id, new_password } = body
      if (!user_id || !new_password) throw new Error('user_id and new_password are required')

      const { error } = await adminClient.auth.admin.updateUserById(user_id, {
        password: new_password,
      })
      if (error) throw error

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (action === 'delete') {
      const { user_id } = body
      if (!user_id) throw new Error('user_id is required')

      // Prevent self-deletion
      if (user_id === caller.id) throw new Error('Cannot delete your own account')

      const { error } = await adminClient.auth.admin.deleteUser(user_id)
      if (error) throw error

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
