import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let rawCookie = request.cookies.get('hmo_auth_return_to')?.value
  let cookieReturnTo = rawCookie
  if (rawCookie) {
    try {
      cookieReturnTo = decodeURIComponent(rawCookie)
    } catch {
      cookieReturnTo = rawCookie
    }
  }
  const paramNext = searchParams.get('next')
  const next = (paramNext && paramNext !== '/') ? paramNext : (cookieReturnTo || '/m6')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  const redirectBase = isLocalEnv
    ? origin
    : forwardedHost
    ? `https://${forwardedHost}`
    : origin

  const separator = next.includes('?') ? '&' : '?'

  // 1. If OAuth provider returned an error directly
  if (error || errorDescription) {
    const errorMsg = errorDescription || error || 'OAuth authentication failed'
    console.error('OAuth callback error from provider:', errorMsg)
    return NextResponse.redirect(`${redirectBase}${next}${separator}auth_error=${encodeURIComponent(errorMsg)}`)
  }

  // 2. Exchange authorization code for authenticated session
  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      return NextResponse.redirect(`${redirectBase}${next}`)
    }

    console.error('exchangeCodeForSession error in auth callback:', exchangeError)
    return NextResponse.redirect(
      `${redirectBase}${next}${separator}auth_error=${encodeURIComponent(exchangeError.message)}`
    )
  }

  // 3. Fallback if called without code or error
  return NextResponse.redirect(`${redirectBase}${next}${separator}auth_error=No+authorization+code+received`)
}
