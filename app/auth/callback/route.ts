import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/m5'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  const redirectBase = isLocalEnv
    ? origin
    : forwardedHost
    ? `https://${forwardedHost}`
    : origin

  // 1. If OAuth provider returned an error directly
  if (error || errorDescription) {
    const errorMsg = errorDescription || error || 'OAuth authentication failed'
    console.error('OAuth callback error from provider:', errorMsg)
    return NextResponse.redirect(`${redirectBase}${next}?auth_error=${encodeURIComponent(errorMsg)}`)
  }

  // 2. Exchange authorization code for authenticated session
  if (code) {
    const response = NextResponse.redirect(`${redirectBase}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions = { ...options }
              if (isLocalEnv) {
                // Critical on localhost over HTTP: Secure=true causes browsers to drop cookies silently
                cookieOptions.secure = false
              }
              request.cookies.set(name, value)
              response.cookies.set(name, value, cookieOptions)
            })
          },
        },
      }
    )

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (!exchangeError) {
      return response
    }

    console.error('exchangeCodeForSession error in auth callback:', exchangeError)
    return NextResponse.redirect(
      `${redirectBase}${next}?auth_error=${encodeURIComponent(exchangeError.message)}`
    )
  }

  // 3. Fallback if called without code or error
  return NextResponse.redirect(`${redirectBase}${next}?auth_error=No+authorization+code+received`)
}
