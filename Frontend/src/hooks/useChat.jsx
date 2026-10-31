import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { speak, stopSpeaking, unlockSpeech } from '../lib/speech'
import { localAnswer, poke as pokeLine } from '../lib/local'

// Same origin on Netlify (/api/ask); `netlify dev` serves it locally too.
const API = import.meta.env.VITE_API_URL || '/api/ask'

const ChatContext = createContext()

export const ChatProvider = ({ children }) => {
  const [queue, setQueue] = useState([]) // replies waiting to be spoken
  const [message, setMessage] = useState(null) // the one being spoken now
  const [log, setLog] = useState([]) // [{role, content}] transcript + history
  const [loading, setLoading] = useState(false)
  const [cameraZoomed, setCameraZoomed] = useState(true)
  const [lastActive, setLastActive] = useState(() => Date.now())
  const busy = useRef(false)

  const say = useCallback((m, { record = true } = {}) => {
    if (record) setLog((l) => [...l, { role: 'assistant', content: m.text }])
    setQueue((qq) => [...qq, m])
  }, [])

  const chat = useCallback(async (text) => {
    const q = String(text || '').trim()
    if (!q || busy.current) return
    unlockSpeech() // still inside the click/keypress, so mobile browsers allow audio
    setLastActive(Date.now())
    const local = localAnswer(q)
    if (local) {
      setLog((l) => [...l, { role: 'user', content: q }])
      say(local)
      return
    }
    busy.current = true
    setLoading(true)
    const history = log.slice(-8)
    setLog((l) => [...l, { role: 'user', content: q }])
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, history }),
      })
      const data = await res.json()
      ;(Array.isArray(data.messages) ? data.messages : []).forEach((m) => say(m))
    } catch {
      say({ text: "Sorry, I can't reach my brain right now. Please try again.", facialExpression: 'sad', animation: 'idle' })
    } finally {
      setLoading(false)
      busy.current = false
      setLastActive(Date.now())
    }
  }, [log, say])

  // tapping the avatar
  const poke = useCallback(() => {
    if (busy.current || message || queue.length) return
    unlockSpeech()
    setLastActive(Date.now())
    say(pokeLine(), { record: false })
  }, [message, queue.length, say])

  // speak queued replies one by one
  useEffect(() => {
    if (message || queue.length === 0) return
    const next = queue[0]
    setMessage(next)
    speak(next.text).then(() => {
      setQueue((qq) => qq.slice(1))
      setMessage(null)
      setLastActive(Date.now())
    })
  }, [queue, message])

  const stop = useCallback(() => {
    stopSpeaking()
    setQueue([])
    setMessage(null)
  }, [])

  return (
    <ChatContext.Provider value={{ chat, say, poke, message, loading, cameraZoomed, setCameraZoomed, log, stop, lastActive }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const context = useContext(ChatContext)
  if (!context) throw new Error('useChat must be used within a ChatProvider')
  return context
}
