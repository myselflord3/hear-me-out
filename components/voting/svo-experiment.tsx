'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Brain,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  BarChart2,
  Users,
  Flame,
  Scale,
  Award,
  ChevronRight,
  RotateCcw,
  Lock,
  Search,
  ChevronDown,
  ChevronUp,
  Ghost,
  ShieldAlert,
  Sliders,
  Layers,
  HelpCircle,
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
  // Phase state: 'pre' or 'post'
  const [phase, setPhase] = useState<PhaseType>('pre')
  // Active question index: 0 to 8
  const [activeQuestion, setActiveQuestion] = useState<number>(0)
  // User's choices for the 9 questions
  const [choices, setChoices] = useState<Record<number, ChoiceKey>>({})
  // Submitted state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedResult, setSubmittedResult] = useState<{
    orientation: OrientationType
    prosocialCount: number
    individualisticCount: number
    competitiveCount: number
  } | null>(null)

  // Realtime all room responses
  const [allResponses, setAllResponses] = useState<SVOResponseRecord[]>([])
  const [statsViewPhase, setStatsViewPhase] = useState<'all' | 'pre' | 'post'>('all')

  // Visual Graph 3: Selected Scenario index for dilemma deep-dive (0 to 8)
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState<number>(0)

  // Dossier Filters
  const [dossierSearch, setDossierSearch] = useState<string>('')
  const [dossierFilterPhase, setDossierFilterPhase] = useState<'all' | 'pre' | 'post'>('all')
  const [dossierFilterType, setDossierFilterType] = useState<string>('all')
  const [expandedUserKey, setExpandedUserKey] = useState<string | null>(null)

  // Check saved state for current user/phase
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

  // Fetch initial responses from Supabase DB
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
          // Check if current user already submitted
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

    // Realtime broadcast listener on roomChannel
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

  // Handle option selection
  const handleSelectChoice = (questionId: number, choice: ChoiceKey) => {
    const updated = { ...choices, [questionId]: choice }
    setChoices(updated)

    // Auto-advance to next question after tap
    if (activeQuestion < 8) {
      setTimeout(() => setActiveQuestion((prev) => prev + 1), 160)
    }
  }

  const answeredCount = Object.keys(choices).length
  const allAnswered = answeredCount === 9
  const calculated = calculateSVO(choices)

  // Submit response with verified Google identity
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

    // Optimistically update in-memory list
    setAllResponses((prev) => {
      const filtered = prev.filter(
        (r) => !(r.user_id === resultRecord.user_id && r.phase === resultRecord.phase)
      )
      return [resultRecord, ...filtered]
    })

    // Broadcast live to room
    try {
      if (roomChannel) {
        roomChannel.send({
          type: 'broadcast',
          event: 'svo_submission',
          payload: resultRecord,
        })
      }

      // Supabase atomic upsert with full user identity
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
      console.warn('Realtime SVO sync notice:', err)
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
    if (statsViewPhase === 'all') return allResponses
    return allResponses.filter((r) => r.phase === statsViewPhase)
  }, [allResponses, statsViewPhase])

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

  // Question-by-Question breakdown (Graph 3)
  const currentScenario = SVO_QUESTIONS[selectedScenarioIdx]
  const scenarioResponses = filteredResponses.filter((r) => r.choices && r.choices[currentScenario.id])
  const scenTotal = scenarioResponses.length
  const optACount = scenarioResponses.filter((r) => r.choices[currentScenario.id] === 'A').length
  const optBCount = scenarioResponses.filter((r) => r.choices[currentScenario.id] === 'B').length
  const optCCount = scenarioResponses.filter((r) => r.choices[currentScenario.id] === 'C').length

  const optAPct = scenTotal > 0 ? Math.round((optACount / scenTotal) * 100) : 0
  const optBPct = scenTotal > 0 ? Math.round((optBCount / scenTotal) * 100) : 0
  const optCPct = scenTotal > 0 ? Math.round((optCCount / scenTotal) * 100) : 0

  // Dossier filtered list ("Who Selected What")
  const dossierList = useMemo(() => {
    return allResponses.filter((r) => {
      if (dossierFilterPhase !== 'all' && r.phase !== dossierFilterPhase) return false
      if (dossierFilterType !== 'all' && r.orientation !== dossierFilterType) return false
      if (dossierSearch.trim()) {
        const query = dossierSearch.toLowerCase()
        const nameMatch = r.display_name.toLowerCase().includes(query)
        const emailMatch = r.email ? r.email.toLowerCase().includes(query) : false
        return nameMatch || emailMatch
      }
      return true
    })
  }, [allResponses, dossierFilterPhase, dossierFilterType, dossierSearch])

  const currentQ = SVO_QUESTIONS[activeQuestion]

  return (
    <div className="svo-container spooky-svo">
      {/* Experiment Header */}
      <div className="svo-header-card spooky-glass-card">
        <div className="svo-header-top">
          <div className="svo-tag-badge spooky-blood-badge">
            <Brain size={14} className="text-amber-400" />
            <span>DR. HARSHIL VYAS • IIT RESEARCH CONSULTANT STUDY</span>
          </div>
          <span className="svo-research-tag halloween-pulse-tag">
            <Flame size={12} /> HALLOWEEN MORAL ASSESSMENT
          </span>
        </div>

        <h2 className="svo-main-title spooky-title-glow">
          UNMASKING YOUR INNER SHADOW:<br />
          <span>HOW EVIL ARE YOU WHEN NO ONE WATCHES?</span>
        </h2>

        <p className="svo-instructions-concise spooky-subtext">
          Imagine you are paired with an anonymous stranger in this room. You will never meet.
          Each decision allocates points to <strong>You</strong> and to <strong>Them</strong>.
          There are no right or wrong answers — choose what your gut genuinely desires.
        </p>

        {/* Phase Selector (PRE vs POST) */}
        <div className="svo-phase-selector spooky-phase-selector">
          <button
            type="button"
            onClick={() => {
              setPhase('pre')
              setChoices({})
              setActiveQuestion(0)
            }}
            className={`svo-phase-btn spooky-phase-btn ${phase === 'pre' ? 'active-phase' : ''}`}
          >
            <span className="phase-indicator">01</span>
            <div>
              <strong>PRE-LECTURE RESPONSE 🕯️</strong>
              <small>Take this before Dr. Harshil reveals human nature</small>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setPhase('post')
              setChoices({})
              setActiveQuestion(0)
            }}
            className={`svo-phase-btn spooky-phase-btn ${phase === 'post' ? 'active-phase' : ''}`}
          >
            <span className="phase-indicator">02</span>
            <div>
              <strong>POST-LECTURE RESPONSE 🎭</strong>
              <small>Take this after the session to measure your moral shift</small>
            </div>
          </button>
        </div>
      </div>

      {/* REQUIRE GOOGLE AUTHENTICATION */}
      {isAuthLoading ? (
        <div className="svo-auth-gate-card spooky-glass-card">
          <RefreshCw size={26} className="animate-spin text-amber-500" />
          <p>Connecting to secure Google research ballot...</p>
        </div>
      ) : !user ? (
        <div className="svo-auth-gate-card spooky-glass-card">
          <div className="spooky-gate-icon-halo">
            <Ghost size={34} className="text-red-500" />
          </div>
          <div className="svo-gate-content">
            <span className="spooky-gate-tag">AUTHENTICATION REQUIRED</span>
            <h3 className="spooky-gate-title">SIGN IN TO RECORD YOUR SHADOW PROFILE</h3>
            <p className="spooky-gate-desc">
              To cross-analyze individual responses before and after the lecture, Dr. Harshil&apos;s
              study requires verified Google authentication. Your choices will be tied to your verified identity.
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
              className="google-signin-button spooky-google-btn"
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
                  <span>SIGN IN WITH GOOGLE TO PARTICIPATE</span>
                </>
              )}
            </button>
            <span className="spooky-gate-note">
              🔒 Authenticates once for both the Moral Tribunal Ballot and Dr. Harshil&apos;s SVO Study.
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Authenticated Participant Pill */}
          <div className="svo-user-banner spooky-user-banner">
            <div className="user-info-left">
              <span className="candle-flame-icon">🕯️</span>
              <div>
                <strong>VERIFIED SUBJECT: {user.name}</strong>
                {user.email && <small>{user.email}</small>}
              </div>
            </div>
            <span className="identity-verified-pill">GOOGLE VERIFIED</span>
          </div>

          {/* Main Interactive Body: Quiz OR Result */}
          {!submittedResult ? (
            <div className="svo-quiz-card spooky-glass-card">
              {/* Progress Header */}
              <div className="svo-progress-row">
                <div className="svo-step-counter">
                  <strong>SCENARIO {activeQuestion + 1}</strong>
                  <span>OF 9</span>
                </div>
                <div className="svo-progress-pills">
                  {SVO_QUESTIONS.map((q, idx) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setActiveQuestion(idx)}
                      className={`svo-pill-dot ${idx === activeQuestion ? 'current' : ''} ${
                        choices[q.id] ? 'answered' : ''
                      }`}
                      aria-label={`Jump to question ${idx + 1}`}
                    />
                  ))}
                </div>
                <span className="svo-answered-badge">
                  {answeredCount}/9 CHOSEN
                </span>
              </div>

              {/* Current Question Choice Cards */}
              <div className="svo-choices-grid">
                {(['A', 'B', 'C'] as ChoiceKey[]).map((letter) => {
                  const opt = currentQ.options[letter]
                  const isSelected = choices[currentQ.id] === letter

                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => handleSelectChoice(currentQ.id, letter)}
                      className={`svo-choice-box spooky-choice-box ${isSelected ? 'is-selected' : ''}`}
                    >
                      <div className="svo-choice-header">
                        <span className="svo-letter-badge">OPTION {letter}</span>
                        {isSelected && (
                          <span className="svo-selected-check">
                            <CheckCircle2 size={15} /> SELECTED
                          </span>
                        )}
                      </div>

                      <div className="svo-points-breakdown">
                        <div className="svo-point-row you-points">
                          <span className="point-label">YOU RECEIVE:</span>
                          <strong className="point-val">{opt.you} pts</strong>
                        </div>
                        <div className="svo-point-divider" />
                        <div className="svo-point-row other-points">
                          <span className="point-label">STRANGER RECEIVES:</span>
                          <strong className="point-val">{opt.other} pts</strong>
                        </div>
                      </div>

                      <div className="svo-choice-footer">
                        <span className="tap-hint">
                          {isSelected ? 'VERDICT LOCKED' : 'TAP TO CHOOSE'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Navigation Controls */}
              <div className="svo-nav-bar">
                <button
                  type="button"
                  onClick={() => setActiveQuestion((prev) => Math.max(0, prev - 1))}
                  disabled={activeQuestion === 0}
                  className="button button-small button-outline-black spooky-btn"
                >
                  PREVIOUS
                </button>

                {activeQuestion < 8 ? (
                  <button
                    type="button"
                    onClick={() => setActiveQuestion((prev) => Math.min(8, prev + 1))}
                    className="button button-small button-black spooky-btn-black"
                  >
                    NEXT SCENARIO <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!allAnswered || isSubmitting}
                    className="button button-small button-red spooky-btn-red"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        RECORDING VERDICT...
                      </>
                    ) : (
                      <>
                        SUBMIT SHADOW PROFILE ({answeredCount}/9) <CheckCircle2 size={14} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Result Reveal Card */
            <div className="svo-result-card spooky-glass-card">
              <div className="svo-result-header">
                <span className="result-eyebrow">
                  {phase === 'pre' ? '🕯️ PRE-LECTURE DIAGNOSIS' : '🎭 POST-LECTURE DIAGNOSIS'}
                </span>
                <span className="result-verified-pill">OFFICIAL SVO ORIENTATION</span>
              </div>

              <div
                className="svo-result-hero spooky-hero-border"
                style={{
                  borderColor: ORIENTATION_DESCRIPTIONS[submittedResult.orientation].color,
                }}
              >
                <div className="result-emoji">
                  {ORIENTATION_DESCRIPTIONS[submittedResult.orientation].emoji}
                </div>
                <div className="result-type-tag">
                  {ORIENTATION_DESCRIPTIONS[submittedResult.orientation].badge}
                </div>
                <h3 className="result-name">
                  {ORIENTATION_DESCRIPTIONS[submittedResult.orientation].title}
                </h3>
                <p className="result-subtitle">
                  {ORIENTATION_DESCRIPTIONS[submittedResult.orientation].subtitle}
                </p>
                <p className="result-description">
                  {ORIENTATION_DESCRIPTIONS[submittedResult.orientation].description}
                </p>

                <div className="result-counts-bar">
                  <div>
                    <span>COOPERATIVE</span>
                    <strong>{submittedResult.prosocialCount}/9</strong>
                  </div>
                  <div>
                    <span>SELF-GAIN</span>
                    <strong>{submittedResult.individualisticCount}/9</strong>
                  </div>
                  <div>
                    <span>DARK EDGE (DOMINANCE)</span>
                    <strong>{submittedResult.competitiveCount}/9</strong>
                  </div>
                </div>
              </div>

              <div className="svo-result-actions">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="button button-small button-outline-black spooky-btn"
                >
                  <RotateCcw size={13} /> RETAKE THIS TEST
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
                    className="button button-small button-red spooky-btn-red"
                  >
                    TAKE POST-LECTURE ASSESSMENT <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* VISUAL GRAPHS SECTION (BELOW)                                             */}
      {/* ========================================================================= */}

      {/* GRAPH 1: Live Room Moral Spectrum */}
      <div className="svo-visual-card spooky-glass-card">
        <div className="visual-card-header">
          <div className="header-title-row">
            <BarChart2 size={18} className="text-red-500" />
            <h3 className="visual-heading">GRAPH 1: ROOM MORAL SPECTRUM</h3>
          </div>
          <div className="stats-view-tabs spooky-tabs">
            <button
              type="button"
              onClick={() => setStatsViewPhase('all')}
              className={`stats-tab ${statsViewPhase === 'all' ? 'active' : ''}`}
            >
              ALL SESSIONS ({allResponses.length})
            </button>
            <button
              type="button"
              onClick={() => setStatsViewPhase('pre')}
              className={`stats-tab ${statsViewPhase === 'pre' ? 'active' : ''}`}
            >
              PRE-LECTURE ({preTotal})
            </button>
            <button
              type="button"
              onClick={() => setStatsViewPhase('post')}
              className={`stats-tab ${statsViewPhase === 'post' ? 'active' : ''}`}
            >
              POST-LECTURE ({postTotal})
            </button>
          </div>
        </div>

        {totalCount === 0 ? (
          <div className="stats-empty-state">
            <Users size={28} className="opacity-40" />
            <p>No verified responses recorded yet.</p>
            <small>Sign in with Google above to place your verdict on the live chart.</small>
          </div>
        ) : (
          <div className="visual-graph-body">
            {/* 100% Composite Horizontal Distribution Bar */}
            <div className="composite-spectrum-bar-wrap">
              <div className="composite-bar-labels">
                <span className="comp-label-left">ROOM MORAL SPECTRUM ({totalCount} VERIFIED SUBJECTS)</span>
                <span className="comp-label-right">PROSOCIAL / INDIVIDUALISTIC / COMPETITIVE</span>
              </div>
              <div className="composite-spectrum-bar">
                {prosocialPct > 0 && (
                  <div
                    className="spectrum-seg seg-prosocial"
                    style={{ width: `${prosocialPct}%` }}
                    title={`Prosocial: ${prosocialPct}%`}
                  >
                    <span>{prosocialPct}%</span>
                  </div>
                )}
                {individualisticPct > 0 && (
                  <div
                    className="spectrum-seg seg-individualistic"
                    style={{ width: `${individualisticPct}%` }}
                    title={`Individualistic: ${individualisticPct}%`}
                  >
                    <span>{individualisticPct}%</span>
                  </div>
                )}
                {competitivePct > 0 && (
                  <div
                    className="spectrum-seg seg-competitive"
                    style={{ width: `${competitivePct}%` }}
                    title={`Competitive: ${competitivePct}%`}
                  >
                    <span>{competitivePct}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3 Archetype Cards with Big Visual Meters */}
            <div className="archetype-cards-grid">
              {/* Card 1: Prosocial */}
              <div className="archetype-stat-card card-prosocial">
                <div className="card-top">
                  <span className="card-emoji">🤝</span>
                  <span className="card-tag">EQUALITARIAN</span>
                </div>
                <div className="card-numbers">
                  <strong className="card-pct">{prosocialPct}%</strong>
                  <span className="card-count">{prosocialCount} subjects</span>
                </div>
                <div className="card-bar-track">
                  <div className="card-bar-fill fill-pro" style={{ width: `${prosocialPct}%` }} />
                </div>
                <h4 className="card-title">PROSOCIAL</h4>
                <p className="card-desc">
                  Values joint equality. Sacrifices personal dominance for mutual gain.
                </p>
              </div>

              {/* Card 2: Individualistic */}
              <div className="archetype-stat-card card-individualistic">
                <div className="card-top">
                  <span className="card-emoji">👤</span>
                  <span className="card-tag">PRAGMATIST</span>
                </div>
                <div className="card-numbers">
                  <strong className="card-pct">{individualisticPct}%</strong>
                  <span className="card-count">{individualisticCount} subjects</span>
                </div>
                <div className="card-bar-track">
                  <div className="card-bar-fill fill-ind" style={{ width: `${individualisticPct}%` }} />
                </div>
                <h4 className="card-title">INDIVIDUALISTIC</h4>
                <p className="card-desc">
                  Self-maximizer. Indifferent to the other person as long as their payout peaks.
                </p>
              </div>

              {/* Card 3: Competitive */}
              <div className="archetype-stat-card card-competitive">
                <div className="card-top">
                  <span className="card-emoji">⚔️</span>
                  <span className="card-tag">DARK EDGE</span>
                </div>
                <div className="card-numbers">
                  <strong className="card-pct">{competitivePct}%</strong>
                  <span className="card-count">{competitiveCount} subjects</span>
                </div>
                <div className="card-bar-track">
                  <div className="card-bar-fill fill-comp" style={{ width: `${competitivePct}%` }} />
                </div>
                <h4 className="card-title">COMPETITIVE</h4>
                <p className="card-desc">
                  Relative superiority. Sacrifices points just to keep the stranger down.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GRAPH 2: The Pre vs Post "Moral Shift" Comparison Matrix */}
      <div className="svo-visual-card spooky-glass-card">
        <div className="visual-card-header">
          <div className="header-title-row">
            <TrendingUp size={18} className="text-red-500" />
            <h3 className="visual-heading">GRAPH 2: THE MORAL SHIFT MATRIX (PRE VS POST LECTURE)</h3>
          </div>
          <span className="live-research-indicator">
            <span className="live-dot-mini" /> DR. HARSHIL&apos;S INTERVENTION IMPACT
          </span>
        </div>

        {preTotal === 0 || postTotal === 0 ? (
          <div className="shift-awaiting-box">
            <Scale size={24} className="opacity-40" />
            <p>
              <strong>Awaiting comparative data:</strong> Currently recorded {preTotal} Pre-Lecture and {postTotal} Post-Lecture responses.
            </p>
            <small>Once participants take both tests, the visual shift matrix dynamically calculates here.</small>
          </div>
        ) : (
          <div className="shift-comparison-body">
            {/* Summary shift insight badge */}
            <div className="shift-insight-alert">
              <ShieldAlert size={16} className="text-red-500" />
              <span>
                <strong>PSYCHOLOGICAL SHIFT: </strong>
                Competitive orientation shifted from <strong>{preCompPct}%</strong> to <strong>{postCompPct}%</strong>{' '}
                ({postCompPct >= preCompPct ? `+${postCompPct - preCompPct}% increase in dark dominance 🔺` : `${postCompPct - preCompPct}% decrease 🔻`}).
              </span>
            </div>

            {/* Visual grouped comparison bars */}
            <div className="grouped-shift-grid">
              {/* Prosocial Comparison */}
              <div className="grouped-bar-col">
                <div className="col-header">
                  <strong>PROSOCIAL 🤝</strong>
                  <span>{postProPct >= preProPct ? `+${postProPct - preProPct}%` : `${postProPct - preProPct}%`}</span>
                </div>
                <div className="dual-bar-container">
                  <div className="bar-sub-row">
                    <span className="bar-tag">PRE:</span>
                    <div className="bar-rail">
                      <div className="bar-fill-pre" style={{ width: `${preProPct}%` }} />
                    </div>
                    <span className="bar-val">{preProPct}%</span>
                  </div>
                  <div className="bar-sub-row">
                    <span className="bar-tag">POST:</span>
                    <div className="bar-rail">
                      <div className="bar-fill-post" style={{ width: `${postProPct}%` }} />
                    </div>
                    <span className="bar-val">{postProPct}%</span>
                  </div>
                </div>
              </div>

              {/* Individualistic Comparison */}
              <div className="grouped-bar-col">
                <div className="col-header">
                  <strong>INDIVIDUALISTIC 👤</strong>
                  <span>{postIndPct >= preIndPct ? `+${postIndPct - preIndPct}%` : `${postIndPct - preIndPct}%`}</span>
                </div>
                <div className="dual-bar-container">
                  <div className="bar-sub-row">
                    <span className="bar-tag">PRE:</span>
                    <div className="bar-rail">
                      <div className="bar-fill-pre ind" style={{ width: `${preIndPct}%` }} />
                    </div>
                    <span className="bar-val">{preIndPct}%</span>
                  </div>
                  <div className="bar-sub-row">
                    <span className="bar-tag">POST:</span>
                    <div className="bar-rail">
                      <div className="bar-fill-post ind" style={{ width: `${postIndPct}%` }} />
                    </div>
                    <span className="bar-val">{postIndPct}%</span>
                  </div>
                </div>
              </div>

              {/* Competitive Comparison */}
              <div className="grouped-bar-col">
                <div className="col-header">
                  <strong>COMPETITIVE ⚔️</strong>
                  <span className="text-red-400">
                    {postCompPct >= preCompPct ? `+${postCompPct - preCompPct}%` : `${postCompPct - preCompPct}%`}
                  </span>
                </div>
                <div className="dual-bar-container">
                  <div className="bar-sub-row">
                    <span className="bar-tag">PRE:</span>
                    <div className="bar-rail">
                      <div className="bar-fill-pre comp" style={{ width: `${preCompPct}%` }} />
                    </div>
                    <span className="bar-val">{preCompPct}%</span>
                  </div>
                  <div className="bar-sub-row">
                    <span className="bar-tag">POST:</span>
                    <div className="bar-rail">
                      <div className="bar-fill-post comp" style={{ width: `${postCompPct}%` }} />
                    </div>
                    <span className="bar-val">{postCompPct}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GRAPH 3: Scenario-by-Scenario Matrix (Inspect all 9 Dilemmas) */}
      <div className="svo-visual-card spooky-glass-card">
        <div className="visual-card-header">
          <div className="header-title-row">
            <Sliders size={18} className="text-amber-500" />
            <h3 className="visual-heading">GRAPH 3: DILEMMA DEEP DIVE (SCENARIOS 1–9)</h3>
          </div>
          <span className="dilemma-counter">
            SCENARIO {selectedScenarioIdx + 1} OF 9
          </span>
        </div>

        {/* 9 Scenario Quick Buttons */}
        <div className="scenario-selector-strip">
          {SVO_QUESTIONS.map((q, idx) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setSelectedScenarioIdx(idx)}
              className={`scenario-nav-btn ${idx === selectedScenarioIdx ? 'is-active' : ''}`}
            >
              Q{q.id}
            </button>
          ))}
        </div>

        {/* Selected Scenario Breakdown */}
        <div className="scenario-breakdown-box">
          <div className="scenario-info-top">
            <strong className="scenario-title">SCENARIO {currentScenario.id} BREAKDOWN:</strong>
            <span className="scenario-voter-tally">{scenTotal} RESPONSES</span>
          </div>

          <div className="scenario-options-chart">
            {(['A', 'B', 'C'] as ChoiceKey[]).map((letter) => {
              const opt = currentScenario.options[letter]
              const pct = letter === 'A' ? optAPct : letter === 'B' ? optBPct : optCPct
              const count = letter === 'A' ? optACount : letter === 'B' ? optBCount : optCCount
              const typeLabel =
                opt.type === 'prosocial'
                  ? 'COOPERATIVE (Prosocial)'
                  : opt.type === 'individualistic'
                  ? 'SELF-GAIN (Individualistic)'
                  : 'DOMINANCE (Competitive)'

              const colorClass =
                opt.type === 'prosocial'
                  ? 'color-pro'
                  : opt.type === 'individualistic'
                  ? 'color-ind'
                  : 'color-comp'

              return (
                <div key={letter} className="scenario-option-row">
                  <div className="scenario-opt-meta">
                    <div className="opt-left">
                      <span className="opt-letter">OPTION {letter}</span>
                      <span className={`opt-type-tag ${colorClass}`}>{typeLabel}</span>
                    </div>
                    <div className="opt-points">
                      You: <strong>{opt.you} pts</strong> | Stranger: <strong>{opt.other} pts</strong>
                    </div>
                    <div className="opt-stats">
                      <strong className="opt-pct">{pct}%</strong>
                      <span className="opt-votes">({count} votes)</span>
                    </div>
                  </div>
                  <div className="scenario-bar-track">
                    <div
                      className={`scenario-bar-fill ${colorClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* GRAPH 4: Live Subject Dossier ("WHO SELECTED WHAT") */}
      <div className="svo-visual-card spooky-glass-card">
        <div className="visual-card-header">
          <div className="header-title-row">
            <Users size={18} className="text-red-500" />
            <h3 className="visual-heading">LIVE SUBJECT DOSSIER (WHO SELECTED WHAT)</h3>
          </div>
          <span className="dossier-count-badge">
            {dossierList.length} PARTICIPANTS RECORDED
          </span>
        </div>

        {/* Dossier Search and Filters */}
        <div className="dossier-filters-row">
          <div className="dossier-search-box">
            <Search size={14} className="text-zinc-400" />
            <input
              type="text"
              placeholder="Search by participant name..."
              value={dossierSearch}
              onChange={(e) => setDossierSearch(e.target.value)}
              className="dossier-search-input"
            />
          </div>

          <div className="dossier-filter-buttons">
            <select
              value={dossierFilterPhase}
              onChange={(e) => setDossierFilterPhase(e.target.value as any)}
              className="dossier-select"
            >
              <option value="all">ALL PHASES</option>
              <option value="pre">PRE-LECTURE ONLY</option>
              <option value="post">POST-LECTURE ONLY</option>
            </select>

            <select
              value={dossierFilterType}
              onChange={(e) => setDossierFilterType(e.target.value)}
              className="dossier-select"
            >
              <option value="all">ALL ORIENTATIONS</option>
              <option value="prosocial">PROSOCIAL</option>
              <option value="individualistic">INDIVIDUALISTIC</option>
              <option value="competitive">COMPETITIVE</option>
            </select>
          </div>
        </div>

        {/* Dossier Roster */}
        {dossierList.length === 0 ? (
          <div className="stats-empty-state">
            <Search size={24} className="opacity-40" />
            <p>No matching participants found.</p>
          </div>
        ) : (
          <div className="dossier-list">
            {dossierList.map((resp, idx) => {
              const itemKey = `${resp.user_id}-${resp.phase}-${idx}`
              const isExpanded = expandedUserKey === itemKey
              const desc = ORIENTATION_DESCRIPTIONS[resp.orientation]

              return (
                <div key={itemKey} className="dossier-item">
                  <div
                    className="dossier-item-header"
                    onClick={() => setExpandedUserKey(isExpanded ? null : itemKey)}
                  >
                    <div className="dossier-subject-info">
                      <span className="subject-avatar">
                        {resp.display_name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <strong className="subject-name">{resp.display_name}</strong>
                        {resp.email && <small className="subject-email">{resp.email}</small>}
                      </div>
                    </div>

                    <div className="dossier-item-badges">
                      <span className={`phase-pill ${resp.phase === 'pre' ? 'pill-pre' : 'pill-post'}`}>
                        {resp.phase === 'pre' ? 'PRE 🕯️' : 'POST 🎭'}
                      </span>
                      <span
                        className="orientation-pill"
                        style={{
                          background: desc ? desc.color : '#71717a',
                          color: '#ffffff',
                        }}
                      >
                        {desc ? `${desc.emoji} ${desc.title}` : resp.orientation}
                      </span>
                      <span className="scores-tag">
                        {resp.prosocial_count} Coop • {resp.individualistic_count} Self • {resp.competitive_count} Comp
                      </span>
                      <button
                        type="button"
                        className="expand-toggle-btn"
                        aria-label="Expand choices"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded 9 Choices View */}
                  {isExpanded && resp.choices && (
                    <div className="dossier-choices-drawer">
                      <strong className="drawer-title">INDIVIDUAL SCENARIO DECISIONS:</strong>
                      <div className="choices-pill-grid">
                        {SVO_QUESTIONS.map((q) => {
                          const chosen = resp.choices[q.id]
                          const optData = chosen ? q.options[chosen] : null

                          return (
                            <div key={q.id} className="choice-chip-detailed">
                              <span className="q-num">Q{q.id}:</span>
                              <strong className="q-chosen">{chosen || '—'}</strong>
                              {optData && (
                                <span className={`q-type ${optData.type}`}>
                                  ({optData.type.substring(0, 4)})
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
