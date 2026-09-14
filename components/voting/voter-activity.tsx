'use client'

import React from 'react'
import { VoteRecord } from '@/lib/voting/utils'
import { Activity, ShieldCheck } from 'lucide-react'

interface VoterActivityProps {
  recentVotes: VoteRecord[]
}

export function VoterActivity({ recentVotes }: VoterActivityProps) {
  if (!recentVotes || recentVotes.length === 0) {
    return null
  }

  // Show the latest 6-8 votes
  const displayList = recentVotes.slice(0, 8)

  return (
    <div className="voter-activity-card">
      <div className="activity-header">
        <div className="activity-title-group">
          <Activity size={13} className="activity-icon" />
          <span className="activity-heading">PEOPLE CURRENTLY VOTING</span>
        </div>
        <div className="activity-privacy-note">
          <ShieldCheck size={12} />
          <span>Names anonymized</span>
        </div>
      </div>

      <div className="activity-stream">
        {displayList.map((vote) => (
          <div key={vote.id || `${vote.display_name}-${vote.updated_at}`} className="activity-chip">
            <span className="voter-name">{vote.display_name}</span>
            <span className="voter-divider">—</span>
            <span className={`voter-choice ${vote.choice === 'YES' ? 'choice-chip-yes' : 'choice-chip-no'}`}>
              {vote.choice}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
