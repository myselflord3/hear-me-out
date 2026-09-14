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
  Sparkles,
  HelpCircle,
  Flame,
  Info
} from 'lucide-react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import {
  VoteChoice,
  VoteRecord,
  VoteTally,
  formatDisplayName,
  calculateTally,
} from '@/lib/voting/utils'
import { PresenceBadge } from '@/components/voting/presence-badge'
import { LiveResults } from '@/components/voting/live-results'
import { VoterActivity } from '@/components/voting/voter-activity'
import { ConnectionStatus } from '@/components/voting/connection-status'

export default function Motion04LiveVotingPage() {
  // Database & App States
  const [motionStatus, setMotionStatus] = useState<'upcoming' | 'open' | 'closed'>('open')
  const [motionTitle, setMotionTitle] = useState('DOES CELEBRITY WORSHIP HAVE GONE TOO FAR?')
  const [optionYesText, setOptionYesText] = useState("YES. WE'VE TAKEN IT TOO FAR 😮💨")
  const [optionNoText, setOptionNoText] = useState('NO. LET PEOPLE ENJOY WHAT THEY ENJOY!')

  // Auth States
  const [user, setUser] = useState<{ id: string; name: string; email?: string } | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isSigningIn, setIsSigningIn] = useState(false)

  // Voting States
  const [userVote, setUserVote] = useState<VoteChoice | null>(null)
  const [isVoting, setIsVoting] = useState(false)
  const [voteMessage, setVoteMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Realtime Data
  const [allVotes, setAllVotes] = useState<VoteRecord[]>([])
  const [viewerCount, setViewerCount] = useState<number>(1)
  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'disconnected'>('connected')
  const [isConfigured, setIsConfigured] = useState(false)

  // Debounce & channel refs
  const lastVoteTimestamp = useRef<number>(0)
  const realtimeChannelRef = useRef<any>(null)
  const presenceChannelRef = useRef<any>(null)

  // Check Supabase configuration on mount
  useEffect(() => {
    setIsConfigured(isSupabaseConfigured())
  }, [])

  // -------------------------------------------------------------
  // 1. Initial Session & Data Fetching
  // -------------------------------------------------------------
  const fetchMotionAndVotes = useCallback(async (userId?: string) => {
    if (!isSupabaseConfigured()) {
      // Offline fallback state with realistic zero or demo initial state
      setIsAuthLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // Fetch Motion 04 details
      const { data: motionData } = await supabase
        .from('motions')
        .select('*')
        .eq('id', 'm4')
        .single()

      if (motionData) {
        setMotionTitle(motionData.title || 'DOES CELEBRITY WORSHIP HAVE GONE TOO FAR?')
        if (motionData.option_yes) setOptionYesText(motionData.option_yes)
        if (motionData.option_no) setOptionNoText(motionData.option_no)
        if (motionData.status) setMotionStatus(motionData.status)
      }

      // Fetch all recorded votes for Motion 04
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('id, motion_id, user_id, display_name, choice, updated_at')
        .eq('motion_id', 'm4')
        .order('updated_at', { ascending: false })

      if (votesError) {
        console.error('Error fetching votes:', votesError)
      } else if (votesData) {
        setAllVotes(votesData as VoteRecord[])

        // Check if current user has already voted
        if (userId) {
          const existing = (votesData as VoteRecord[]).find((v) => v.user_id === userId)
          if (existing) {
            setUserVote(existing.choice)
          }
        }
      }
    } catch (err: any) {
      console.error('Fetch error:', err)
      setErrorMessage('Unable to connect to live voting server. Retrying...')
      setConnectionState('connecting')
    } finally {
      setIsAuthLoading(false)
    }
  }, [])

  // Setup Auth Listener
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsAuthLoading(false)
      return
    }

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
  }, [fetchMotionAndVotes])

  // -------------------------------------------------------------
  // 2. Realtime Postgres Changes & Presence Heartbeat
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Local fallback viewer count
      return
    }

    const supabase = createClient()
    setConnectionState('connected')

    // Channel for Realtime Votes & Presence
    const roomChannel = supabase.channel('room:m4', {
      config: {
        presence: {
          key: user?.id || `anon-${Math.random().toString(36).substring(2, 9)}`,
        },
      },
    })

    // Listen to Database Votes Changes (INSERT, UPDATE, DELETE)
    roomChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: 'motion_id=eq.m4',
      },
      (payload) => {
        setAllVotes((prevVotes) => {
          if (payload.eventType === 'INSERT') {
            const newRecord = payload.new as VoteRecord
            // Guard against duplicate in memory
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
        const activeViewers = Object.keys(state).length
        setViewerCount(Math.max(1, activeViewers))
      })
      .on('presence', { event: 'join' }, () => {
        const state = roomChannel.presenceState()
        setViewerCount(Math.max(1, Object.keys(state).length))
      })
      .on('presence', { event: 'leave' }, () => {
        const state = roomChannel.presenceState()
        setViewerCount(Math.max(1, Object.keys(state).length))
      })

    // Subscribe and track presence
    roomChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionState('connected')
        await roomChannel.track({
          online_at: new Date().toISOString(),
          user_id: user?.id || 'visitor',
        })
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConnectionState('connecting')
      } else if (status === 'CLOSED') {
        setConnectionState('disconnected')
      }
    })

    presenceChannelRef.current = roomChannel

    return () => {
      supabase.removeChannel(roomChannel)
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
  // 3. Auth Actions
  // -------------------------------------------------------------
  const handleGoogleSignIn = async () => {
    if (!isSupabaseConfigured()) {
      setErrorMessage(
        'Supabase is not configured yet. See SUPABASE_SETUP.md or use Local Simulation Mode below.'
      )
      return
    }

    try {
      setIsSigningIn(true)
      setErrorMessage(null)
      const supabase = createClient()
      const origin = window.location.origin

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=/m4`,
        },
      })

      if (error) {
        console.error('Google sign-in error:', error)
        setErrorMessage(error.message)
        setIsSigningIn(false)
      }
    } catch (err: any) {
      console.error('Sign-in error:', err)
      setErrorMessage(err.message || 'Google sign-in failed. Please try again.')
      setIsSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    if (!isSupabaseConfigured()) {
      setUser(null)
      setUserVote(null)
      return
    }

    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setUserVote(null)
    setVoteMessage(null)
  }

  // Developer / Demo instant login when testing locally before Google OAuth is configured
  const handleDemoSignIn = (name: string) => {
    const demoId = `demo-${name.toLowerCase().replace(/\s+/g, '-')}`
    const formatted = formatDisplayName(name)
    setUser({ id: demoId, name: formatted })
  }

  // -------------------------------------------------------------
  // 4. Voting Action (Atomic Upsert)
  // -------------------------------------------------------------
  const handleCastVote = async (choice: VoteChoice) => {
    if (!user) {
      setErrorMessage('Please sign in to cast your vote.')
      return
    }

    if (motionStatus !== 'open') {
      setErrorMessage(
        motionStatus === 'closed'
          ? 'Voting for Motion 04 is currently closed.'
          : 'Voting has not opened yet.'
      )
      return
    }

    // Rate limit check: prevent double clicks within 1000ms
    const now = Date.now()
    if (now - lastVoteTimestamp.current < 1000) {
      return
    }
    lastVoteTimestamp.current = now

    const isChanging = userVote !== null && userVote !== choice
    const isSame = userVote === choice

    if (isSame) {
      // User tapped the already selected choice
      return
    }

    setIsVoting(true)
    setErrorMessage(null)

    // Optimistic UI update
    const previousVote = userVote
    setUserVote(choice)

    if (isChanging) {
      setVoteMessage('Changed your mind? Fair.')
    } else {
      setVoteMessage('Your opinion is officially on record.')
    }

    if (!isSupabaseConfigured()) {
      // Simulation mode: update local votes array
      setTimeout(() => {
        setAllVotes((prev) => {
          const filtered = prev.filter((v) => v.user_id !== user.id)
          const newVote: VoteRecord = {
            id: `local-${Date.now()}`,
            motion_id: 'm4',
            user_id: user.id,
            display_name: user.name,
            choice,
            updated_at: new Date().toISOString(),
          }
          return [newVote, ...filtered]
        })
        setIsVoting(false)
      }, 300)
      return
    }

    try {
      const supabase = createClient()

      // Real Supabase atomic UPSERT
      // Constraint unique_motion_user ensures ONE ACCOUNT = ONE ACTIVE VOTE
      const { data, error } = await supabase
        .from('votes')
        .upsert(
          {
            motion_id: 'm4',
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
        // Rollback optimistic state
        setUserVote(previousVote)
        setErrorMessage(error.message || 'Failed to submit vote. Please try again.')
        setVoteMessage(null)
      } else {
        // Success
        setTimeout(() => {
          setVoteMessage(isChanging ? 'Changed your mind? Fair.' : 'Your opinion is officially on record.')
        }, 50)
      }
    } catch (err: any) {
      console.error('Voting error:', err)
      setUserVote(previousVote)
      setErrorMessage('Network error while recording vote. Please try again.')
    } finally {
      setIsVoting(false)
    }
  }

  // Tally calculations
  const tally: VoteTally = calculateTally(allVotes)

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
        {/* Supabase Notice if not configured */}
        {!isConfigured && (
          <div className="demo-mode-banner">
            <div className="demo-banner-content">
              <Info size={15} className="demo-icon" />
              <span>
                <strong>SUPABASE READY:</strong> Add your credentials in{' '}
                <code>.env.local</code> to activate live Google auth and PostgreSQL streaming. (Running in demo mode).
              </span>
            </div>
            {!user && (
              <div className="demo-quick-auth">
                <button
                  onClick={() => handleDemoSignIn('Tanmay Kashyap')}
                  className="demo-btn"
                >
                  Join as Tanmay K.
                </button>
                <button
                  onClick={() => handleDemoSignIn('Aarav Patel')}
                  className="demo-btn"
                >
                  Join as Aarav P.
                </button>
              </div>
            )}
          </div>
        )}

        {/* Hero Section: Live Viewer Count + Large Motion Identifier */}
        <section className="motion-headline-section">
          <div className="motion-meta-row">
            <PresenceBadge viewerCount={viewerCount} isConnected={connectionState === 'connected'} />
            <div className="event-badge-m04">
              <span className="badge-flame"><Flame size={13} /></span>
              <span>MOTION 04</span>
            </div>
          </div>

          <h1 className="live-motion-title">
            DOES CELEBRITY WORSHIP <br className="hidden sm:inline" />
            <span className="highlight-text">HAVE GONE TOO FAR?</span>
          </h1>

          <p className="motion-subtitle">
            Ahmedabad talks out loud. One authenticated vote per person. Change your mind anytime.
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
              <span className="instruction-lead">CAST YOUR VOTE</span>
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
            /* STATES 3-7: Authenticated -> Large YES / NO Buttons */
            <div className="voting-buttons-grid">
              {/* YES Option */}
              <button
                type="button"
                onClick={() => handleCastVote('YES')}
                disabled={isVoting || motionStatus !== 'open'}
                className={`vote-choice-card choice-yes ${userVote === 'YES' ? 'is-active-vote' : ''}`}
                id="vote-btn-yes"
              >
                <div className="choice-card-content">
                  <div className="choice-top-meta">
                    <span className="choice-badge badge-yes">YES</span>
                    {userVote === 'YES' && (
                      <span className="selected-indicator">
                        <CheckCircle2 size={16} />
                        RECORDED
                      </span>
                    )}
                  </div>
                  <div className="choice-main-text">{optionYesText}</div>
                </div>
                <div className="choice-bottom-action">
                  {userVote === 'YES' ? (
                    <span className="active-text">YOUR CURRENT VOTE</span>
                  ) : userVote === 'NO' ? (
                    <span className="switch-text">SWITCH VOTE TO YES</span>
                  ) : (
                    <span className="cast-text">TAP TO CAST VOTE</span>
                  )}
                </div>
              </button>

              {/* NO Option */}
              <button
                type="button"
                onClick={() => handleCastVote('NO')}
                disabled={isVoting || motionStatus !== 'open'}
                className={`vote-choice-card choice-no ${userVote === 'NO' ? 'is-active-vote' : ''}`}
                id="vote-btn-no"
              >
                <div className="choice-card-content">
                  <div className="choice-top-meta">
                    <span className="choice-badge badge-no">NO</span>
                    {userVote === 'NO' && (
                      <span className="selected-indicator">
                        <CheckCircle2 size={16} />
                        RECORDED
                      </span>
                    )}
                  </div>
                  <div className="choice-main-text">{optionNoText}</div>
                </div>
                <div className="choice-bottom-action">
                  {userVote === 'NO' ? (
                    <span className="active-text">YOUR CURRENT VOTE</span>
                  ) : userVote === 'YES' ? (
                    <span className="switch-text">SWITCH VOTE TO NO</span>
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
          />
        </section>

        {/* Live Public Voter Activity Feed */}
        <section className="voter-feed-section" aria-label="Recent voter activity">
          <VoterActivity recentVotes={allVotes} />
        </section>

        {/* Intelligent Footer Microcopy */}
        <footer className="event-stage-footer">
          <div className="footer-notes">
            <p>
              <strong>HEAR. ME. OUT. M04 LIVE BALLOT</strong> — Verified room participation.
              One authenticated vote per attendee. Results broadcast directly from the PostgreSQL instance.
            </p>
          </div>
        </footer>
      </div>
    </main>
  )
}
