import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, password, phone } = body

    // Validate input
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password || !phone?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if required environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('[v0] Missing Supabase configuration')
      return NextResponse.json(
        { error: 'Server configuration error. Please check environment variables.' },
        { status: 500 }
      )
    }

    // Check for service role key - this is required for sending confirmation emails
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[v0] SUPABASE_SERVICE_ROLE_KEY not configured. Confirmation emails may not be sent.')
    }

    // Create a Supabase client with service role key (for server-side operations)
    // Service role key is required to send confirmation emails
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Sign up user in Supabase Auth
    // Do NOT set email_confirm to true - we want Supabase to send the confirmation email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        firstName,
        lastName,
        phone,
      },
      // Leave email_confirm unset so Supabase sends confirmation email
    })

    // Log the result for debugging
    console.log('[v0] Auth user created:', {
      userId: authData?.user?.id,
      email: authData?.user?.email,
      emailConfirmed: authData?.user?.email_confirmed_at,
      error: authError?.message,
    })

    if (authError) {
      console.error('Auth error:', authError)
      // Check for specific error codes/messages
      if (authError.code === 'email_exists' || authError.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'This email is already registered. Please use a different email or try logging in.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: authError.message || 'Failed to create user account' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 400 }
      )
    }

    // Insert user data into customers table using service role (bypasses RLS)
    const { error: insertError } = await supabaseAdmin
      .from('customers')
      .insert([
        {
          id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ])

    if (insertError) {
      console.error('Error inserting customer data:', insertError)
      // Attempt to delete the auth user if insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create customer record' },
        { status: 400 }
      )
    }

    // Return success response
    return NextResponse.json(
      { 
        message: 'Signup successful',
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Signup error:', error)
    
    // Handle specific auth errors
    if (error?.__isAuthError) {
      if (error.code === 'email_exists') {
        return NextResponse.json(
          { error: 'This email is already registered. Please use a different email or try logging in.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: error.message || 'Authentication failed' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'An error occurred during signup. Please try again.' },
      { status: 500 }
    )
  }
}
