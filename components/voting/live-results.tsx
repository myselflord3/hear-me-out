'use client'

import React from 'react'
import { VoteTally } from '@/lib/voting/utils'
import { BarChart3, Users2 } from 'lucide-react'

interface LiveResultsProps {
  tally: VoteTally
  userVote?: string | null
  votingStatus?: 'upcoming' | 'open' | 'closed'
  option1Key?: string
  option2Key?: string
  option1Title?: string
  option2Title?: string
  motionLabel?: string
}

export function LiveResults({
  tally,
  userVote,
  votingStatus = 'open',
  option1Key = 'YES',
  option2Key = 'NO',
  option1Title = 'YES',
  option2Title = 'NO',
  motionLabel = 'the motion',
}: LiveResultsProps) {
  const { total } = tally
  const opt1Count = tally.option1Count ?? tally.yes
  const opt2Count = tally.option2Count ?? tally.no
  const opt1Percent = tally.option1Percent ?? tally.yesPercent
  const opt2Percent = tally.option2Percent ?? tally.noPercent

  if (total === 0) {
    return (
      <div className="live-results-card empty-state">
        <div className="results-header">
          <span className="results-eyebrow">
            <BarChart3 size={13} />
            CURRENT VOTE
          </span>
          <span className="live-tag">LIVE STREAM</span>
        </div>
        <div className="empty-results-box">
          <Users2 size={24} className="empty-results-icon" />
          <p className="empty-results-title">NO VOTES RECORDED YET</p>
          <p className="empty-results-subtitle">
            Be the first in the room to cast your vote on {motionLabel}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="live-results-card">
      <div className="results-header">
        <span className="results-eyebrow">
          <BarChart3 size={13} />
          {votingStatus === 'closed' ? 'FINAL ROOM RESULTS' : 'CURRENT VOTE'}
        </span>
        <span className="live-tag">
          <span className="live-dot-mini" /> {votingStatus === 'closed' ? 'CONCLUDED' : 'REALTIME'}
        </span>
      </div>

      <div className="results-bars">
        {/* Option 1 Row */}
        <div className={`result-row ${userVote === option1Key ? 'user-selected' : ''}`}>
          <div className="result-row-labels">
            <span className="choice-title">
              {option1Title} {userVote === option1Key && <span className="your-vote-tag">(YOUR VOTE)</span>}
            </span>
            <span className="choice-percent">{opt1Percent}%</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuenow={opt1Percent} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="progress-fill fill-yes"
              style={{ width: `${opt1Percent}%` }}
            />
          </div>
          <div className="result-sub-count">
            {opt1Count} {opt1Count === 1 ? 'vote' : 'votes'}
          </div>
        </div>

        {/* Option 2 Row */}
        <div className={`result-row ${userVote === option2Key ? 'user-selected' : ''}`}>
          <div className="result-row-labels">
            <span className="choice-title">
              {option2Title} {userVote === option2Key && <span className="your-vote-tag">(YOUR VOTE)</span>}
            </span>
            <span className="choice-percent">{opt2Percent}%</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuenow={opt2Percent} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="progress-fill fill-no"
              style={{ width: `${opt2Percent}%` }}
            />
          </div>
          <div className="result-sub-count">
            {opt2Count} {opt2Count === 1 ? 'vote' : 'votes'}
          </div>
        </div>
      </div>

      <div className="results-footer">
        <span className="total-voters-tally">
          <strong>{total}</strong> {total === 1 ? 'PERSON HAS VOTED' : 'PEOPLE HAVE VOTED'}
        </span>
        {votingStatus === 'closed' && (
          <span className="final-tally-badge">FINAL RESULTS</span>
        )}
      </div>
    </div>
  )
}
