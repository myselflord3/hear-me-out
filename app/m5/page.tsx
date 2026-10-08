'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Radio,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  ChevronLeft,
  Flame,
  ArrowUpRight,
  Info,
  Film,
} from 'lucide-react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import {
  VoteRecord,
  VoteTally,
  formatDisplayName,
  calculateTally,
} from '@/lib/voting/utils'
import { PresenceBadge } from '@/components/voting/presence-badge'
import { LiveResults } from '@/components/voting/live-results'
import { VoterActivity } from '@/components/voting/voter-activity'
import { ConnectionStatus } from '@/components/voting/connection-status'

const OPTION_1_KEY = 'MOVIE'
const OPTION_2_KEY = 'EXPERIENCE'

const OPTION_1_LABEL = 'A brilliant movie, terrible viewing experience'
const OPTION_2_LABEL = 'An incredible viewing experience, average movie'

const CHOICE_DISPLAY_LABELS: Record<string, string> = {
  [OPTION_1_KEY]: 'MOVIE',
  [OPTION_2_KEY]: 'EXPERIENCE',
  // Backward fallback in case 'YES' or 'NO' were stored
  YES: 'MOVIE',
  NO: 'EXPERIENCE',
}

export default function Motion05LiveVotingPage() {
  // Database & App States
  const [motionStatus, setMotionStatus] = useState<'upcoming' | 'open' | 'closed'>('open')
  const [motionTitle, setMotionTitle] = useState('WHAT MATTERS MORE, A GREAT MOVIE OR A GREAT EXPERIENCE?')
  const [option1Text, setOption1Text] = useState(OPTION_1_LABEL)
  const [option2Text, setOption2Text] = useState(OPTION_2_LABEL)

  // Auth States
  const [user, setUser] = useState<{ id: string; name: string; email?: string } | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isSigningIn, setIsSigningIn] = useState(false)

  // Voting States
  const [userVote, setUserVote] = useState<string | null>(null)
  const [isVoting, setIsVoting] = useState(false)
  const [voteMessage, setVoteMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Realtime Data
  const [allVotes, setAllVotes] = useState<VoteRecord[]>([])
  const [viewerCount, setViewerCount] = useState<number>(1)
  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'disconnected'>('connected')
  const [dbUnreachable, setDbUnreachable] = useState(false)

  // Debounce & channel refs
  const lastVoteTimestamp = useRef<number>(0)
  const presenceChannelRef = useRef<any>(null)

  // -------------------------------------------------------------
  // 1. Initial Session & Data Fetching for Motion 05
  // -------------------------------------------------------------
  const fetchMotionAndVotes = useCallback(async (userId?: string) => {
    if (!isSupabaseConfigured()) {
      setIsAuthLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // Fetch Motion 05 details if seeded in DB
      const { data: motionData } = await supabase
        .from('motions')
        .select('*')
        .eq('id', 'm5')
        .single()

      if (motionData) {
        if (motionData.title) setMotionTitle(motionData.title)
        if (motionData.option_yes) setOption1Text(motionData.option_yes)
        if (motionData.option_no) setOption2Text(motionData.option_no)
        if (motionData.status) setMotionStatus(motionData.status)
      }

      // Fetch all recorded votes for Motion 05
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('id, motion_id, user_id, display_name, choice, updated_at')
        .eq('motion_id', 'm5')
        .order('updated_at', { ascending: false })

      if (votesError) {
        console.warn('Notice fetching M5 votes from database:', votesError.message || 'Database unreachable')
        setDbUnreachable(true)
        setConnectionState('disconnected')
      } else if (votesData) {
        setAllVotes(votesData as VoteRecord[])
        setDbUnreachable(false)

        // Check if current user has already voted on M5
        if (userId) {
          const existing = (votesData as VoteRecord[]).find((v) => v.user_id === userId)
          if (existing) {
            setUserVote(existing.choice)
          }
        }
      }
    } catch (err: any) {
      console.warn('Database fetch notice:', err?.message || err)
      setDbUnreachable(true)
      setConnectionState('disconnected')
    } finally {
      setIsAuthLoading(false)
    }
  }, [])

  // Check for auth errors passed via OAuth redirect callback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const authErr = params.get('auth_error')
      if (authErr) {
        if (authErr === 'true') {
          setErrorMessage('Google Authentication failed. Please try again.')
        } else {
          setErrorMessage(`Google Authentication failed: ${decodeURIComponent(authErr)}`)
        }
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [])

  // Setup Auth Listener
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsAuthLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // Check existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const displayName = formatDisplayName(
            session.user.user_metadata?.full_name || session.user.user_metadata?.name,
            session.user.email
          )
          const currentUser = {
            id: session.user.id,
            name: displayName,
            email: session.user.email,
          }
          setUser(currentUser)
          fetchMotionAndVotes(session.user.id)
        } else {
          setUser(null)
          fetchMotionAndVotes()
        }
      }).catch((err) => {
        console.warn('Session check notice:', err?.message || err)
        setDbUnreachable(true)
        setIsAuthLoading(false)
      })

      // Subscribe to auth state changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const displayName = formatDisplayName(
            session.user.user_metadata?.full_name || session.user.user_metadata?.name,
            session.user.email
          )
          const currentUser = {
            id: session.user.id,
            name: displayName,
            email: session.user.email,
          }
          setUser(currentUser)
          fetchMotionAndVotes(session.user.id)
        } else {
          setUser(null)
          setUserVote(null)
          fetchMotionAndVotes()
        }
        setIsSigningIn(false)
      })

      return () => {
        subscription.unsubscribe()
      }
    } catch (err: any) {
      console.warn('Auth init notice:', err?.message || err)
      setIsAuthLoading(false)
    }
  }, [fetchMotionAndVotes])

  // -------------------------------------------------------------
  // 2. Realtime Postgres Changes & Presence Heartbeat on room:m5
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return
    }

    try {
      const supabase = createClient()

      // Channel for Realtime Votes & Presence for Motion 05
      const roomChannel = supabase.channel('room:m5', {
        config: {
          presence: {
            key: user?.id || `anon-${Math.random().toString(36).substring(2, 9)}`,
          },
        },
      })

      // Listen to Database Votes Changes (INSERT, UPDATE, DELETE) for m5
      roomChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: 'motion_id=eq.m5',
        },
        (payload) => {
          setAllVotes((prevVotes) => {
            if (payload.eventType === 'INSERT') {
              const newRecord = payload.new as VoteRecord
              const filtered = prevVotes.filter((v) => v.user_id !== newRecord.user_id)
              return [newRecord, ...filtered]
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as VoteRecord
              return prevVotes.map((v) => (v.user_id === updated.user_id ? updated : v))
            } else if (payload.eventType === 'DELETE') {
              const oldRecord = payload.old as { user_id: string }
              return prevVotes.filter((v) => v.user_id !== oldRecord.user_id)
            }
            return prevVotes
          })
        }
      )

      // Listen to Presence Sync (Live Viewer Count)
      roomChannel
        .on('presence', { event: 'sync' }, () => {
          const state = roomChannel.presenceState()
          const count = Object.keys(state).length
          if (count > 0) setViewerCount(count)
        })
        .on('presence', { event: 'join' }, () => {
          const state = roomChannel.presenceState()
          const count = Object.keys(state).length
          if (count > 0) setViewerCount(count)
        })
        .on('presence', { event: 'leave' }, () => {
          const state = roomChannel.presenceState()
          const count = Object.keys(state).length
          if (count > 0) setViewerCount(count)
        })

      // Subscribe and track presence
      roomChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionState('connected')
          setDbUnreachable(false)
          await roomChannel.track({
            online_at: new Date().toISOString(),
            user_id: user?.id || 'visitor',
          })
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionState('disconnected')
          setDbUnreachable(true)
        } else if (status === 'CLOSED') {
          setConnectionState('disconnected')
        }
      })

      presenceChannelRef.current = roomChannel

      return () => {
        supabase.removeChannel(roomChannel)
      }
    } catch (err: any) {
      console.warn('Presence channel notice:', err?.message || err)
    }
  }, [user?.id])

  // Window online/offline event listeners
  useEffect(() => {
    const handleOnline = () => setConnectionState('connected')
    const handleOffline = () => setConnectionState('disconnected')

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // -------------------------------------------------------------
  // 3. Auth Actions (Pure Supabase Google OAuth)
  // -------------------------------------------------------------
  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true)
      setErrorMessage(null)
      const supabase = createClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=/m5`,
        },
      })

      if (error) {
        console.error('Google sign-in error:', error)
        setErrorMessage(error.message || 'Google sign-in could not be initiated.')
        setIsSigningIn(false)
        return
      }

      if (data?.url) {
        window.location.assign(data.url)
      }
    } catch (err: any) {
      console.error('Sign-in catch error:', err)
      setErrorMessage(err?.message || 'Failed to initiate Google sign-in.')
      setIsSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    setUser(null)
    setUserVote(null)
    setVoteMessage(null)
  }

  // -------------------------------------------------------------
  // 4. Voting Action (Atomic Upsert on motion_id = 'm5')
  // -------------------------------------------------------------
  const handleCastVote = async (choice: string) => {
    if (!user) {
      setErrorMessage('Please sign in to cast your vote.')
      return
    }

    if (motionStatus !== 'open') {
      setErrorMessage(
        motionStatus === 'closed'
          ? 'Voting for Motion 05 is currently closed.'
          : 'Voting has not opened yet.'
      )
      return
    }

    // Rate limit check: prevent rapid double clicks within 1000ms
    const now = Date.now()
    if (now - lastVoteTimestamp.current < 1000) {
      return
    }
    lastVoteTimestamp.current = now

    const isChanging = userVote !== null && userVote !== choice
    const isSame = userVote === choice

    if (isSame) {
      return
    }

    setIsVoting(true)
    setErrorMessage(null)

    // Optimistic UI update
    const previousVote = userVote
    setUserVote(choice)

    try {
      const supabase = createClient()

      // Real Supabase atomic UPSERT
      // Constraint unique_motion_user ensures ONE ACCOUNT = ONE ACTIVE VOTE
      const { error } = await supabase
        .from('votes')
        .upsert(
          {
            motion_id: 'm5',
            user_id: user.id,
            display_name: user.name,
            choice,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'motion_id,user_id' }
        )
        .select()

      if (error) {
        console.error('Vote upsert error:', error)
        // Rollback optimistic vote on real DB error
        setUserVote(previousVote)
        setVoteMessage(null)
        if (error.code === '23503') {
          setErrorMessage(
            'Database setup required: Motion 05 needs to be seeded in the Supabase motions table. Please run the SQL migration in SUPABASE_SETUP.md.'
          )
        } else {
          setErrorMessage(`Vote could not be recorded: ${error.message}`)
        }
      } else {
        setVoteMessage(isChanging ? 'Changed your mind? Fair.' : 'Your opinion is officially on record.')
      }
    } catch (err: any) {
      console.error('Voting network error:', err)
      setUserVote(previousVote)
      setErrorMessage(err?.message || 'Network error recording vote. Please try again.')
    } finally {
      setIsVoting(false)
    }
  }

  // Tally calculations for M5 options
  const tally: VoteTally = calculateTally(allVotes, OPTION_1_KEY, OPTION_2_KEY)

  return (
    <main className="live-event-shell">
      <div className="grain" aria-hidden="true" />

      {/* Reconnection status pill */}
      <ConnectionStatus
        status={connectionState}
        onRetry={() => fetchMotionAndVotes(user?.id)}
      />

      {/* Event Header Bar */}
      <header className="event-top-bar">
        <Link href="/" className="event-back-link">
          <ChevronLeft size={16} />
          <span>HMO</span>
        </Link>

        <div className="event-center-brand">
          <span className="brand-dot" />
          <span className="event-title-tag">LIVE AUDIENCE VOTE</span>
        </div>

        <div className="event-user-slot">
          {user ? (
            <div className="user-pill">
              <span className="user-name">{user.name}</span>
              <button
                onClick={handleSignOut}
                className="signout-button"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <span className="anonymous-tag">ANONYMOUS GUEST</span>
          )}
        </div>
      </header>

      {/* Main Live Stage */}
      <div className="event-stage-container">
        {/* Ticket Registration Header Pill */}
        <div
          style={{
            background: 'var(--ink)',
            color: 'var(--cream)',
            border: '2px solid var(--ink)',
            boxShadow: '4px 4px 0 var(--red)',
            padding: '0.8rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.8rem',
            fontSize: '0.78rem',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
            <Film size={15} style={{ color: 'var(--yellow)' }} />
            <span>
              <strong>10 OCT • MONKEY CAFE:</strong> Hear Me Out: Movie or Experience? (5–7 PM • ₹99/-)
            </span>
          </div>
          <a
            href="https://forms.gle/3D4WoZGUKayn6exZ6"
            target="_blank"
            rel="noopener noreferrer"
            className="button button-small"
            style={{
              background: 'var(--yellow)',
              color: 'var(--ink)',
              padding: '0.4rem 0.8rem',
              fontSize: '0.72rem',
              fontWeight: 900,
            }}
          >
            GET YOUR TICKET <ArrowUpRight size={13} />
          </a>
        </div>

        {/* Database Unreachable Notice banner if Supabase project is paused */}
        {dbUnreachable && (
          <div
            style={{
              background: '#fef3c7',
              color: '#92400e',
              border: '2px solid #b45309',
              padding: '0.85rem 1.2rem',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              lineHeight: 1.4,
            }}
          >
            <Info size={18} style={{ flexShrink: 0, color: '#b45309' }} />
            <span>
              <strong>SUPABASE DATABASE NOTICE:</strong> Supabase is currently unreachable. If your project paused due to inactivity, click <strong>Restore Project</strong> in your Supabase Dashboard.
            </span>
          </div>
        )}

        {/* Hero Section: Live Viewer Count + Large Motion Identifier */}
        <section className="motion-headline-section">
          <div className="motion-meta-row">
            <PresenceBadge viewerCount={viewerCount} isConnected={connectionState === 'connected'} />
            <div className="event-badge-m04">
              <span className="badge-flame"><Flame size={13} /></span>
              <span>MOTION 05</span>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.12em', color: 'var(--red)', textTransform: 'uppercase' }}>
            HEAR ME OUT: MOVIE OR EXPERIENCE?
          </div>

          <h1 className="live-motion-title">
            WHAT MATTERS MORE?<br />
            <span className="highlight-text">A GREAT MOVIE</span>
            <span className="title-or-divider">
              <span className="or-line" />
              <span className="or-pill">OR</span>
              <span className="or-line" />
            </span>
            <span className="highlight-text">A GREAT EXPERIENCE?</span>
          </h1>

          <p className="motion-subtitle">
            If you could choose one. One authenticated vote per person. Change your mind anytime.
          </p>
        </section>

        {/* Interactive Voting Station */}
        <section className="voting-action-section">
          {/* Status Banners (Closed / Upcoming) */}
          {motionStatus === 'closed' && (
            <div className="status-announcement-banner closed">
              <Lock size={16} />
              <span>VOTING IS NOW CLOSED — FINAL RESULTS ARE LOCKED</span>
            </div>
          )}

          {motionStatus === 'upcoming' && (
            <div className="status-announcement-banner upcoming">
              <Radio size={16} />
              <span>VOTING OPENS WHEN THE LIVE DISCUSSION BEGINS</span>
            </div>
          )}

          {/* Prompt / Microcopy */}
          <div className="action-instruction-row">
            <div className="instruction-heading">
              <span className="instruction-lead">IF YOU COULD CHOOSE ONE</span>
            </div>

            <div className="microcopy-badge">
              {voteMessage ? (
                <span className="microcopy-text dynamic-message">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  {voteMessage}
                </span>
              ) : userVote ? (
                <span className="microcopy-text">Your opinion is officially on record.</span>
              ) : user ? (
                <span className="microcopy-text">Still thinking? That&apos;s the point.</span>
              ) : (
                <span className="microcopy-text">Sign in to cast your official vote.</span>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="error-banner" role="alert">
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Voting Interactive Controls */}
          {isAuthLoading ? (
            <div className="voting-loading-box">
              <RefreshCw size={24} className="animate-spin text-zinc-400" />
              <span>Connecting to live ballot...</span>
            </div>
          ) : !user ? (
            /* STATE 1: Unauthenticated -> Google Sign-in */
            <div className="auth-required-card">
              <div className="auth-card-body">
                <div className="auth-card-icon">
                  <Lock size={28} />
                </div>
                <h3>AUTHENTICATE TO VOTE</h3>
                <p>
                  To ensure honest audience polling, each voice gets exactly one verified seat.
                  No spam. Your raw email is never made public.
                </p>

                <button
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="google-signin-button"
                  id="google-signin-btn"
                >
                  {isSigningIn ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>CONNECTING TO GOOGLE...</span>
                    </>
                  ) : (
                    <>
                      <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>SIGN IN WITH GOOGLE</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* STATES 3-7: Authenticated -> Large Option 1 / Option 2 Buttons */
            <div className="voting-buttons-grid">
              {/* Option 1: MOVIE */}
              <button
                type="button"
                onClick={() => handleCastVote(OPTION_1_KEY)}
                disabled={isVoting || motionStatus !== 'open'}
                className={`vote-choice-card choice-yes ${userVote === OPTION_1_KEY ? 'is-active-vote' : ''}`}
                id="vote-btn-option1"
              >
                <div className="choice-card-content">
                  <div className="choice-top-meta">
                    <span className="choice-badge badge-yes">MOVIE</span>
                    {userVote === OPTION_1_KEY && (
                      <span className="selected-indicator">
                        <CheckCircle2 size={16} />
                        RECORDED
                      </span>
                    )}
                  </div>
                  <div className="choice-main-text">{option1Text}</div>
                </div>
                <div className="choice-bottom-action">
                  {userVote === OPTION_1_KEY ? (
                    <span className="active-text">YOUR CURRENT VOTE</span>
                  ) : userVote === OPTION_2_KEY ? (
                    <span className="switch-text">SWITCH VOTE TO MOVIE</span>
                  ) : (
                    <span className="cast-text">TAP TO CAST VOTE</span>
                  )}
                </div>
              </button>

              {/* Option 2: EXPERIENCE */}
              <button
                type="button"
                onClick={() => handleCastVote(OPTION_2_KEY)}
                disabled={isVoting || motionStatus !== 'open'}
                className={`vote-choice-card choice-no ${userVote === OPTION_2_KEY ? 'is-active-vote' : ''}`}
                id="vote-btn-option2"
              >
                <div className="choice-card-content">
                  <div className="choice-top-meta">
                    <span className="choice-badge badge-no">EXPERIENCE</span>
                    {userVote === OPTION_2_KEY && (
                      <span className="selected-indicator">
                        <CheckCircle2 size={16} />
                        RECORDED
                      </span>
                    )}
                  </div>
                  <div className="choice-main-text">{option2Text}</div>
                </div>
                <div className="choice-bottom-action">
                  {userVote === OPTION_2_KEY ? (
                    <span className="active-text">YOUR CURRENT VOTE</span>
                  ) : userVote === OPTION_1_KEY ? (
                    <span className="switch-text">SWITCH VOTE TO EXPERIENCE</span>
                  ) : (
                    <span className="cast-text">TAP TO CAST VOTE</span>
                  )}
                </div>
              </button>
            </div>
          )}
        </section>

        {/* Live Visual Results Display */}
        <section className="live-results-section" aria-label="Real-time voting tally">
          <LiveResults
            tally={tally}
            userVote={userVote}
            votingStatus={motionStatus}
            option1Key={OPTION_1_KEY}
            option2Key={OPTION_2_KEY}
            option1Title="MOVIE (A brilliant film)"
            option2Title="EXPERIENCE (An incredible viewing)"
            motionLabel="Motion 05"
          />
        </section>

        {/* Live Public Voter Activity Feed */}
        <section className="voter-feed-section" aria-label="Recent voter activity">
          <VoterActivity
            recentVotes={allVotes}
            choiceLabels={CHOICE_DISPLAY_LABELS}
            heading="AUDIENCE VOTING FEED"
          />
        </section>

        {/* Intelligent Footer Microcopy */}
        <footer className="event-stage-footer">
          <div className="footer-notes">
            <p>
              <strong>HEAR. ME. OUT. M05 LIVE BALLOT</strong> — Verified room participation.
              One authenticated vote per attendee. Results broadcast directly from the PostgreSQL instance.
            </p>
          </div>
        </footer>
      </div>
    </main>
  )
}
