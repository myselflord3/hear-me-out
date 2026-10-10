'use client'

import { ArrowDown, ArrowUpRight, CircleDot, Menu, Pause, Play, Volume2, VolumeX, X } from 'lucide-react'
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
  { number: 'M05', title: 'Hear Me Out: Movie or Experience?', date: '10th October' },
  { number: 'M04', title: 'Does celebrity worship have gone too far?', date: '19th September' },
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

  return (
    <main id="top" className="site-shell">
      <div className="grain" aria-hidden="true" />
      <header className="site-header">
        <BrandMark />
        <nav className={menuOpen ? 'nav-links is-open' : 'nav-links'} aria-label="Main navigation">
          <a href="#m05" onClick={() => setMenuOpen(false)}>M05</a>
          <a href="#why" onClick={() => setMenuOpen(false)}>Why we meet</a>
          <a href="#archive" onClick={() => setMenuOpen(false)}>Archive</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>
        <div className="header-actions">
          <a href="https://forms.gle/3D4WoZGUKayn6exZ6" target="_blank" rel="noopener noreferrer" className="button button-small button-black">Register <ArrowUpRight size={15} /></a>
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
          <a href="#m05" className="button button-red">See what&apos;s next <ArrowDown size={18} /></a>
        </div>
        <div className="hero-poster" aria-label="A typographic poster for the Hear Me Out community">
          <div className="poster-sticker">NO<br />SMALL<br />TALK</div>
          <div className="poster-word">HEAR<br /><span>ME</span><br />OUT</div>
          <div className="poster-doodle">✳</div>
          <p className="poster-caption">come with a point.<br />leave with a question.</p>
        </div>
        <div className="hero-note">Vol. 05 <span>•</span> Ahmedabad, India</div>
      </section>

      <section className="marquee" aria-label="Community statement">
        <div className="marquee-track">NO HOT TAKES WITHOUT A LITTLE HEART <span>✳</span> NO HOT TAKES WITHOUT A LITTLE HEART <span>✳</span></div>
      </section>

      <section id="m05" className="event-section section-pad">
        <div className="section-label"><span>01</span><span>The Next Motion</span></div>
        <div className="event-grid">
          <div>
            <p className="eyebrow red-text">M05 / REGISTRATIONS OPEN</p>
            <h2>Hear Me Out:<br /><em>Movie or</em><br />Experience?</h2>
          </div>
          <div className="event-details">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.35rem, 2.3vw, 2.1rem)', lineHeight: 0.95, textTransform: 'uppercase', margin: '0 0 1.2rem', letterSpacing: '-0.03em' }}>
              What matters more, a great movie or a great experience?
            </h3>
            <p style={{ fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '1.8rem', color: 'var(--red)' }}>
              Come with an opinion. Pick a side. Hear them out.
            </p>
            <div className="detail-list">
              <div><span>WHEN</span><strong>10 October, 2026</strong></div>
              <div><span>TIME</span><strong>5–7 PM</strong></div>
              <div>
                <span>WHERE</span>
                <strong>
                  <a href="https://maps.app.goo.gl/FfU7cUoVTsCa2y3f7" target="_blank" rel="noopener noreferrer" className="location-link">
                    Monkey Cafe, Drive-in Cinema <ArrowUpRight size={13} />
                  </a>
                </strong>
              </div>
              <div><span>TICKET</span><strong>₹99/-</strong></div>
              <div><span>FORMAT</span><strong>Live debate + audience vote</strong></div>
            </div>
            <a href="https://forms.gle/3D4WoZGUKayn6exZ6" target="_blank" rel="noopener noreferrer" className="button button-black">I&apos;M COMING <ArrowUpRight size={17} /></a>
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
