'use client'

import React from 'react'
import { Radio } from 'lucide-react'

interface PresenceBadgeProps {
  viewerCount: number
  isConnected?: boolean
}

export function PresenceBadge({ viewerCount, isConnected = true }: PresenceBadgeProps) {
  return (
    <div className="live-presence-container">
      <div className="live-badge">
        <span className="live-pulse-dot" aria-hidden="true" />
        <span className="live-badge-label">
          <Radio size={12} className="inline mr-1" />
          LIVE NOW
        </span>
      </div>
      <div className="live-presence-count">
        <span className="live-count-number">{viewerCount}</span>
        <span className="live-count-text">
          {viewerCount === 1 ? 'PERSON IS HERE' : 'PEOPLE ARE HERE'}
        </span>
      </div>
    </div>
  )
}
