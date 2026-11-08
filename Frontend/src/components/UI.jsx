import { useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '../hooks/useChat'
import { canSpeak, isMuted, setMuted, spokenChar, unlockSpeech } from '../lib/speech'
import { ACTIONS, GREETING, TOPICS, lockedLine } from '../lib/local'
import { LOOKS } from '../lib/looks'
import * as Ic from './Icons'
import { track } from '../lib/track'

const LINKS = [
  { href: 'https://github.com/UchihaIthachi', label: 'GitHub', Icon: Ic.Github },
  { href: 'https://www.linkedin.com/in/harshana-lakshara/', label: 'LinkedIn', Icon: Ic.Linkedin },
  { href: 'https://harshanalf.netlify.app/portfolio', label: 'Portfolio', Icon: Ic.Globe },
]
const VIEWS = [
  { id: 'face', label: 'Face' },
  { id: 'half', label: 'Half' },
  { id: 'full', label: 'Full' },
]

// the portfolio page itself (CV, projects, contact), not the 3D island home
const PORTFOLIO = 'https://harshanalf.netlify.app/portfolio'
const glass = 'glass text-white'
const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

/** Screen class for the layout: phone, short (landscape phone), and whether the actions rail fits. */
function useLayout() {
  const get = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    return { w, h, phone: w < 640, short: h < 560, railFits: w >= 1180 && h >= 680 }
  }
  const [l, setL] = useState(get)
  useEffect(() => {
    const on = () => setL(get())
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
    }
  }, [])
  return l
}

/** Caption that lights up word by word as the avatar speaks. */
function Caption({ text, live, small }) {
  const [at, setAt] = useState(live ? 0 : Infinity)
  useEffect(() => {
    if (!live) {
      setAt(Infinity)
      return undefined
    }
    const id = setInterval(() => setAt(spokenChar()), 70)
    return () => clearInterval(id)
  }, [live, text])
  const words = useMemo(() => {
    const out = []
    const re = /\S+\s*/g
    let m
    while ((m = re.exec(text))) out.push({ w: m[0], start: m.index, end: m.index + m[0].length })
    return out
  }, [text])
  const done = at === -1 || at === Infinity
  return (
    <p className={small ? 'text-[14px] leading-snug' : 'text-[15px] leading-relaxed sm:text-base'}>
      {words.map((x, i) => {
        const now = !done && at >= x.start && at < x.end
        const past = done || at >= x.end
        return (
          <span key={i} className={`transition-colors duration-150 ${now ? 'rounded bg-emerald-400/20 text-white' : past ? 'text-white' : 'text-white/35'}`}>
            {x.w}
          </span>
        )
      })}
    </p>
  )
}

/** Small animated bars while speaking / thinking. */
function Bars({ on, color = 'bg-emerald-300' }) {
  return (
    <span className='inline-flex h-4 items-end gap-[3px]' aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full ${color}`}
          style={{ height: on ? undefined : 4, animation: on ? `vm-bar ${0.5 + i * 0.12}s ease-in-out ${i * 0.08}s infinite alternate` : 'none' }}
        />
      ))}
    </span>
  )
}

export const UI = ({ hidden }) => {
  const input = useRef()
  const { chat, say, loading, message, log, stop, lastActive, look, setLook, glasses, setGlasses, view, setView } = useChat()
  const [mute, setMute] = useState(isMuted())
  const [panel, setPanel] = useState(null) // 'style' | 'log' | null
  const togglePanel = (p) => setPanel((v) => (v === p ? null : p))
  const [showActions, setShowActions] = useState(null) // null = default for this screen
  const layout = useLayout()
  const [topic, setTopic] = useState('work')
  const [listening, setListening] = useState(false)
  const [intro, setIntro] = useState(() => {
    try {
      return sessionStorage.getItem('vm.intro') !== '1'
    } catch {
      return true
    }
  })
  const [nudge, setNudge] = useState(null)
  const recRef = useRef(null)
  const busy = loading || !!message
  const asked = new Set(log.filter((m) => m.role === 'user').map((m) => m.content))
  const qs = (TOPICS.find((t) => t.id === topic)?.qs || []).filter((q) => !asked.has(q))

  // how: 'text' | 'voice' | 'topic' | 'nudge' (shown on the portfolio's /insights)
  const send = (text, how = 'text') => {
    const t = (text ?? input.current?.value ?? '').trim()
    if (!t || busy) return
    setNudge(null)
    chat(t, how)
    if (input.current) input.current.value = ''
  }

  const closeIntro = (withVoice) => {
    try {
      sessionStorage.setItem('vm.intro', '1')
    } catch {
      /* ignore */
    }
    setIntro(false)
    track('vm_voice', { label: withVoice ? 'Started with sound' : 'Started muted' })
    setMuted(!withVoice)
    setMute(!withVoice)
    if (withVoice) unlockSpeech()
    say(GREETING, { record: true })
  }

  // emotes: instant, interrupt whatever is playing
  const act = (a) => {
    if (loading) return
    track('vm_action', { label: `Emote · ${a.label}${a.locked ? ' (locked)' : ''}` })
    unlockSpeech()
    stop()
    setNudge(null)
    setTimeout(() => say(a.locked ? lockedLine(a.id) : a.m, { record: false }), 30)
  }

  // voice input (Chrome, Edge, Safari)
  const listen = () => {
    if (!Recognition || busy) return
    if (listening) {
      recRef.current?.stop()
      return
    }
    unlockSpeech()
    track('vm_voice', { label: 'Mic used' })
    const rec = new Recognition()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      const r = e.results[e.results.length - 1]
      if (input.current) input.current.value = r[0].transcript
      if (r.isFinal) send(r[0].transcript, 'voice')
    }
    rec.onend = () => setListening(false)
    rec.onerror = (e) => {
      setListening(false)
      if (e?.error && e.error !== 'no-speech' && e.error !== 'aborted') track('vm_error', { label: `Mic: ${e.error}` })
    }
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  // what this browser can do with voice (once per visit)
  useEffect(() => {
    if (!Recognition) track('vm_voice', { label: 'No mic input in this browser' })
    if (!canSpeak()) track('vm_voice', { label: 'No speech output in this browser' })
  }, [])

  // looks, camera views and glasses people try (not the starting values)
  const firstPrefs = useRef(true)
  useEffect(() => {
    if (firstPrefs.current) {
      firstPrefs.current = false
      return
    }
    track('vm_action', { label: `Style · ${look} · ${view}${glasses ? ' · glasses' : ''}` })
  }, [look, view, glasses])

  // keys: "/" focuses the box, Esc stops speaking
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') stop()
      if (e.key === '/' && document.activeElement !== input.current) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stop])

  // after a quiet while, suggest something
  useEffect(() => {
    if (intro || busy) {
      setNudge(null)
      return undefined
    }
    const id = setTimeout(() => {
      const all = TOPICS.flatMap((t) => t.qs).filter((q) => !asked.has(q))
      if (all.length) setNudge(all[Math.floor(Math.random() * all.length)])
    }, 22000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastActive, intro, busy])

  if (hidden) return null
  const last = [...log].reverse().find((m) => m.role === 'assistant')
  const captionText = message?.text || last?.content
  const status = listening ? 'Listening…' : loading ? 'Thinking…' : message ? 'Speaking' : 'Ready'
  const { phone, short, railFits } = layout
  const compact = phone || short
  // actions: a vertical rail only where it fits; elsewhere a strip that opens on demand
  const actionsOpen = showActions ?? railFits
  const chips = (qs.length ? qs : []).slice(0, compact ? 4 : 3)

  return (
    <>
      <style>{'@keyframes vm-bar{from{height:4px}to{height:16px}}@keyframes vm-in{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}.vm-scroll{scrollbar-width:none}.vm-scroll::-webkit-scrollbar{display:none}'}</style>

      {/* first visit: choose voice on/off (also unlocks audio on phones) */}
      {intro && (
        <div className='fixed inset-0 z-30 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm'>
          <div className={`${glass} w-full max-w-md rounded-[28px] p-6 sm:p-8`} style={{ animation: 'vm-in .5s ease-out' }}>
            <p className='flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-white/50'>
              <span className='text-white'>00</span>
              <span className='h-px w-10 bg-white/30' />
              Virtual Me
            </p>
            <h2 className='mt-4 font-display text-[34px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[40px]'>
              <span className='text-white/40'>Talk to my</span>
              <br />
              3D twin.
            </h2>
            <p className='mt-3 text-[15px] leading-relaxed text-white/65'>
              Ask about my work in trading systems, backend and open source, or what I do off the clock. Answers come from my portfolio; your browser does the talking.
            </p>
            <div className='mt-7 flex flex-wrap items-center gap-3'>
              <button
                onClick={() => closeIntro(true)}
                className='group inline-flex items-center gap-3 rounded-full bg-white py-2.5 pl-5 pr-2.5 text-[15px] font-semibold text-slate-950 transition hover:-translate-y-0.5'
              >
                Start talking
                <span className='grid h-8 w-8 place-items-center rounded-full bg-slate-950 text-white transition-transform group-hover:rotate-45'>
                  <Ic.Send size={14} />
                </span>
              </button>
              <button onClick={() => closeIntro(false)} className='rounded-full border border-white/20 px-5 py-3 text-[15px] font-semibold text-white/90 transition hover:bg-white/10'>
                Captions only
              </button>
            </div>
            <p className='mt-6 border-t border-white/10 pt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/45'>
              Tip · tap me, or ask for a joke
            </p>
          </div>
        </div>
      )}

      <div
        className='pointer-events-none fixed inset-0 z-10 flex flex-col justify-between'
        style={{
          padding: compact ? '10px 10px' : '20px 24px',
          paddingBottom: `max(${compact ? 10 : 20}px, env(safe-area-inset-bottom))`,
          paddingTop: `max(${compact ? 10 : 20}px, env(safe-area-inset-top))`,
        }}
      >
        {/* ---------- header ---------- */}
        <div className='flex items-start justify-between gap-2'>
          <div className={`${glass} pointer-events-auto flex min-w-0 items-center gap-2.5 rounded-[20px] p-2 pr-3 sm:gap-3 sm:p-2.5 sm:pr-4`}>
            <div className='relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white font-display text-xs font-bold text-slate-950 sm:h-11 sm:w-11 sm:text-sm'>
              HF
              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 ${busy || listening ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            </div>
            <div className='min-w-0'>
              <h1 className='truncate font-display text-[14px] font-semibold leading-tight tracking-tight sm:text-base'>{phone ? 'Harshana' : 'Harshana Fernando'}</h1>
              {!compact && <p className='text-[11px] text-white/60'>Software Engineer · Trading Systems</p>}
              <p className='mt-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/55'>
                {busy || listening ? <Bars on color={listening ? 'bg-rose-400' : loading ? 'bg-white/80' : 'bg-emerald-300'} /> : <span className='h-1.5 w-1.5 rounded-full bg-emerald-400' />}
                {status}
              </p>
            </div>
            {!compact && (
              <div className='ml-1 hidden items-center gap-1 border-l border-white/10 pl-3 md:flex'>
                {LINKS.map(({ href, label, Icon }) => (
                  <a key={label} href={href} target='_blank' rel='noreferrer' title={label} aria-label={label} className='rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white'>
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className='pointer-events-auto flex shrink-0 items-center gap-1.5 sm:gap-2'>
            {!compact && (
              <div className={`${glass} hidden rounded-2xl p-1 lg:flex`} role='tablist' aria-label='Camera'>
                {VIEWS.map((v) => (
                  <button
                    key={v.id}
                    role='tab'
                    aria-selected={view === v.id}
                    onClick={() => setView(v.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${view === v.id ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'}`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}
            <IconBtn onClick={() => togglePanel('style')} label='Style and camera' active={panel === 'style'} small={compact}>
              <Ic.Shirt size={compact ? 16 : 18} />
            </IconBtn>
            <IconBtn onClick={() => setShowActions(!actionsOpen)} label='Actions and emotions' active={actionsOpen} small={compact}>
              <Ic.Sparkle size={compact ? 16 : 18} />
            </IconBtn>
            {canSpeak() && (
              <IconBtn
                onClick={() => {
                  setMuted(!mute)
                  setMute(!mute)
                }}
                label={mute ? 'Turn voice on' : 'Mute voice'}
                small={compact}
              >
                {mute ? <Ic.VolumeOff size={compact ? 16 : 18} /> : <Ic.Volume size={compact ? 16 : 18} />}
              </IconBtn>
            )}
            <IconBtn onClick={() => togglePanel('log')} label='Conversation' active={panel === 'log'} small={compact}>
              <Ic.Chat size={compact ? 16 : 18} />
              {log.length > 0 && !compact && <span className='ml-1 font-mono text-[10px] font-bold'>{Math.ceil(log.length / 2)}</span>}
            </IconBtn>
          </div>
        </div>

        {/* ---------- popovers (one at a time) ---------- */}
        {panel === 'style' && (
          <div
            className={`${glass} pointer-events-auto absolute z-20 rounded-2xl p-4 ${compact ? 'left-2.5 right-2.5' : 'right-6 w-[300px]'}`}
            style={{ top: compact ? 64 : 84, animation: 'vm-in .25s ease-out' }}
          >
            <div className='mb-3 flex items-center justify-between'>
              <p className='text-[11px] font-semibold uppercase tracking-widest text-white/50'>Style</p>
              <button onClick={() => setPanel(null)} className='text-xs text-white/50 hover:text-white'>Close</button>
            </div>
            <div className='grid grid-cols-5 gap-2'>
              {LOOKS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setLook(l.id)
                    setGlasses(l.glasses)
                  }}
                  title={`${l.label}: ${l.desc}`}
                  className='group flex flex-col items-center gap-1'
                >
                  <span
                    className={`relative h-10 w-10 overflow-hidden rounded-xl border-2 transition ${look === l.id ? 'scale-105 border-white' : 'border-white/15 group-hover:border-white/40'}`}
                    style={{ background: `linear-gradient(180deg, ${l.top} 0 58%, ${l.bottom} 58% 100%)` }}
                  />
                  <span className={`text-[10px] ${look === l.id ? 'text-white' : 'text-white/60'}`}>{l.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setGlasses(!glasses)} className='mt-4 flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10'>
              <span className='flex items-center gap-2'>
                <Ic.Glasses /> Glasses
              </span>
              <span className={`relative h-5 w-9 rounded-full transition ${glasses ? 'bg-emerald-400' : 'bg-white/20'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${glasses ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
            </button>
            <p className='mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-widest text-white/50'>Camera</p>
            <div className='grid grid-cols-3 gap-1'>
              {VIEWS.map((v) => (
                <button key={v.id} onClick={() => setView(v.id)} className={`rounded-lg py-1.5 text-xs font-semibold ${view === v.id ? 'bg-white text-slate-900' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>
                  {v.label}
                </button>
              ))}
            </div>
            {compact && (
              <div className='mt-4 flex items-center justify-center gap-2 border-t border-white/10 pt-3'>
                {LINKS.map(({ href, label, Icon }) => (
                  <a key={label} href={href} target='_blank' rel='noreferrer' className='flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white'>
                    <Icon size={14} /> {label}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {panel === 'log' && (
          <div
            className={`${glass} pointer-events-auto absolute z-20 overflow-y-auto rounded-2xl p-4 text-sm ${compact ? 'left-2.5 right-2.5' : 'right-6 w-[380px]'}`}
            style={{ top: compact ? 64 : 84, maxHeight: compact ? '55dvh' : '55vh', animation: 'vm-in .25s ease-out' }}
          >
            <div className='mb-3 flex items-center justify-between'>
              <p className='font-mono text-[11px] uppercase tracking-[0.2em] text-white/50'>Conversation</p>
              <button onClick={() => setPanel(null)} className='text-xs text-white/50 hover:text-white'>Close</button>
            </div>
            {log.length === 0 && <p className='text-white/60'>Nothing yet. Ask me something!</p>}
            {log.map((m, i) => (
              <div key={i} className={`mb-2 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <span className={`max-w-[85%] rounded-2xl px-3 py-2 ${m.role === 'user' ? 'bg-white text-slate-900' : 'bg-white/10'}`}>{m.content}</span>
              </div>
            ))}
          </div>
        )}

        {/* ---------- actions: rail on big screens ---------- */}
        {actionsOpen && railFits && (
          <div
            className={`${glass} pointer-events-auto absolute left-6 top-1/2 grid -translate-y-1/2 grid-cols-2 gap-1 rounded-[22px] p-2.5`}
            style={{ animation: 'vm-in .3s ease-out' }}
            aria-label='Actions and emotions'
          >
            <p className='col-span-2 px-1 pb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50'>Make me…</p>
            {ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => act(a)}
                disabled={loading}
                title={a.label}
                className='group flex w-[86px] items-center gap-1.5 rounded-xl px-2 py-1.5 text-left text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white disabled:opacity-40'
              >
                <span className={`text-base transition-transform group-hover:scale-125 ${a.locked ? 'opacity-50 grayscale' : ''}`}>{a.emoji}</span>
                <span className={a.locked ? 'text-white/45' : ''}>{a.label}</span>
                {a.locked && <span aria-label='locked' className='ml-auto text-[10px] opacity-60'>🔒</span>}
              </button>
            ))}
          </div>
        )}

        {/* ---------- bottom dock ---------- */}
        <div className={`mx-auto flex w-full flex-col ${compact ? 'max-w-full gap-2' : 'max-w-2xl gap-3'}`}>
          {nudge && !busy && !compact && (
            <button onClick={() => send(nudge, 'nudge')} className={`${glass} pointer-events-auto self-center rounded-full px-4 py-2 text-sm`} style={{ animation: 'vm-in .4s ease-out' }}>
              <span className='text-white/60'>Psst… try </span>&ldquo;{nudge}&rdquo; →
            </button>
          )}

          {(captionText || loading) && (
            <div
              className={`${glass} pointer-events-auto self-center overflow-y-auto text-center ${compact ? 'max-w-full rounded-2xl px-4 py-2.5' : 'max-w-xl rounded-[22px] px-6 py-3.5'}`}
              key={captionText || 'thinking'}
              style={{ animation: 'vm-in .35s ease-out', maxHeight: short ? '28dvh' : phone ? '24dvh' : '30vh' }}
            >
              {loading && !message ? (
                <span className='inline-flex items-center gap-2 text-sm text-white/80'>
                  <Bars on color='bg-white/80' /> Looking through my portfolio…
                </span>
              ) : (
                <Caption text={captionText} live={!!message} small={compact} />
              )}
            </div>
          )}

          {/* actions strip (phones, tablets, short screens) */}
          {actionsOpen && !railFits && (
            <div className='vm-scroll pointer-events-auto -mx-2.5 flex gap-1.5 overflow-x-auto px-2.5' aria-label='Actions and emotions'>
              {ACTIONS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => act(a)}
                  disabled={loading}
                  className='glass flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-white disabled:opacity-40'
                >
                  <span className={a.locked ? 'opacity-50 grayscale' : ''}>{a.emoji}</span>
                  <span className={a.locked ? 'text-white/45' : ''}>{a.label}</span>
                  {a.locked && <span aria-label='locked' className='text-[10px] opacity-60'>🔒</span>}
                </button>
              ))}
            </div>
          )}

          {/* topics + suggested questions: one scrollable row each on small screens */}
          {!busy && !(short && actionsOpen) && (
            <div className={`pointer-events-auto flex flex-col gap-2 ${compact ? '' : 'items-center'}`}>
              <div className={`vm-scroll ${compact ? '-mx-2.5 px-2.5' : ''} flex max-w-full gap-1 overflow-x-auto`} role='tablist'>
                <div className={`${glass} flex shrink-0 gap-1 rounded-full p-1`}>
                  {TOPICS.map((t) => (
                    <button
                      key={t.id}
                      role='tab'
                      aria-selected={topic === t.id}
                      onClick={() => setTopic(t.id)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-[13px] ${topic === t.id ? 'bg-white text-slate-900 shadow-[0_4px_20px_-4px_rgba(255,255,255,0.5)]' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                    >
                      <span className='mr-1'>{t.emoji}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {!short && chips.length > 0 && (
                <div className={`vm-scroll flex gap-2 ${compact ? '-mx-2.5 overflow-x-auto px-2.5' : 'flex-wrap justify-center'}`}>
                  {chips.map((q, i) => (
                    <button
                      key={q}
                      onClick={() => send(q, 'topic')}
                      className='glass shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium text-white/90 transition hover:-translate-y-0.5 hover:text-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_12px_30px_-12px_rgba(16,185,129,0.45)]'
                      style={{ animation: `vm-in .3s ease-out ${i * 0.06}s both` }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* input */}
          <div
            className={`${glass} glass-edge pointer-events-auto flex items-center gap-1.5 p-1.5 transition focus-within:shadow-[0_0_0_6px_rgba(255,255,255,0.06),0_24px_60px_-24px_rgba(0,0,0,0.85)] ${compact ? 'rounded-2xl' : 'rounded-[22px] p-2'}`}
          >
            {Recognition && (
              <button
                onClick={listen}
                disabled={busy}
                aria-label={listening ? 'Stop listening' : 'Speak your question'}
                title={listening ? 'Stop listening' : 'Speak your question'}
                className={`relative grid shrink-0 place-items-center rounded-xl transition ${compact ? 'h-10 w-10' : 'h-12 w-12 rounded-2xl'} ${listening ? 'bg-rose-500 text-white' : 'bg-white/[0.06] text-white/80 hover:bg-white/15 hover:text-white'} disabled:opacity-40`}
              >
                {listening && <span className='absolute inset-0 animate-ping rounded-xl bg-rose-500/50' />}
                <Ic.Mic className='relative' size={compact ? 16 : 18} />
              </button>
            )}
            <input
              ref={input}
              className={`w-full min-w-0 bg-transparent px-2 text-white outline-none placeholder:text-white/45 ${compact ? 'h-10 text-[15px]' : 'h-12'}`}
              placeholder={listening ? 'Listening…' : compact ? 'Ask me anything…' : 'Ask me anything about my work…  ( / )'}
              maxLength={500}
              enterKeyHint='send'
              onKeyDown={(e) => {
                if (e.key === 'Enter') send()
              }}
            />
            {message ? (
              <button onClick={stop} className={`shrink-0 rounded-full bg-white/15 font-semibold text-white hover:bg-white/25 ${compact ? 'h-10 px-3 text-sm' : 'h-12 px-5'}`}>
                <span className='flex items-center gap-1.5'>
                  <Ic.Stop size={14} /> Stop
                </span>
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() => send()}
                aria-label='Ask'
                className={`group flex shrink-0 items-center gap-2 rounded-full bg-white font-semibold text-slate-950 transition hover:-translate-y-0.5 disabled:opacity-40 ${compact ? 'h-10 px-3' : 'h-12 pl-5 pr-1.5'}`}
              >
                {!compact && 'Ask'}
                {compact ? (
                  <Ic.Send size={16} />
                ) : (
                  <span className='grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-white transition-transform group-hover:rotate-45'>
                    <Ic.Send size={15} />
                  </span>
                )}
              </button>
            )}
          </div>
          {!short && (
            <p className='pointer-events-auto truncate text-center font-mono text-[10px] uppercase tracking-[0.14em] text-white/45'>
              {phone ? 'AI me · can be wrong · ' : 'An AI version of me · it can make mistakes · tap me for a reaction · '}
              <a href={PORTFOLIO} target='_blank' rel='noreferrer' className='text-white/85 underline underline-offset-4'>
                Real portfolio →
              </a>
            </p>
          )}
        </div>
      </div>
    </>
  )
}

function IconBtn({ onClick, label, children, active, small }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={!!active}
      className={`${glass} grid place-items-center text-white/80 transition hover:-translate-y-0.5 hover:text-white ${small ? 'h-10 w-10 rounded-xl' : 'h-11 min-w-[44px] rounded-2xl px-3'} ${active ? 'bg-white !text-slate-950' : ''}`}
    >
      <span className='flex items-center'>{children}</span>
    </button>
  )
}
