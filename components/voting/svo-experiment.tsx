'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Brain,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  BarChart2,
  Users,
  RotateCcw,
  Search,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import {
  SVO_QUESTIONS,
  ORIENTATION_DESCRIPTIONS,
  calculateSVO,
  ChoiceKey,
  OrientationType,
  PhaseType,
  SVOResponseRecord,
} from '@/lib/svo/data'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

interface SVOExperimentProps {
  user: { id: string; name: string; email?: string } | null
  isAuthLoading: boolean
  onGoogleSignIn: () => void
  isSigningIn: boolean
  roomChannel?: any
}

export function SVOExperiment({
  user,
  isAuthLoading,
  onGoogleSignIn,
  isSigningIn,
  roomChannel,
}: SVOExperimentProps) {
  // Phase state: 'pre' (before lecture) or 'post' (after lecture)
  const [phase, setPhase] = useState<PhaseType>('pre')
  // Active sub-view: 'test' (taking/viewing questionnaire) or 'analytics' (room charts)
  const [subView, setSubView] = useState<'test' | 'analytics'>('test')
  // Active question index: 0 to 8
  const [activeQuestion, setActiveQuestion] = useState<number>(0)
  // User's choices for the 9 questions: { [questionId]: 'A' | 'B' | 'C' }
  const [choices, setChoices] = useState<Record<number, ChoiceKey>>({})
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedResult, setSubmittedResult] = useState<{
    orientation: OrientationType
    prosocialCount: number
    individualisticCount: number
    competitiveCount: number
  } | null>(null)

  // Real-time audience responses
  const [allResponses, setAllResponses] = useState<SVOResponseRecord[]>([])
  const [analyticsPhaseFilter, setAnalyticsPhaseFilter] = useState<'all' | 'pre' | 'post'>('all')

  // Search & Filter for audience list
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  // Load cached result from localStorage on mount / phase switch
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.id) {
      const saved = localStorage.getItem(`hmo_svo_result_${user.id}_${phase}`)
      if (saved) {
        try {
          setSubmittedResult(JSON.parse(saved))
        } catch {
          setSubmittedResult(null)
        }
      } else {
        setSubmittedResult(null)
      }
    }
  }, [user?.id, phase])

  // Fetch initial responses from Supabase
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const supabase = createClient()
    supabase
      .from('svo_responses')
      .select('*')
      .eq('motion_id', 'm6')
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setAllResponses(data as SVOResponseRecord[])
          if (user?.id) {
            const existing = (data as SVOResponseRecord[]).find(
              (r) => r.user_id === user.id && r.phase === phase
            )
            if (existing) {
              setSubmittedResult({
                orientation: existing.orientation,
                prosocialCount: existing.prosocial_count,
                individualisticCount: existing.individualistic_count,
                competitiveCount: existing.competitive_count,
              })
              if (existing.choices) {
                setChoices(existing.choices)
              }
            }
          }
        }
      })
      .catch((err) => console.warn('Notice loading svo_responses:', err))

    // Real-time broadcast listener
    if (roomChannel) {
      roomChannel.on('broadcast', { event: 'svo_submission' }, ({ payload }: any) => {
        if (payload) {
          setAllResponses((prev) => {
            const filtered = prev.filter(
              (r) => !(r.user_id === payload.user_id && r.phase === payload.phase)
            )
            return [payload, ...filtered]
          })
        }
      })
    }
  }, [roomChannel, user?.id, phase])

  // Choice selection
  const handleSelectChoice = (questionId: number, choice: ChoiceKey) => {
    setChoices((prev) => ({ ...prev, [questionId]: choice }))
  }

  const answeredCount = Object.keys(choices).length
  const allAnswered = answeredCount === 9
  const currentQ = SVO_QUESTIONS[activeQuestion]
  const currentChoice = choices[currentQ.id]
  const calculated = calculateSVO(choices)

  // Submit response
  const handleSubmit = async () => {
    if (!allAnswered || !user) return
    setIsSubmitting(true)

    const resultRecord: SVOResponseRecord = {
      motion_id: 'm6',
      user_id: user.id,
      display_name: user.name,
      email: user.email,
      phase,
      orientation: calculated.orientation,
      choices,
      prosocial_count: calculated.prosocialCount,
      individualistic_count: calculated.individualisticCount,
      competitive_count: calculated.competitiveCount,
      updated_at: new Date().toISOString(),
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(`hmo_svo_result_${user.id}_${phase}`, JSON.stringify(calculated))
    }

    setSubmittedResult(calculated)

    // Optimistic update
    setAllResponses((prev) => {
      const filtered = prev.filter(
        (r) => !(r.user_id === resultRecord.user_id && r.phase === resultRecord.phase)
      )
      return [resultRecord, ...filtered]
    })

    // Supabase upsert & broadcast
    try {
      if (roomChannel) {
        roomChannel.send({
          type: 'broadcast',
          event: 'svo_submission',
          payload: resultRecord,
        })
      }

      if (isSupabaseConfigured()) {
        const supabase = createClient()
        await supabase.from('svo_responses').upsert(
          {
            motion_id: 'm6',
            user_id: user.id,
            display_name: user.name,
            email: user.email || null,
            phase,
            orientation: calculated.orientation,
            choices,
            prosocial_count: calculated.prosocialCount,
            individualistic_count: calculated.individualisticCount,
            competitive_count: calculated.competitiveCount,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'motion_id,user_id,phase' }
        )
      }
    } catch (err) {
      console.warn('SVO submit notice:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetake = () => {
    setChoices({})
    setActiveQuestion(0)
    setSubmittedResult(null)
    if (typeof window !== 'undefined' && user?.id) {
      localStorage.removeItem(`hmo_svo_result_${user.id}_${phase}`)
    }
  }

  // --- STATS CALCULATIONS ---
  const filteredResponses = useMemo(() => {
    if (analyticsPhaseFilter === 'all') return allResponses
    return allResponses.filter((r) => r.phase === analyticsPhaseFilter)
  }, [allResponses, analyticsPhaseFilter])

  const totalCount = filteredResponses.length
  const prosocialCount = filteredResponses.filter((r) => r.orientation === 'prosocial').length
  const individualisticCount = filteredResponses.filter((r) => r.orientation === 'individualistic').length
  const competitiveCount = filteredResponses.filter((r) => r.orientation === 'competitive').length

  const prosocialPct = totalCount > 0 ? Math.round((prosocialCount / totalCount) * 100) : 0
  const individualisticPct = totalCount > 0 ? Math.round((individualisticCount / totalCount) * 100) : 0
  const competitivePct = totalCount > 0 ? Math.round((competitiveCount / totalCount) * 100) : 0

  // Pre vs Post breakdown
  const preResponses = useMemo(() => allResponses.filter((r) => r.phase === 'pre'), [allResponses])
  const postResponses = useMemo(() => allResponses.filter((r) => r.phase === 'post'), [allResponses])

  const preTotal = preResponses.length
  const postTotal = postResponses.length

  const preProPct = preTotal > 0 ? Math.round((preResponses.filter((r) => r.orientation === 'prosocial').length / preTotal) * 100) : 0
  const postProPct = postTotal > 0 ? Math.round((postResponses.filter((r) => r.orientation === 'prosocial').length / postTotal) * 100) : 0

  const preIndPct = preTotal > 0 ? Math.round((preResponses.filter((r) => r.orientation === 'individualistic').length / preTotal) * 100) : 0
  const postIndPct = postTotal > 0 ? Math.round((postResponses.filter((r) => r.orientation === 'individualistic').length / postTotal) * 100) : 0

  const preCompPct = preTotal > 0 ? Math.round((preResponses.filter((r) => r.orientation === 'competitive').length / preTotal) * 100) : 0
  const postCompPct = postTotal > 0 ? Math.round((postResponses.filter((r) => r.orientation === 'competitive').length / postTotal) * 100) : 0

  // Filtered Roster for "Who selected what"
  const rosterList = useMemo(() => {
    return allResponses.filter((r) => {
      if (analyticsPhaseFilter !== 'all' && r.phase !== analyticsPhaseFilter) return false
      if (filterType !== 'all' && r.orientation !== filterType) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const nameMatch = r.display_name.toLowerCase().includes(q)
        const emailMatch = r.email ? r.email.toLowerCase().includes(q) : false
        return nameMatch || emailMatch
      }
      return true
    })
  }, [allResponses, analyticsPhaseFilter, filterType, searchQuery])

  return (
    <div className="svo-wrapper">
      {/* 1. Header & Plain-English Context */}
      <div className="svo-intro-card">
        <div className="svo-badge-row">
          <span className="svo-tag">Dr. Harshil Vyas • IIT Research Consultant</span>
          <span className="svo-subtag">Social Value Orientation</span>
        </div>

        <h2 className="svo-heading">
          Where does your moral compass really point?
        </h2>

        <p className="svo-intro-text">
          In this experiment, imagine you have been randomly paired with an <strong>anonymous stranger</strong> in this room whom you will never knowingly meet.
        </p>

        <div className="svo-rules-box">
          <div className="rule-item">
            <span className="rule-num">1</span>
            <p>You will face <strong>9 simple scenarios</strong>. In each one, choose how a pool of points is divided between <strong>You</strong> and the <strong>Other Person</strong>.</p>
          </div>
          <div className="rule-item">
            <span className="rule-num">2</span>
            <p><strong>Points have real value:</strong> The more points you get, the better for you. The more points the other gets, the better for them.</p>
          </div>
          <div className="rule-item">
            <span className="rule-num">3</span>
            <p><strong>There are no wrong answers.</strong> Don&apos;t pick what sounds polite or &ldquo;virtuous.&rdquo; Choose what you would actually do.</p>
          </div>
        </div>

        {/* Phase Toggle (Round 1 vs Round 2) */}
        <div className="svo-round-selector">
          <button
            type="button"
            onClick={() => {
              setPhase('pre')
              setChoices({})
              setActiveQuestion(0)
            }}
            className={`svo-round-btn ${phase === 'pre' ? 'is-active' : ''}`}
          >
            <span className="round-badge">ROUND 1</span>
            <div className="round-text">
              <strong>Pre-Lecture Baseline</strong>
              <small>Take before Dr. Harshil&apos;s session</small>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setPhase('post')
              setChoices({})
              setActiveQuestion(0)
            }}
            className={`svo-round-btn ${phase === 'post' ? 'is-active' : ''}`}
          >
            <span className="round-badge">ROUND 2</span>
            <div className="round-text">
              <strong>Post-Lecture Verdict</strong>
              <small>Take after the session to measure your shift</small>
            </div>
          </button>
        </div>
      </div>

      {/* Sub-view Switcher: Questionnaire vs Room Analytics */}
      <div className="svo-subview-nav">
        <button
          type="button"
          onClick={() => setSubView('test')}
          className={`subview-tab ${subView === 'test' ? 'active' : ''}`}
        >
          <Brain size={16} />
          <span>My Experiment {submittedResult ? '(Completed)' : `(${answeredCount}/9)`}</span>
        </button>
        <button
          type="button"
          onClick={() => setSubView('analytics')}
          className={`subview-tab ${subView === 'analytics' ? 'active' : ''}`}
        >
          <BarChart2 size={16} />
          <span>Live Room Analytics ({allResponses.length})</span>
        </button>
      </div>

      {/* 2. AUTHENTICATION GATE */}
      {isAuthLoading ? (
        <div className="svo-loading-card">
          <RefreshCw size={22} className="animate-spin text-red-500" />
          <span>Connecting to secure study...</span>
        </div>
      ) : !user ? (
        <div className="svo-auth-card">
          <div className="auth-card-inner">
            <h3>Sign in to participate</h3>
            <p>
              Dr. Harshil&apos;s research requires one verified participant per seat to prevent skewed data.
              Signing in once unlocks both this experiment and the Live Motion 06 Ballot.
            </p>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('hmo_auth_return_to', '/m6?tab=svo')
                  document.cookie = `hmo_auth_return_to=${encodeURIComponent('/m6?tab=svo')}; path=/; max-age=600; SameSite=Lax`
                }
                onGoogleSignIn()
              }}
              disabled={isSigningIn}
              className="google-signin-button"
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
            <small className="auth-privacy-note">
              🔒 No passwords or spam. Your raw email address is never made public.
            </small>
          </div>
        </div>
      ) : subView === 'test' ? (
        /* ========================================================================= */
        /* SUBVIEW: STEP-BY-STEP QUESTIONNAIRE OR PERSONAL RESULT                     */
        /* ========================================================================= */
        !submittedResult ? (
          <div className="svo-quiz-box">
            {/* Step Counter & Progress Bar */}
            <div className="quiz-progress-header">
              <div className="progress-label-row">
                <span className="scenario-step-badge">
                  SCENARIO {activeQuestion + 1} OF 9
                </span>
                <span className="answered-status-text">
                  {answeredCount} of 9 selected
                </span>
              </div>
              <div className="quiz-progress-track">
                <div
                  className="quiz-progress-fill"
                  style={{ width: `${((activeQuestion + 1) / 9) * 100}%` }}
                />
              </div>
            </div>

            {/* Quick jump step dots */}
            <div className="quiz-step-dots" aria-label="Step navigation">
              {SVO_QUESTIONS.map((q, idx) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setActiveQuestion(idx)}
                  className={`step-dot-btn ${idx === activeQuestion ? 'current' : ''} ${
                    choices[q.id] ? 'answered' : ''
                  }`}
                  aria-label={`Jump to scenario ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {/* Scenario Prompt */}
            <div className="scenario-prompt">
              <h3>Which distribution of points do you prefer?</h3>
              <p>Pick the split you would naturally choose between yourself and a stranger.</p>
            </div>

            {/* 3 Choice Cards */}
            <div className="choice-cards-container">
              {(['A', 'B', 'C'] as ChoiceKey[]).map((letter) => {
                const opt = currentQ.options[letter]
                const isSelected = currentChoice === letter

                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleSelectChoice(currentQ.id, letter)}
                    className={`scenario-choice-card ${isSelected ? 'is-selected' : ''}`}
                  >
                    <div className="choice-top-line">
                      <span className="choice-letter-tag">OPTION {letter}</span>
                      {isSelected ? (
                        <span className="selected-tag">
                          <CheckCircle2 size={15} /> SELECTED
                        </span>
                      ) : (
                        <span className="tap-prompt">TAP TO SELECT</span>
                      )}
                    </div>

                    <div className="choice-values-row">
                      <div className="value-block you-block">
                        <span className="value-label">YOU GET</span>
                        <strong className="value-num">{opt.you} <small>pts</small></strong>
                      </div>
                      <div className="value-separator" />
                      <div className="value-block other-block">
                        <span className="value-label">STRANGER GETS</span>
                        <strong className="value-num">{opt.other} <small>pts</small></strong>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Step Navigation Controls */}
            <div className="quiz-controls-row">
              <button
                type="button"
                onClick={() => setActiveQuestion((prev) => Math.max(0, prev - 1))}
                disabled={activeQuestion === 0}
                className="button button-small button-outline-black"
                style={{ opacity: activeQuestion === 0 ? 0.35 : 1 }}
              >
                <ChevronLeft size={16} /> Back
              </button>

              {activeQuestion < 8 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (currentChoice) {
                      setActiveQuestion((prev) => Math.min(8, prev + 1))
                    }
                  }}
                  disabled={!currentChoice}
                  className="button button-small button-black"
                  style={{ opacity: !currentChoice ? 0.45 : 1 }}
                >
                  Next Scenario <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!allAnswered || isSubmitting}
                  className="button button-small button-red"
                  style={{ opacity: !allAnswered || isSubmitting ? 0.45 : 1 }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      Submit &amp; View Result ({answeredCount}/9) <ArrowRight size={15} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Personal Result Reveal */
          <div className="svo-result-card">
            <div className="result-phase-badge">
              {phase === 'pre' ? 'ROUND 1 • PRE-LECTURE RESULT' : 'ROUND 2 • POST-LECTURE RESULT'}
            </div>

            <div
              className="result-hero-box"
              style={{
                borderColor: ORIENTATION_DESCRIPTIONS[submittedResult.orientation].color,
              }}
            >
              <span className="result-emoji-icon">
                {ORIENTATION_DESCRIPTIONS[submittedResult.orientation].emoji}
              </span>
              <span className="result-category-label">
                {ORIENTATION_DESCRIPTIONS[submittedResult.orientation].badge}
              </span>
              <h3 className="result-title-text">
                {ORIENTATION_DESCRIPTIONS[submittedResult.orientation].title}
              </h3>
              <p className="result-subtitle-text">
                {ORIENTATION_DESCRIPTIONS[submittedResult.orientation].subtitle}
              </p>
              <p className="result-body-text">
                {ORIENTATION_DESCRIPTIONS[submittedResult.orientation].description}
              </p>

              {/* 9-Question Breakdown */}
              <div className="result-breakdown-row">
                <div className="breakdown-stat">
                  <span>COOPERATIVE</span>
                  <strong>{submittedResult.prosocialCount} / 9</strong>
                </div>
                <div className="breakdown-stat">
                  <span>SELF-GAIN</span>
                  <strong>{submittedResult.individualisticCount} / 9</strong>
                </div>
                <div className="breakdown-stat">
                  <span>COMPETITIVE</span>
                  <strong>{submittedResult.competitiveCount} / 9</strong>
                </div>
              </div>
            </div>

            <div className="result-actions-grid">
              <button
                type="button"
                onClick={() => setSubView('analytics')}
                className="button button-red"
              >
                <BarChart2 size={16} /> View Room Results ({allResponses.length} Votes)
              </button>

              <button
                type="button"
                onClick={handleRetake}
                className="button button-outline-black"
              >
                <RotateCcw size={15} /> Retake Round
              </button>

              {phase === 'pre' && (
                <button
                  type="button"
                  onClick={() => {
                    setPhase('post')
                    setChoices({})
                    setActiveQuestion(0)
                    setSubmittedResult(null)
                  }}
                  className="button button-black"
                >
                  Proceed to Round 2 (Post-Lecture) <ArrowRight size={15} />
                </button>
              )}
            </div>
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* SUBVIEW: LIVE ROOM ANALYTICS (GRAPHS & WHO SELECTED WHAT)                 */
        /* ========================================================================= */
        <div className="svo-analytics-container">
          {/* Filter Bar: All vs Pre vs Post */}
          <div className="analytics-filter-header">
            <span className="analytics-filter-label">Filter Audience Data:</span>
            <div className="analytics-filter-buttons">
              <button
                type="button"
                onClick={() => setAnalyticsPhaseFilter('all')}
                className={`filter-btn ${analyticsPhaseFilter === 'all' ? 'active' : ''}`}
              >
                All Responses ({allResponses.length})
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsPhaseFilter('pre')}
                className={`filter-btn ${analyticsPhaseFilter === 'pre' ? 'active' : ''}`}
              >
                Pre-Lecture ({preTotal})
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsPhaseFilter('post')}
                className={`filter-btn ${analyticsPhaseFilter === 'post' ? 'active' : ''}`}
              >
                Post-Lecture ({postTotal})
              </button>
            </div>
          </div>

          {totalCount === 0 ? (
            <div className="analytics-empty-box">
              <Users size={32} className="opacity-40 mb-2" />
              <h4>No audience data recorded yet for this filter</h4>
              <p>Be the first to submit your answers above!</p>
              <button
                type="button"
                onClick={() => setSubView('test')}
                className="button button-small button-red mt-3"
              >
                Take the Test <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <>
              {/* Graph 1: Room Distribution */}
              <div className="analytics-card">
                <div className="card-heading-row">
                  <BarChart2 size={18} className="text-red-500" />
                  <h3>Room Moral Distribution ({totalCount} Verified Participants)</h3>
                </div>

                {/* Composite Bar */}
                <div className="room-bar-wrapper">
                  <div className="room-distribution-bar">
                    {prosocialPct > 0 && (
                      <div
                        className="bar-slice slice-prosocial"
                        style={{ width: `${prosocialPct}%` }}
                        title={`Cooperative: ${prosocialPct}%`}
                      >
                        {prosocialPct >= 10 && <span>{prosocialPct}%</span>}
                      </div>
                    )}
                    {individualisticPct > 0 && (
                      <div
                        className="bar-slice slice-individualistic"
                        style={{ width: `${individualisticPct}%` }}
                        title={`Self-Maximizing: ${individualisticPct}%`}
                      >
                        {individualisticPct >= 10 && <span>{individualisticPct}%</span>}
                      </div>
                    )}
                    {competitivePct > 0 && (
                      <div
                        className="bar-slice slice-competitive"
                        style={{ width: `${competitivePct}%` }}
                        title={`Competitive: ${competitivePct}%`}
                      >
                        {competitivePct >= 10 && <span>{competitivePct}%</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3 Orientation Stat Cards */}
                <div className="orientation-stats-grid">
                  <div className="orientation-stat-card card-prosocial">
                    <div className="stat-card-header">
                      <span>🤝 COOPERATIVE</span>
                      <strong>{prosocialPct}%</strong>
                    </div>
                    <div className="stat-card-bar">
                      <div style={{ width: `${prosocialPct}%` }} />
                    </div>
                    <p className="stat-card-desc">
                      Prioritizes joint equality and fair outcomes ({prosocialCount} participants).
                    </p>
                  </div>

                  <div className="orientation-stat-card card-individualistic">
                    <div className="stat-card-header">
                      <span>👤 SELF-MAXIMIZING</span>
                      <strong>{individualisticPct}%</strong>
                    </div>
                    <div className="stat-card-bar">
                      <div style={{ width: `${individualisticPct}%` }} />
                    </div>
                    <p className="stat-card-desc">
                      Maximizes own payoff regardless of others ({individualisticCount} participants).
                    </p>
                  </div>

                  <div className="orientation-stat-card card-competitive">
                    <div className="stat-card-header">
                      <span>⚔️ COMPETITIVE</span>
                      <strong>{competitivePct}%</strong>
                    </div>
                    <div className="stat-card-bar">
                      <div style={{ width: `${competitivePct}%` }} />
                    </div>
                    <p className="stat-card-desc">
                      Seeks relative advantage and winning over others ({competitiveCount} participants).
                    </p>
                  </div>
                </div>
              </div>

              {/* Graph 2: Pre vs Post Lecture Moral Shift */}
              {(preTotal > 0 || postTotal > 0) && (
                <div className="analytics-card">
                  <div className="card-heading-row">
                    <Users size={18} className="text-red-500" />
                    <h3>Did Dr. Harshil&apos;s Lecture Shift the Room?</h3>
                  </div>

                  <p className="analytics-subtext">
                    Comparing audience mindsets before the talk vs after:
                  </p>

                  <div className="shift-comparison-table">
                    <div className="shift-row shift-header">
                      <span>Orientation</span>
                      <span>Pre-Lecture ({preTotal})</span>
                      <span>Post-Lecture ({postTotal})</span>
                      <span>Net Shift</span>
                    </div>

                    <div className="shift-row">
                      <strong className="text-emerald-400">Cooperative (Prosocial)</strong>
                      <span>{preProPct}%</span>
                      <span>{postProPct}%</span>
                      <strong className={postProPct >= preProPct ? 'text-emerald-400' : 'text-red-400'}>
                        {postProPct - preProPct >= 0 ? `+${postProPct - preProPct}%` : `${postProPct - preProPct}%`}
                      </strong>
                    </div>

                    <div className="shift-row">
                      <strong className="text-amber-400">Self-Gain (Individualistic)</strong>
                      <span>{preIndPct}%</span>
                      <span>{postIndPct}%</span>
                      <strong className={postIndPct >= preIndPct ? 'text-amber-400' : 'text-zinc-400'}>
                        {postIndPct - preIndPct >= 0 ? `+${postIndPct - preIndPct}%` : `${postIndPct - preIndPct}%`}
                      </strong>
                    </div>

                    <div className="shift-row">
                      <strong className="text-red-400">Competitive (Dominance)</strong>
                      <span>{preCompPct}%</span>
                      <span>{postCompPct}%</span>
                      <strong className={postCompPct >= preCompPct ? 'text-red-400' : 'text-emerald-400'}>
                        {postCompPct - preCompPct >= 0 ? `+${postCompPct - preCompPct}%` : `${postCompPct - preCompPct}%`}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Graph 3: Verified Audience Feed ("Who Selected What") */}
              <div className="analytics-card">
                <div className="card-heading-row">
                  <Users size={18} className="text-red-500" />
                  <h3>Audience Roster ({rosterList.length} verified submissions)</h3>
                </div>

                <div className="roster-search-bar">
                  <div className="search-input-wrap">
                    <Search size={15} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search participant name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                  </div>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Orientations</option>
                    <option value="prosocial">Cooperative</option>
                    <option value="individualistic">Self-Maximizing</option>
                    <option value="competitive">Competitive</option>
                  </select>
                </div>

                <div className="roster-list">
                  {rosterList.map((item, idx) => {
                    const desc = ORIENTATION_DESCRIPTIONS[item.orientation]
                    return (
                      <div key={item.id || `${item.user_id}_${item.phase}_${idx}`} className="roster-item">
                        <div className="roster-user-info">
                          <span className="roster-user-name">{item.display_name}</span>
                          <span className="roster-phase-tag">
                            {item.phase === 'pre' ? 'Round 1 (Pre)' : 'Round 2 (Post)'}
                          </span>
                        </div>
                        <div
                          className="roster-badge"
                          style={{
                            borderColor: desc?.color || '#dc2626',
                            color: desc?.color || '#ffffff',
                          }}
                        >
                          <span>{desc?.emoji}</span>
                          <strong>{desc?.title || item.orientation}</strong>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          <div className="analytics-back-action">
            <button
              type="button"
              onClick={() => setSubView('test')}
              className="button button-small button-outline-black"
            >
              ← Back to My Experiment
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
