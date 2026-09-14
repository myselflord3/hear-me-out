'use client'

import React from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'

interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected'
  onRetry?: () => void
}

export function ConnectionStatus({ status, onRetry }: ConnectionStatusProps) {
  if (status === 'connected') return null

  return (
    <div className="connection-status-pill" role="status">
      {status === 'connecting' ? (
        <>
          <RefreshCw size={13} className="animate-spin" />
          <span>Reconnecting to live feed...</span>
        </>
      ) : (
        <>
          <WifiOff size={13} />
          <span>Disconnected from live updates.</span>
          {onRetry && (
            <button onClick={onRetry} className="status-retry-btn">
              Retry
            </button>
          )}
        </>
      )}
    </div>
  )
}
