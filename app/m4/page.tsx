'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Lock,
  ChevronLeft,
  Flame,
  ArrowRight,
  Archive,
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

export default function Motion04LiveVotingPage() {
  // Motion 04 is permanently CLOSED (Concluded historical motion)
  const motionStatus = 'closed'
  const motionTitle = 'DOES CELEBRITY WORSHIP HAVE GONE TOO FAR?'

  // Auth States
  const [user, setUser] = useState<{ id: string; name: string; email?: string } | null>(null)
  const [userVote, setUserVote] = useState<string | null>(null)

  // Real Database Votes for M4 from Supabase
  const [allVotes, setAllVotes] = useState<VoteRecord[]>([])
  const [viewerCount, setViewerCount] = useState<number>(1)
  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'disconnected'>('connected')

  const presenceChannelRef = useRef<any>(null)

  // -------------------------------------------------------------
  // 1. Initial Session & Data Fetching (Real Supabase M4 Votes)
  // -------------------------------------------------------------
  const fetchMotionAndVotes = useCallback(async (userId?: string) => {
    if (!isSupabaseConfigured()) {
      return
    }

    try {
      const supabase = createClient()

      // Fetch authentic recorded votes for Motion 04 from Supabase
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('id, motion_id, user_id, display_name, choice, updated_at')
        .eq('motion_id', 'm4')
        .order('updated_at', { ascending: false })

      if (votesError) {
        console.error('Error fetching M4 votes:', votesError)
      } else if (votesData) {
        setAllVotes(votesData as VoteRecord[])

        if (userId) {
          const existing = (votesData as VoteRecord[]).find((v) => v.user_id === userId)
          if (existing) {
            setUserVote(existing.choice)
          }
        }
      }
    } catch (err: any) {
      console.error('M4 fetch error:', err)
    }
  }, [])

  // Setup Auth Listener (Read-only historical view)
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return
    }

    const supabase = createClient()

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
      console.error('Session check error:', err)
    })

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
        fetchMotionAndVotes()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchMotionAndVotes])

  // Presence Heartbeat
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return
    }

    const supabase = createClient()

    const roomChannel = supabase.channel('room:m4', {
      config: {
        presence: {
          key: user?.id || `anon-${Math.random().toString(36).substring(2, 9)}`,
        },
      },
    })

    roomChannel
      .on('presence', { event: 'sync' }, () => {
        const state = roomChannel.presenceState()
        const count = Object.keys(state).length
        if (count > 0) setViewerCount(count)
      })

    roomChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionState('connected')
        await roomChannel.track({
          online_at: new Date().toISOString(),
          user_id: user?.id || 'visitor',
        })
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConnectionState('disconnected')
      }
    })

    presenceChannelRef.current = roomChannel

    return () => {
      supabase.removeChannel(roomChannel)
    }
  }, [user?.id])

  // Tally calculations for real votes
  const tally: VoteTally = calculateTally(allVotes, 'YES', 'NO')

  return (
    <main className="live-event-shell">
      <div className="grain" aria-hidden="true" />

      {/* Event Header Bar */}
      <header className="event-top-bar">
        <Link href="/" className="event-back-link">
          <ChevronLeft size={16} />
          <span>HMO HOME</span>
        </Link>

        <div className="event-center-brand">
          <span className="brand-dot" style={{ background: '#71717a', boxShadow: 'none' }} />
          <span className="event-title-tag">HISTORICAL ARCHIVE / M04</span>
        </div>

        <div className="event-user-slot">
          <Link
            href="/m5"
            style={{
              background: 'var(--ink)',
              color: 'var(--yellow)',
              padding: '0.35rem 0.75rem',
              fontSize: '0.7rem',
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              boxShadow: '2px 2px 0 var(--ink)',
            }}
          >
            <span>GO TO M05</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </header>

      {/* Main Live Stage */}
      <div className="event-stage-container">
        {/* Banner linking to active M5 */}
        <div
          style={{
            background: 'var(--ink)',
            color: 'var(--cream)',
            border: '2px solid var(--ink)',
            boxShadow: '4px 4px 0 var(--red)',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.8rem',
            fontSize: '0.78rem',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
            <Archive size={16} style={{ color: 'var(--yellow)' }} />
            <span>
              <strong>M04 DEBATE CONCLUDED:</strong> This motion is now in the archive. Check out the current debate!
            </span>
          </div>
          <Link
            href="/m5"
            className="button button-small"
            style={{
              background: 'var(--yellow)',
              color: 'var(--ink)',
              padding: '0.4rem 0.8rem',
              fontSize: '0.72rem',
              fontWeight: 900,
            }}
          >
            VOTE ON M05 →
          </Link>
        </div>

        {/* Hero Section: Large Motion Identifier + Closed Badge */}
        <section className="motion-headline-section">
          <div className="motion-meta-row">
            <PresenceBadge viewerCount={viewerCount} isConnected={connectionState === 'connected'} />
            <div className="event-badge-m04" style={{ background: '#27272a' }}>
              <span className="badge-flame"><Flame size={13} /></span>
              <span>MOTION 04 • COMPLETED</span>
            </div>
          </div>

          <h1 className="live-motion-title">
            DOES CELEBRITY WORSHIP <br className="hidden sm:inline" />
            <span className="highlight-text" style={{ color: 'var(--ink)' }}>HAVE GONE TOO FAR?</span>
          </h1>

          <p className="motion-subtitle">
            19 September at Monkey Cafe. The live debate has concluded and final votes from the room are recorded below.
          </p>
        </section>

        {/* Concluded Status Card (No new votes permitted) */}
        <section className="voting-action-section">
          <div
            className="status-announcement-banner closed"
            style={{
              padding: '1.4rem 1.6rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              alignItems: 'flex-start',
              border: '3px solid var(--ink)',
              boxShadow: '6px 6px 0 var(--ink)',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', color: 'var(--yellow)' }}>
              <Lock size={20} />
              <strong style={{ fontSize: '1.25rem', letterSpacing: '-0.02em', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>
                VOTING CLOSED — THE DEBATE HAS ENDED
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, lineHeight: 1.4, fontWeight: 500, textTransform: 'none' }}>
              Voting for Motion 04 is now officially closed. The room has spoken, and the authentic votes recorded below stand as a historical record.
            </p>
          </div>
        </section>

        {/* Final Results Display from Supabase */}
        <section className="live-results-section" aria-label="Final M4 voting tally">
          <LiveResults
            tally={tally}
            userVote={userVote}
            votingStatus="closed"
            option1Key="YES"
            option2Key="NO"
            option1Title="YES"
            option2Title="NO"
            motionLabel="Motion 04"
          />
        </section>

        {/* Voter Activity Archive from Supabase */}
        <section className="voter-feed-section" aria-label="Historical voters">
          <VoterActivity recentVotes={allVotes} heading="VERIFIED AUDIENCE VOTES" />
        </section>

        {/* Footer */}
        <footer className="event-stage-footer">
          <div className="footer-notes">
            <p>
              <strong>HEAR. ME. OUT. M04 ARCHIVE</strong> — Permanent event record from 19 September at Monkey Cafe.
              All {allVotes.length} authentic votes are preserved from the live event.
            </p>
          </div>
        </footer>
      </div>
    </main>
  )
}
