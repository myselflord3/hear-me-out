'use client'

import React from 'react'
import { VoteRecord } from '@/lib/voting/utils'
import { Activity } from 'lucide-react'

interface VoterActivityProps {
  recentVotes: VoteRecord[]
  choiceLabels?: Record<string, string>
  heading?: string
}

export function VoterActivity({
  recentVotes,
  choiceLabels = {},
  heading = 'PEOPLE CURRENTLY VOTING',
}: VoterActivityProps) {
  if (!recentVotes || recentVotes.length === 0) {
    return null
  }

  // Show up to 50 authentic votes
  const displayList = recentVotes.slice(0, 50)

  return (
    <div className="voter-activity-card">
      <div className="activity-header">
        <div className="activity-title-group">
          <Activity size={13} className="activity-icon" />
          <span className="activity-heading">{heading}</span>
        </div>
      </div>

      <div className="activity-stream">
        {displayList.map((vote) => {
          const displayChoice = choiceLabels[vote.choice] || vote.choice
          const isPrimary = vote.choice === 'YES' || vote.choice === 'OPTION_1' || vote.choice === 'MOVIE'

          return (
            <div key={vote.id || `${vote.display_name}-${vote.updated_at}`} className="activity-chip">
              <span className="voter-name">{vote.display_name}</span>
              <span className="voter-divider">—</span>
              <span className={`voter-choice ${isPrimary ? 'choice-chip-yes' : 'choice-chip-no'}`}>
                {displayChoice}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
