import { useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '../hooks/useChat'
import { canSpeak, isMuted, setMuted, spokenChar, unlockSpeech } from '../lib/speech'
import { ACTIONS, GREETING, TOPICS } from '../lib/local'
import { LOOKS } from '../lib/looks'
import * as Ic from './Icons'

const LINKS = [
  { href: 'https://github.com/UchihaIthachi', label: 'GitHub', Icon: Ic.Github },
  { href: 'https://www.linkedin.com/in/harshana-lakshara/', label: 'LinkedIn', Icon: Ic.Linkedin },
  { href: 'https://harshanalf.netlify.app', label: 'Portfolio', Icon: Ic.Globe },
]
const VIEWS = [
  { id: 'face', label: 'Face' },
  { id: 'half', label: 'Half' },
  { id: 'full', label: 'Full' },
]

const PORTFOLIO = 'https://harshanalf.netlify.app'
const glass = 'glass text-white'
const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

/** Caption that lights up word by word as the avatar speaks. */
function Caption({ text, live }) {
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
    <p className='text-[15px] leading-relaxed sm:text-base'>
      {words.map((x, i) => {
        const now = !done && at >= x.start && at < x.end
        const past = done || at >= x.end
        return (
          <span key={i} className={`transition-colors duration-150 ${now ? 'rounded bg-cyan-300/20 text-cyan-100' : past ? 'text-white' : 'text-white/35'}`}>
            {x.w}
          </span>
        )
      })}
    </p>
  )
}

/** Small animated bars while speaking / thinking. */
function Bars({ on, color = 'bg-cyan-300' }) {
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
  const [showStyle, setShowStyle] = useState(false)
  const [mute, setMute] = useState(isMuted())
  const [showLog, setShowLog] = useState(false)
  const [showActions, setShowActions] = useState(true)
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

  const send = (text) => {
    const t = (text ?? input.current?.value ?? '').trim()
    if (!t || busy) return
    setNudge(null)
    chat(t)
    if (input.current) input.current.value = ''
  }

  const closeIntro = (withVoice) => {
    try {
      sessionStorage.setItem('vm.intro', '1')
    } catch {
      /* ignore */
    }
    setIntro(false)
    setMuted(!withVoice)
    setMute(!withVoice)
    if (withVoice) unlockSpeech()
    say(GREETING, { record: true })
  }

  // emotes: instant, interrupt whatever is playing
  const act = (a) => {
    if (loading) return
    unlockSpeech()
    stop()
    setNudge(null)
    setTimeout(() => say(a.m, { record: false }), 30)
  }

  // voice input (Chrome, Edge, Safari)
  const listen = () => {
    if (!Recognition || busy) return
    if (listening) {
      recRef.current?.stop()
      return
    }
    unlockSpeech()
    const rec = new Recognition()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      const r = e.results[e.results.length - 1]
      if (input.current) input.current.value = r[0].transcript
      if (r.isFinal) send(r[0].transcript)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

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

  return (
    <>
      <style>{'@keyframes vm-bar{from{height:4px}to{height:16px}}@keyframes vm-in{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}'}</style>

      {/* first visit: choose voice on/off (also unlocks audio on phones) */}
      {intro && (
        <div className='fixed inset-0 z-30 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm'>
          <div className={`${glass} w-full max-w-md rounded-3xl p-7 text-center`} style={{ animation: 'vm-in .5s ease-out' }}>
            <div className='mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-2xl font-black text-slate-950 shadow-lg'>HF</div>
            <h2 className='mt-4 text-2xl font-black tracking-tight'>Meet my 3D twin</h2>
            <p className='mt-2 text-sm text-white/70'>
              Ask about my work in trading systems, backend and open source. Answers come from my portfolio; your browser does the talking.
            </p>
            <div className='mt-6 grid gap-2 sm:grid-cols-2'>
              <button onClick={() => closeIntro(true)} className='rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-300'>
                Start talking
              </button>
              <button onClick={() => closeIntro(false)} className='rounded-xl border border-white/20 px-4 py-3 font-semibold text-white/90 transition hover:bg-white/10'>
                Captions only
              </button>
            </div>
            <p className='mt-4 text-[11px] text-white/50'>Tip: tap the avatar, or say &ldquo;dance&rdquo;.</p>
          </div>
        </div>
      )}

      <div className='pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-6'>
        {/* header */}
        <div className='flex items-start justify-between gap-3'>
          <div className={`${glass} pointer-events-auto flex items-center gap-3 rounded-[22px] p-2.5 pr-4`}>
            <div className='relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-black text-slate-950'>
              HF
              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 ${busy || listening ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            </div>
            <div className='min-w-0'>
              <h1 className='truncate text-[15px] font-bold leading-tight tracking-tight sm:text-base'>Harshana Fernando</h1>
              <p className='hidden text-[11px] text-white/60 sm:block'>Software Engineer · Trading Systems</p>
              <p className='mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-cyan-200/90'>
                {busy || listening ? <Bars on color={listening ? 'bg-rose-400' : loading ? 'bg-violet-300' : 'bg-cyan-300'} /> : <span className='h-1.5 w-1.5 rounded-full bg-emerald-400' />}
                {status.toLowerCase()}
              </p>
            </div>
            <div className='ml-1 hidden items-center gap-1 border-l border-white/10 pl-3 sm:flex'>
              {LINKS.map(({ href, label, Icon }) => (
                <a key={label} href={href} target='_blank' rel='noreferrer' title={label} aria-label={label} className='rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white'>
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
          <div className='pointer-events-auto flex flex-wrap justify-end gap-2'>
            <div className={`${glass} hidden rounded-2xl p-1 sm:flex`} role='tablist' aria-label='Camera'>
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
            <IconBtn onClick={() => setShowStyle((v) => !v)} label='Style' active={showStyle}>
              <Ic.Shirt />
            </IconBtn>
            <IconBtn onClick={() => setShowActions((v) => !v)} label='Actions and emotions' active={showActions}>
              <Ic.Sparkle />
            </IconBtn>
            {canSpeak() && (
              <IconBtn
                onClick={() => {
                  setMuted(!mute)
                  setMute(!mute)
                }}
                label={mute ? 'Turn voice on' : 'Mute voice'}
              >
                {mute ? <Ic.VolumeOff /> : <Ic.Volume />}
              </IconBtn>
            )}
            <IconBtn onClick={() => setShowLog((v) => !v)} label='Conversation' active={showLog}>
              <Ic.Chat />
              {log.length > 0 && <span className='ml-1 font-mono text-[10px] font-bold'>{Math.ceil(log.length / 2)}</span>}
            </IconBtn>
          </div>
        </div>

        {/* style picker */}
        {showStyle && (
          <div className={`${glass} pointer-events-auto absolute right-3 top-20 w-[min(300px,calc(100vw-1.5rem))] rounded-2xl p-4 sm:right-6`} style={{ animation: 'vm-in .25s ease-out' }}>
            <p className='mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/50'>Style</p>
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
                    className={`relative h-10 w-10 overflow-hidden rounded-xl border-2 transition ${look === l.id ? 'scale-105 border-cyan-300' : 'border-white/15 group-hover:border-white/40'}`}
                    style={{ background: `linear-gradient(180deg, ${l.top} 0 58%, ${l.bottom} 58% 100%)` }}
                  />
                  <span className={`text-[10px] ${look === l.id ? 'text-cyan-200' : 'text-white/60'}`}>{l.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setGlasses(!glasses)} className='mt-4 flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10'>
              <span className='flex items-center gap-2'>
                <Ic.Glasses /> Glasses
              </span>
              <span className={`relative h-5 w-9 rounded-full transition ${glasses ? 'bg-cyan-400' : 'bg-white/20'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${glasses ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
            </button>
            <div className='mt-3 grid grid-cols-3 gap-1 sm:hidden'>
              {VIEWS.map((v) => (
                <button key={v.id} onClick={() => setView(v.id)} className={`rounded-lg py-1.5 text-xs font-semibold ${view === v.id ? 'bg-white text-slate-900' : 'bg-white/5 text-white/70'}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* actions & emotions */}
        {showActions && (
          <div
            className={`${glass} pointer-events-auto absolute left-3 top-1/2 hidden -translate-y-1/2 grid-cols-2 gap-1 rounded-[22px] p-2.5 sm:left-6 md:grid`}
            style={{ animation: 'vm-in .3s ease-out' }}
            aria-label='Actions and emotions'
          >
            <p className='col-span-2 px-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/50'>Make me…</p>
            {ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => act(a)}
                disabled={loading}
                title={a.label}
                className='group flex w-[86px] items-center gap-1.5 rounded-xl px-2 py-1.5 text-left text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white disabled:opacity-40'
              >
                <span className='text-base transition-transform group-hover:scale-125'>{a.emoji}</span>
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* transcript drawer */}
        {showLog && (
          <div className={`${glass} pointer-events-auto absolute right-3 top-20 max-h-[55vh] w-[min(380px,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl p-4 text-sm sm:right-6`} style={{ animation: 'vm-in .25s ease-out' }}>
            <p className='mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/50'>Conversation</p>
            {log.length === 0 && <p className='text-white/60'>Nothing yet. Ask me something!</p>}
            {log.map((m, i) => (
              <div key={i} className={`mb-2 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <span className={`max-w-[85%] rounded-2xl px-3 py-2 ${m.role === 'user' ? 'bg-indigo-500/40' : 'bg-white/10'}`}>{m.content}</span>
              </div>
            ))}
          </div>
        )}

        {/* bottom */}
        <div className='mx-auto flex w-full max-w-2xl flex-col gap-3'>
          {nudge && !busy && (
            <button
              onClick={() => send(nudge)}
              className={`${glass} pointer-events-auto self-center rounded-full px-4 py-2 text-sm`}
              style={{ animation: 'vm-in .4s ease-out' }}
            >
              <span className='text-white/60'>Psst… try </span>&ldquo;{nudge}&rdquo; →
            </button>
          )}

          {(captionText || loading) && (
            <div className={`${glass} pointer-events-auto max-w-xl self-center rounded-[22px] px-6 py-3.5 text-center`} key={captionText || 'thinking'} style={{ animation: 'vm-in .35s ease-out' }}>
              {loading && !message ? (
                <span className='inline-flex items-center gap-2 text-sm text-white/80'>
                  <Bars on color='bg-indigo-300' /> Looking through my portfolio…
                </span>
              ) : (
                <Caption text={captionText} live={!!message} />
              )}
            </div>
          )}

          {/* phones: actions as a strip */}
          {showActions && (
            <div className='pointer-events-auto -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 md:hidden' aria-label='Actions and emotions'>
              {ACTIONS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => act(a)}
                  disabled={loading}
                  className='glass flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs text-white disabled:opacity-40'
                >
                  <span>{a.emoji}</span>
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {/* topics + questions */}
          {!busy && (
            <div className='pointer-events-auto flex flex-col items-center gap-2'>
              <div className={`${glass} flex max-w-full gap-1 overflow-x-auto rounded-full p-1`} role='tablist'>
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
              <div className='flex flex-wrap justify-center gap-2'>
                {(qs.length ? qs : ['Ask me anything below']).slice(0, 3).map((q, i) => (
                  <button
                    key={q}
                    disabled={!qs.length}
                    onClick={() => send(q)}
                    className='glass rounded-full px-3.5 py-1.5 text-[13px] font-medium text-white/90 transition hover:-translate-y-0.5 hover:text-white hover:shadow-[0_0_0_1px_rgba(34,211,238,0.45),0_12px_30px_-12px_rgba(34,211,238,0.5)] disabled:opacity-50'
                    style={{ animation: `vm-in .3s ease-out ${i * 0.06}s both` }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* input */}
          <div className={`${glass} glass-edge pointer-events-auto flex items-center gap-2 rounded-[22px] p-2 transition focus-within:shadow-[0_0_0_6px_rgba(34,211,238,0.10),0_24px_60px_-24px_rgba(0,0,0,0.85)]`}>
            {Recognition && (
              <button
                onClick={listen}
                disabled={busy}
                aria-label={listening ? 'Stop listening' : 'Speak your question'}
                title={listening ? 'Stop listening' : 'Speak your question'}
                className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg transition ${listening ? 'bg-rose-500 text-white' : 'bg-white/[0.06] text-white/80 hover:bg-white/15 hover:text-white'} disabled:opacity-40`}
              >
                {listening && <span className='absolute inset-0 animate-ping rounded-xl bg-rose-500/50' />}
                <Ic.Mic className='relative' />
              </button>
            )}
            <input
              ref={input}
              className='h-12 w-full bg-transparent px-2 text-white outline-none placeholder:text-white/45'
              placeholder={listening ? 'Listening…' : 'Ask me anything about my work…  ( / )'}
              maxLength={500}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send()
              }}
            />
            {message ? (
              <button onClick={stop} className='h-12 shrink-0 rounded-xl bg-white/15 px-5 font-semibold text-white hover:bg-white/25'>
                <span className='flex items-center gap-1.5'><Ic.Stop size={14} /> Stop</span>
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() => send()}
                className='flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 to-sky-400 px-5 font-semibold text-slate-950 shadow-[0_8px_30px_-8px_rgba(34,211,238,0.7)] transition hover:brightness-110 disabled:opacity-40'
              >
                Ask <Ic.Send size={16} />
              </button>
            )}
          </div>
          <p className='pointer-events-auto text-center text-[11px] text-white/55'>
            An AI version of me, so it can make mistakes. Tap me for a reaction.{' '}
            <a href={PORTFOLIO} target='_blank' rel='noreferrer' className='font-semibold text-white/85 underline'>
              Visit the real portfolio
            </a>
          </p>
        </div>
      </div>
    </>
  )
}

function IconBtn({ onClick, label, children, active }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`${glass} grid h-11 min-w-[44px] place-items-center rounded-2xl px-3 text-white/80 transition hover:-translate-y-0.5 hover:text-white ${active ? 'text-cyan-200 shadow-[0_0_0_1px_rgba(34,211,238,0.6),0_10px_30px_-10px_rgba(34,211,238,0.6)]' : ''}`}
    >
      <span className='flex items-center'>{children}</span>
    </button>
  )
}
