'use client'

import { ArrowDown, ArrowUpRight, CircleDot, Menu, Play, Volume2, VolumeX, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

interface ReelItem {
  number: string
  title: string
  tone: string
  videoSrc: string
  url: string
}

const reels: ReelItem[] = [
  {
    number: '01',
    title: 'Can we disagree better?',
    tone: 'bg-ink',
    videoSrc: '/reels/reel-1.mp4',
    url: 'https://www.instagram.com/reel/DdOXIpaskCr/',
  },
  {
    number: '02',
    title: 'The city is a classroom.',
    tone: 'bg-red',
    videoSrc: '/reels/reel-2.mp4',
    url: 'https://www.instagram.com/reel/DbGj8wQhBLQ/',
  },
  {
    number: '03',
    title: 'Hot takes, cold drinks.',
    tone: 'bg-yellow',
    videoSrc: '/reels/reel-3.mp4',
    url: 'https://www.instagram.com/reel/Dc05BMcsmk_/',
  },
]

const archive = [
  { number: 'M05', title: 'Hear Me Out: Movie or Experience?', date: '10th October', href: '/m5' },
  { number: 'M04', title: 'Does celebrity worship have gone too far?', date: '19th September', href: '/m4' },
  { number: 'M03', title: 'Are Teachers Necessary In The Age Of AI?', date: '5th September' },
  { number: 'M02', title: 'Social Media Made Us Perform Our lives Instead Of Live Them?', date: '22nd August' },
  { number: 'M01', title: 'Expensive Things Are Genuinely Better?', date: '8th August' },
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

function ReelVideoCard({
  reel,
  isAudioActive,
  onToggleAudio,
}: {
  reel: ReelItem
  isAudioActive: boolean
  onToggleAudio: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  // Scroll-triggered autoplay: plays when scrolled into view, pauses when scrolled out
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const playPromise = video.play()
            if (playPromise !== undefined) {
              playPromise.then(() => setIsPlaying(true)).catch(() => {})
            }
          } else {
            video.pause()
            setIsPlaying(false)
          }
        })
      },
      { threshold: 0.25 }
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  // Sync mute attribute with isAudioActive
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isAudioActive
      if (isAudioActive && videoRef.current.paused) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
      }
    }
  }, [isAudioActive])

  const handleSoundClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleAudio()
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100)
    }
  }

  return (
    <div
      className={`reel-video-card ${reel.tone}`}
      onClick={togglePlay}
      role="region"
      aria-label={reel.title}
    >
      <video
        ref={videoRef}
        src={reel.videoSrc}
        playsInline
        muted={!isAudioActive}
        loop
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        className="reel-native-video"
      />

      <div className="reel-gradient-overlay" aria-hidden="true" />

      {/* Top overlay with audio toggle only (reel badges removed) */}
      <div className="reel-overlay-top">
        <button
          type="button"
          onClick={handleSoundClick}
          className={`reel-sound-toggle ${isAudioActive ? 'is-active' : ''}`}
          aria-label={isAudioActive ? 'Mute video audio' : 'Turn on video audio'}
        >
          {isAudioActive ? (
            <>
              <Volume2 size={13} />
              <span>Audio On</span>
            </>
          ) : (
            <>
              <VolumeX size={13} />
              <span>Tap for Audio</span>
            </>
          )}
        </button>
      </div>

      {/* Pause indicator */}
      {!isPlaying && (
        <div className="reel-center-play-indicator" aria-hidden="true">
          <Play size={28} fill="currentColor" />
        </div>
      )}

      {/* Bottom overlay with title and progress bar (Instagram redirect removed) */}
      <div className="reel-overlay-bottom">
        <div className="reel-progress-track">
          <div className="reel-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="reel-bottom-content">
          <strong className="reel-video-title">{reel.title}</strong>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeAudioReel, setActiveAudioReel] = useState<string | null>(null)

  // Catch OAuth callback redirect if Supabase falls back to root with ?code= or #access_token
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const returnTo = localStorage.getItem('hmo_auth_return_to') || '/m6'
    
    if (code) {
      localStorage.removeItem('hmo_auth_return_to')
      window.location.replace(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(returnTo)}`)
      return
    }

    if (window.location.hash && window.location.hash.includes('access_token')) {
      localStorage.removeItem('hmo_auth_return_to')
      window.location.replace(`${returnTo}${window.location.hash}`)
    }
  }, [])

  return (
    <main id="top" className="site-shell">
      <div className="grain" aria-hidden="true" />
      <header className="site-header">
        <BrandMark />
        <nav className={menuOpen ? 'nav-links is-open' : 'nav-links'} aria-label="Main navigation">
          <a href="#m06" onClick={() => setMenuOpen(false)}>M06</a>
          <Link href="/m6" onClick={() => setMenuOpen(false)}>Live Vote</Link>
          <a href="#why" onClick={() => setMenuOpen(false)}>Why we meet</a>
          <a href="#archive" onClick={() => setMenuOpen(false)}>Archive</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>
        <div className="header-actions">
          <a href="https://forms.gle/KGG9pDwU8Vh5Xwmw6" target="_blank" rel="noopener noreferrer" className="button button-small button-black">Register <ArrowUpRight size={15} /></a>
          <button className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <section className="hero section-pad">
        <div className="hero-copy">
          <p className="eyebrow"><CircleDot size={12} fill="currentColor" /> An Ahmedabad community for curious people • 🎭 HALLOWEEN SPECIAL</p>
          <h1>Say it<br /><span>out</span><i>.</i></h1>
          <p className="hero-intro">A room for ideas, opinions, and the conversations we usually keep in our heads. This Halloween, we dive into the darker corners of human psychology.🕯️</p>
          <a href="#m06" className="button button-red">See what&apos;s next <ArrowDown size={18} /></a>
        </div>
        <div className="hero-poster" aria-label="A typographic poster for the Hear Me Out community">
          <div className="poster-sticker">WE<br />ARE<br />EVIL</div>
          <div className="poster-word">HEAR<br /><span>ME</span><br />OUT</div>
          <div className="poster-doodle">🎭</div>
          <p className="poster-caption">come with a point.<br />leave questioning yourself.</p>
        </div>
        <div className="hero-note">Vol. 06 <span>•</span> Halloween Special <span>•</span> Ahmedabad, India</div>
      </section>

      <section className="marquee" aria-label="Community statement">
        <div className="marquee-track">HEAR ME OUT PRESENTS WE ARE ALL EVIL <span>🕯️</span> DISCUSS • DEBATE • DISAGREE <span>🎭</span> ONE EXPERT • ONE BATTLE OF MORALS • ONE GAME OF DECEPTION <span>🥀</span> HALLOWEEN SPECIAL <span>✳</span></div>
      </section>

      <section id="m06" className="event-section section-pad">
        <div className="section-label"><span>01</span><span>The Next Motion • M06</span></div>
        <div className="event-grid">
          <div>
            <p className="eyebrow red-text">M06 / 🎭 HALLOWEEN SPECIAL / REGISTRATIONS OPEN</p>
            <h2>Hear Me Out:<br /><em>We Are All</em><br />Evil.</h2>

            <div style={{ margin: '1.5rem 0 1rem', maxWidth: '440px' }}>
              <p style={{ fontSize: '1rem', lineHeight: 1.4, fontWeight: 800, margin: '0 0 0.5rem' }}>
                Why does safe fear excite us? What does our true crime fascination reveal about who we really are?
              </p>
              <p style={{ fontSize: '0.84rem', lineHeight: 1.45, opacity: 0.85, margin: 0 }}>
                How good are you when nobody is watching? One expert. One battle of morals. One game of deception.🥀
              </p>
            </div>

            {/* The 3 Acts */}
            <div className="acts-grid-wrapper">
              <div className="act-card-item">
                <div className="act-card-top">
                  <span className="act-number-tag">01 / THE UNMASKING 🕯️</span>
                  <span className="act-badge-pill">🧠 The Lecture</span>
                </div>
                <strong className="act-speaker-badge">Dr. Harshil Vyas (IIT Research Consultant)</strong>
                <p className="act-desc-text">
                  Why fear excites us, why true crime draws us in, and what disturbing curiosity reveals about our character.
                </p>
                <Link href="/m6?tab=svo" className="act-action-link">
                  Take Dr. Harshil&apos;s SVO Study (Pre &amp; Post) →
                </Link>
              </div>

              <div className="act-card-item">
                <div className="act-card-top">
                  <span className="act-number-tag">02 / MORAL TRIBUNAL ⚖️</span>
                  <span className="act-badge-pill">⚔️ The Debate</span>
                </div>
                <p className="act-desc-text">
                  Does curiosity reveal character? Are we good by morals, or only because society punishes us when we&apos;re not?
                </p>
                <Link href="/m6" className="act-action-link">
                  Open Live Motion 06 Ballot →
                </Link>
              </div>

              <div className="act-card-item">
                <div className="act-card-top">
                  <span className="act-number-tag">03 / THE IMPOSTER 🎭</span>
                  <span className="act-badge-pill">🕵️ The Mafia Game</span>
                </div>
                <p className="act-desc-text">
                  A psychological game of deception where trust costs everything. Hidden identities and questionable intentions.
                </p>
                <span className="act-live-note">
                  📍 Played live in-person at Monkey Cafe
                </span>
              </div>
            </div>
          </div>

          <div className="event-details">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.35rem, 2.3vw, 2.1rem)', lineHeight: 0.95, textTransform: 'uppercase', margin: '0 0 1.2rem', letterSpacing: '-0.03em' }}>
              Think you know yourself? Let&apos;s put that to the test.
            </h3>
            <p style={{ fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '1.8rem', color: 'var(--red)' }}>
              LIMITED SEATS. UNCOMFORTABLE QUESTIONS. COME CURIOUS. LEAVE QUESTIONING YOURSELF.
            </p>
            <div className="detail-list">
              <div><span>WHEN</span><strong>31 October, 2026 (Halloween)</strong></div>
              <div><span>TIME</span><strong>5:00 PM – 7:00 PM</strong></div>
              <div>
                <span>WHERE</span>
                <strong>
                  <a href="https://maps.app.goo.gl/FfU7cUoVTsCa2y3f7" target="_blank" rel="noopener noreferrer" className="location-link">
                    Monkey Cafe, Drive-in Road, Ahmedabad <ArrowUpRight size={13} />
                  </a>
                </strong>
              </div>
              <div><span>TICKET</span><strong>₹349/- (Includes Lecture, Debate, Game, Cafe F&amp;B, &amp; Goodies)</strong></div>
              <div><span>FORMAT</span><strong>Expert Lecture + Moral Tribunal + Mafia Game + Live Ballot</strong></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a href="https://forms.gle/KGG9pDwU8Vh5Xwmw6" target="_blank" rel="noopener noreferrer" className="button button-red" style={{ width: '100%' }}>
                REGISTER NOW <ArrowUpRight size={17} />
              </a>
              <Link href="/m6" className="button button-black" style={{ width: '100%' }}>
                ENTER LIVE AUDIENCE BALLOT <ArrowUpRight size={17} />
              </Link>
              <Link href="/m6?tab=svo" className="button button-outline-black" style={{ width: '100%', borderColor: 'var(--red)', color: 'var(--red)' }}>
                🧠 TAKE DR. HARSHIL&apos;S EXPERIMENT (PRE &amp; POST) <ArrowUpRight size={17} />
              </Link>
            </div>
            <p className="microcopy">Registrations are open now. Limited seats for honest minds.</p>
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
          <span>03</span>
          <span>From the room</span>
          <a href="https://www.instagram.com/hearmeout.amd" target="_blank" rel="noopener noreferrer">
            See Instagram <ArrowUpRight size={14} />
          </a>
        </div>

        <div className="reels-grid">
          {reels.map((reel) => (
            <ReelVideoCard
              key={reel.number}
              reel={reel}
              isAudioActive={activeAudioReel === reel.number}
              onToggleAudio={() =>
                setActiveAudioReel((prev) => (prev === reel.number ? null : reel.number))
              }
            />
          ))}
        </div>
      </section>

      <section id="archive" className="archive-section section-pad">
        <div className="section-label"><span>04</span><span>The archive</span></div>
        <div className="archive-heading"><h2>Previously<br /><em>out loud.</em></h2><p>Every motion leaves a mark.<br />Here are a few we&apos;re still thinking about.</p></div>
        <div className="archive-list">
          {archive.map((item) => (
            <div className="archive-row" key={item.number}>
              <span>{item.number}</span>
              <strong>
                {item.href ? (
                  <Link href={item.href} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    {item.title}
                    <ArrowUpRight size={13} style={{ opacity: 0.7 }} />
                  </Link>
                ) : (
                  item.title
                )}
              </strong>
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
