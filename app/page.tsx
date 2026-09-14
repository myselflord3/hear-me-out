'use client'

import { ArrowDown, ArrowUpRight, CircleDot, Menu, Play, Volume2, X } from 'lucide-react'
import { useState } from 'react'

const reels = [
  {
    number: '01',
    title: 'Can we disagree better?',
    tone: 'bg-ink',
    id: 'DdOXIpaskCr',
    url: 'https://www.instagram.com/reel/DdOXIpaskCr/',
  },
  {
    number: '02',
    title: 'The city is a classroom.',
    tone: 'bg-red',
    id: 'DbGj8wQhBLQ',
    url: 'https://www.instagram.com/reel/DbGj8wQhBLQ/',
  },
  {
    number: '03',
    title: 'Hot takes, cold drinks.',
    tone: 'bg-yellow',
    id: 'Dc05BMcsmk_',
    url: 'https://www.instagram.com/reel/Dc05BMcsmk_/',
  },
]

const archive = [
  { number: 'M01', title: 'Expensive Things Are Genuinely Better?', date: '8th August' },
  { number: 'M02', title: 'Social Media Made Us Perform Our lives Instead Of Live Them?', date: '22nd August' },
  { number: 'M03', title: 'Are Teachers Necessary In The Age Of AI?', date: '5th September' },
]

function BrandMark() {
  return (
    <a href="#top" className="brand-mark" aria-label="HEAR. ME. OUT. home">
      <span>HEAR.</span>
      <span>ME.</span>
      <span>OUT.</span>
    </a>
  )
}

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [playingReel, setPlayingReel] = useState<string | null>(null)
  const [showAllPlayers, setShowAllPlayers] = useState(false)

  return (
    <main id="top" className="site-shell">
      <div className="grain" aria-hidden="true" />
      <header className="site-header">
        <BrandMark />
        <nav className={menuOpen ? 'nav-links is-open' : 'nav-links'} aria-label="Main navigation">
          <a href="#m04" onClick={() => setMenuOpen(false)}>M04</a>
          <a href="#why" onClick={() => setMenuOpen(false)}>Why we meet</a>
          <a href="#archive" onClick={() => setMenuOpen(false)}>Archive</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>
        <div className="header-actions">
          <a href="https://forms.gle/MAJu4Vu56B6CVaer6" target="_blank" rel="noopener noreferrer" className="button button-small button-black">Register <ArrowUpRight size={15} /></a>
          <button className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <section className="hero section-pad">
        <div className="hero-copy">
          <p className="eyebrow"><CircleDot size={12} fill="currentColor" /> An Ahmedabad community for curious people</p>
          <h1>Say it<br /><span>out</span><i>.</i></h1>
          <p className="hero-intro">A room for ideas, opinions, and the conversations we usually keep in our heads.</p>
          <a href="#m04" className="button button-red">See what&apos;s next <ArrowDown size={18} /></a>
        </div>
        <div className="hero-poster" aria-label="A typographic poster for the Hear Me Out community">
          <div className="poster-sticker">NO<br />SMALL<br />TALK</div>
          <div className="poster-word">HEAR<br /><span>ME</span><br />OUT</div>
          <div className="poster-doodle">✳</div>
          <p className="poster-caption">come with a point.<br />leave with a question.</p>
        </div>
        <div className="hero-note">Vol. 04 <span>•</span> Ahmedabad, India</div>
      </section>

      <section className="marquee" aria-label="Community statement">
        <div className="marquee-track">NO HOT TAKES WITHOUT A LITTLE HEART <span>✳</span> NO HOT TAKES WITHOUT A LITTLE HEART <span>✳</span></div>
      </section>

      <section id="m04" className="event-section section-pad">
        <div className="section-label"><span>01</span><span>Next up</span></div>
        <div className="event-grid">
          <div>
            <p className="eyebrow red-text">M04 / REGISTRATIONS OPEN</p>
            <h2>Bring your<br /><em>biggest</em><br />opinion.</h2>
          </div>
          <div className="event-details">
            <p className="event-description">The next HEAR. ME. OUT. is taking shape. One motion, two sides, one room where changing your mind is allowed.</p>
            <div className="detail-list">
              <div><span>WHEN</span><strong>19 September</strong></div>
              <div>
                <span>WHERE</span>
                <strong>
                  <a href="https://maps.app.goo.gl/FfU7cUoVTsCa2y3f7" target="_blank" rel="noopener noreferrer" className="location-link">
                    Monkey Cafe <ArrowUpRight size={13} />
                  </a>
                </strong>
              </div>
              <div><span>FORMAT</span><strong>Live discussion + audience vote</strong></div>
            </div>
            <a href="https://forms.gle/MAJu4Vu56B6CVaer6" target="_blank" rel="noopener noreferrer" className="button button-black">Register for M04 <ArrowUpRight size={17} /></a>
            <p className="microcopy">Registrations are now open. Reserve your seat today.</p>
          </div>
        </div>
      </section>

      <section id="why" className="why-section section-pad">
        <div className="section-label light-label"><span>02</span><span>Why we meet</span></div>
        <div className="why-grid">
          <h2>Because<br /><span>thinking</span><br />is better<br />out loud.</h2>
          <div className="why-copy">
            <p>HEAR. ME. OUT. is a recurring live conversation series for people who are not afraid of a strong opinion — or a better one.</p>
            <p>No panels. No experts on a stage. Just a prompt, a room, and the permission to be unfinished.</p>
            <div className="manifesto"><span>01</span><strong>Arrive curious.</strong><span>02</span><strong>Say the thing.</strong><span>03</span><strong>Listen for the plot twist.</strong></div>
          </div>
        </div>
      </section>

      <section className="reels-section section-pad">
        <div className="section-label">
          <div className="section-label-title">
            <span>03</span>
            <span>From the room</span>
          </div>
          <div className="reels-header-actions">
            <button
              type="button"
              onClick={() => {
                setShowAllPlayers((prev) => !prev)
                setPlayingReel(null)
              }}
              className="reels-mode-toggle"
              aria-label={showAllPlayers ? 'Switch to poster view' : 'Run all reels in room'}
            >
              <Play size={12} fill="currentColor" />
              <span>{showAllPlayers ? 'Show Posters' : 'Run All Reels'}</span>
            </button>
            <a href="https://www.instagram.com/hearmeout.amd" target="_blank" rel="noopener noreferrer">
              See Instagram <ArrowUpRight size={14} />
            </a>
          </div>
        </div>

        <div className="reels-grid">
          {reels.map((reel) => {
            const isPlaying = showAllPlayers || playingReel === reel.number

            if (isPlaying) {
              return (
                <div className={`reel-card reel-card-playing ${reel.tone}`} key={reel.number}>
                  <div className="reel-playing-header">
                    <span className="reel-number">REEL {reel.number}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (showAllPlayers) {
                          setShowAllPlayers(false)
                        }
                        setPlayingReel(null)
                      }}
                      className="reel-close-button"
                      aria-label="Close reel video"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="reel-video-container">
                    <iframe
                      src={`https://www.instagram.com/reel/${reel.id}/embed/`}
                      className="reel-iframe"
                      scrolling="no"
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      allowFullScreen
                      title={`Instagram Reel ${reel.number} - ${reel.title}`}
                    />
                  </div>

                  <div className="reel-playing-footer">
                    <span className="reel-audio-pill">
                      <Volume2 size={13} /> Tap video to play/unmute
                    </span>
                    <a
                      href={reel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="reel-insta-badge"
                    >
                      Instagram <ArrowUpRight size={12} />
                    </a>
                  </div>
                </div>
              )
            }

            return (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setPlayingReel(reel.number)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setPlayingReel(reel.number)
                  }
                }}
                className={`reel-card ${reel.tone}`}
                key={reel.number}
                aria-label={`Play Reel ${reel.number}: ${reel.title}`}
              >
                <div className="reel-top-row">
                  <span className="reel-number">REEL {reel.number}</span>
                  <span className="reel-badge-pill">
                    <Volume2 size={11} /> Audio on
                  </span>
                </div>

                <div className="play-button-wrapper">
                  <span className="play-button">
                    <Play size={20} fill="currentColor" />
                  </span>
                  <span className="play-callout">Play with audio</span>
                </div>

                <div className="reel-bottom-row">
                  <strong>{reel.title}</strong>
                  <span className="reel-arrow">
                    <Play size={14} fill="currentColor" />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section id="archive" className="archive-section section-pad">
        <div className="section-label"><span>04</span><span>The archive</span></div>
        <div className="archive-heading"><h2>Previously<br /><em>out loud.</em></h2><p>Every motion leaves a mark.<br />Here are a few we&apos;re still thinking about.</p></div>
        <div className="archive-list">
          {archive.map((item) => (
            <div className="archive-row" key={item.number}>
              <span>{item.number}</span>
              <strong>{item.title}</strong>
              <small>{item.date}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="photo-section section-pad" aria-label="Community photo collage">
        <div className="photo-card photo-card-one"><span>LOUD<br />THOUGHTS</span></div>
        <div className="photo-card photo-card-two"><span>GOOD<br />QUESTIONS</span></div>
        <div className="photo-note">A little less scrolling.<br />A little more showing up.</div>
      </section>

      <footer id="contact" className="site-footer section-pad">
        <div className="footer-top"><BrandMark /><p>Make room<br />for the thought.</p></div>
        <div className="footer-bottom">
          <a href="mailto:tanmay.d.kashyap@gmail.com">tanmay.d.kashyap@gmail.com</a>
          <a href="https://www.instagram.com/hearmeout.amd" target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight size={13} /></a>
          <span>© {new Date().getFullYear()} HEAR. ME. OUT.</span>
        </div>
      </footer>
    </main>
  )
}
