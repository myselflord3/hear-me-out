'use client'

import React from 'react'
import { VoteTally } from '@/lib/voting/utils'
import { BarChart3, Users2 } from 'lucide-react'

interface LiveResultsProps {
  tally: VoteTally
  userVote?: 'YES' | 'NO' | null
  votingStatus?: 'upcoming' | 'open' | 'closed'
}

export function LiveResults({ tally, userVote, votingStatus = 'open' }: LiveResultsProps) {
  const { yes, no, total, yesPercent, noPercent } = tally

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
            Be the first in the room to cast your vote on Motion 04.
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
          CURRENT VOTE
        </span>
        <span className="live-tag">
          <span className="live-dot-mini" /> REALTIME
        </span>
      </div>

      <div className="results-bars">
        {/* YES Row */}
        <div className={`result-row ${userVote === 'YES' ? 'user-selected' : ''}`}>
          <div className="result-row-labels">
            <span className="choice-title">
              YES {userVote === 'YES' && <span className="your-vote-tag">(YOUR VOTE)</span>}
            </span>
            <span className="choice-percent">{yesPercent}%</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuenow={yesPercent} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="progress-fill fill-yes"
              style={{ width: `${yesPercent}%` }}
            />
          </div>
          <div className="result-sub-count">
            {yes} {yes === 1 ? 'vote' : 'votes'}
          </div>
        </div>

        {/* NO Row */}
        <div className={`result-row ${userVote === 'NO' ? 'user-selected' : ''}`}>
          <div className="result-row-labels">
            <span className="choice-title">
              NO {userVote === 'NO' && <span className="your-vote-tag">(YOUR VOTE)</span>}
            </span>
            <span className="choice-percent">{noPercent}%</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuenow={noPercent} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="progress-fill fill-no"
              style={{ width: `${noPercent}%` }}
            />
          </div>
          <div className="result-sub-count">
            {no} {no === 1 ? 'vote' : 'votes'}
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
