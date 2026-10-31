import { useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '../hooks/useChat'
import { canSpeak, isMuted, setMuted, spokenChar, unlockSpeech } from '../lib/speech'
import { ACTIONS, GREETING, TOPICS } from '../lib/local'

const PORTFOLIO = 'https://harshanalf.netlify.app'
const glass = 'border border-white/15 bg-slate-900/55 text-white shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl'
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
          <span key={i} className={`transition-colors duration-150 ${now ? 'rounded bg-lime-300/25 text-lime-200' : past ? 'text-white' : 'text-white/35'}`}>
            {x.w}
          </span>
        )
      })}
    </p>
  )
}

/** Small animated bars while speaking / thinking. */
function Bars({ on, color = 'bg-lime-300' }) {
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
  const { chat, say, loading, cameraZoomed, setCameraZoomed, message, log, stop, lastActive } = useChat()
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
            <div className='mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-lime-400 to-indigo-500 text-2xl font-black text-slate-950 shadow-lg'>HF</div>
            <h2 className='mt-4 text-2xl font-black tracking-tight'>Meet my 3D twin</h2>
            <p className='mt-2 text-sm text-white/70'>
              Ask about my work in trading systems, backend and open source. Answers come from my portfolio; your browser does the talking.
            </p>
            <div className='mt-6 grid gap-2 sm:grid-cols-2'>
              <button onClick={() => closeIntro(true)} className='rounded-xl bg-lime-400 px-4 py-3 font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-lime-300'>
                🔊 Start talking
              </button>
              <button onClick={() => closeIntro(false)} className='rounded-xl border border-white/20 px-4 py-3 font-semibold text-white/90 transition hover:bg-white/10'>
                🔇 Captions only
              </button>
            </div>
            <p className='mt-4 text-[11px] text-white/50'>Tip: tap the avatar, or say &ldquo;dance&rdquo;.</p>
          </div>
        </div>
      )}

      <div className='pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-6'>
        {/* header */}
        <div className='flex items-start justify-between gap-3'>
          <div className={`${glass} pointer-events-auto rounded-2xl px-4 py-3`}>
            <h1 className='text-lg font-black tracking-tight sm:text-xl'>
              Virtual <span className='bg-gradient-to-r from-lime-300 to-indigo-300 bg-clip-text text-transparent'>Harshana</span>
            </h1>
            <p className='mt-1 flex items-center gap-2 text-xs text-white/70'>
              {busy || listening ? (
                <Bars on color={listening ? 'bg-rose-400' : loading ? 'bg-indigo-300' : 'bg-lime-300'} />
              ) : (
                <span className='relative flex h-2 w-2'>
                  <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75' />
                  <span className='relative inline-flex h-2 w-2 rounded-full bg-emerald-500' />
                </span>
              )}
              {status}
            </p>
          </div>
          <div className='pointer-events-auto flex gap-2'>
            {canSpeak() && (
              <IconBtn
                onClick={() => {
                  setMuted(!mute)
                  setMute(!mute)
                }}
                label={mute ? 'Turn voice on' : 'Mute voice'}
              >
                {mute ? '🔇' : '🔊'}
              </IconBtn>
            )}
            <IconBtn onClick={() => setCameraZoomed(!cameraZoomed)} label={cameraZoomed ? 'Full body' : 'Close up'}>
              {cameraZoomed ? '🧍' : '🙂'}
            </IconBtn>
            <IconBtn onClick={() => setShowActions((v) => !v)} label='Actions and emotions' active={showActions}>
              🎭
            </IconBtn>
            <IconBtn onClick={() => setShowLog((v) => !v)} label='Conversation' active={showLog}>
              💬{log.length > 0 && <span className='ml-1 text-[10px] font-bold'>{Math.ceil(log.length / 2)}</span>}
            </IconBtn>
          </div>
        </div>

        {/* actions & emotions */}
        {showActions && (
          <div
            className={`${glass} pointer-events-auto absolute left-3 top-1/2 hidden -translate-y-1/2 grid-cols-2 gap-1 rounded-2xl p-2 sm:left-6 md:grid`}
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
                className='group flex w-[86px] items-center gap-1.5 rounded-xl px-2 py-1.5 text-left text-xs font-medium text-white/85 transition hover:bg-white/15 disabled:opacity-40'
              >
                <span className='text-base transition-transform group-hover:scale-125'>{a.emoji}</span>
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* transcript drawer */}
        {showLog && (
          <div className={`${glass} pointer-events-auto absolute right-3 top-24 max-h-[55vh] w-[min(380px,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl p-4 text-sm sm:right-6`} style={{ animation: 'vm-in .25s ease-out' }}>
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
            <div className={`${glass} pointer-events-auto self-center rounded-2xl px-5 py-3 text-center`} key={captionText || 'thinking'} style={{ animation: 'vm-in .35s ease-out' }}>
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
                  className='flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-white backdrop-blur-md disabled:opacity-40'
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
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${topic === t.id ? 'bg-white text-slate-900' : 'text-white/75 hover:bg-white/10'}`}
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
                    className='rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20 disabled:opacity-50'
                    style={{ animation: `vm-in .3s ease-out ${i * 0.06}s both` }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* input */}
          <div className={`${glass} pointer-events-auto flex items-center gap-2 rounded-2xl p-2`}>
            {Recognition && (
              <button
                onClick={listen}
                disabled={busy}
                aria-label={listening ? 'Stop listening' : 'Speak your question'}
                title={listening ? 'Stop listening' : 'Speak your question'}
                className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg transition ${listening ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/20'} disabled:opacity-40`}
              >
                {listening && <span className='absolute inset-0 animate-ping rounded-xl bg-rose-500/50' />}
                <span className='relative'>🎙️</span>
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
                ■ Stop
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() => send()}
                className='h-12 shrink-0 rounded-xl bg-lime-400 px-6 font-bold text-slate-950 transition hover:bg-lime-300 disabled:opacity-40'
              >
                Ask
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
      className={`${glass} grid h-11 min-w-[44px] place-items-center rounded-xl px-3 text-base transition hover:-translate-y-0.5 hover:bg-slate-800/70 ${active ? 'ring-2 ring-lime-300/60' : ''}`}
    >
      <span className='flex items-center'>{children}</span>
    </button>
  )
}
