'use client'

import { ArrowLeft, ArrowUpRight, Check, CircleDot, LockKeyhole, Radio } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const choices = [
  { id: 'for', label: 'FOR', description: 'I am with the motion.' },
  { id: 'against', label: 'AGAINST', description: 'I am not convinced.' },
  { id: 'pass', label: 'PASS', description: 'I need to hear more.' },
] as const

export default function M04Page() {
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  return (
    <main className="vote-shell">
      <header className="vote-header">
        <Link href="/" className="back-link"><ArrowLeft size={16} /> Back to HEAR. ME. OUT.</Link>
        <span className="vote-brand">HMO / M04</span>
      </header>
      <div className="vote-layout">
        <section className="vote-intro">
          <p className="eyebrow"><Radio size={13} /> Audience vote</p>
          <h1>The motion<br /><span>is yours.</span></h1>
          <p className="vote-lede">M04 is live on 19 September at Monkey Cafe. Registrations are open right now.</p>
          <div className="vote-status"><CircleDot size={13} fill="currentColor" /> Voting opens when the live discussion begins.</div>
          <div style={{ marginTop: '2rem' }}>
            <a href="https://forms.gle/MAJu4Vu56B6CVaer6" target="_blank" rel="noopener noreferrer" className="button button-black">
              Register for M04 <ArrowUpRight size={16} />
            </a>
          </div>
        </section>
        <section className="vote-panel" aria-label="M04 voting panel">
          <div className="motion-card">
            <span className="motion-code">M04 • 19 SEP</span>
            <h2>Monkey Cafe</h2>
            <p>The motion will appear here during the live debate. Make sure you have secured your seat.</p>
          </div>
          <div className="choice-list" aria-disabled="true">
            {choices.map((choice) => <button key={choice.id} disabled onClick={() => setSelected(choice.id)} className={selected === choice.id ? 'choice selected' : 'choice'}><span className="choice-letter">{choice.label[0]}</span><span><strong>{choice.label}</strong><small>{choice.description}</small></span>{selected === choice.id && <Check size={19} />}</button>)}
          </div>
          <button className="submit-vote" disabled={!selected || submitted} onClick={() => setSubmitted(true)}>{submitted ? 'Vote recorded' : 'Cast your vote'} <LockKeyhole size={16} /></button>
          <p className="vote-footnote">Voting is one-time, anonymous to the room, and tied to your account so every voice gets one seat.</p>
        </section>
      </div>
    </main>
  )
}
