// Floating "trading desk" screens behind the avatar: a live candlestick chart
// and a FIX session terminal (sample, made-up messages). Drawn on canvases,
// so there are no extra assets to download.
import { Float } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useChat } from '../hooks/useChat'
import { LOGOS } from '../lib/logos'

// older Safari has no roundRect
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) {
    this.rect(x, y, w, h)
  }
}

function useCanvasTexture(w, h) {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return { c, ctx: c.getContext('2d'), tex }
  }, [w, h])
}

function frame(ctx, w, h, title, status) {
  ctx.clearRect(0, 0, w, h)
  // frosted glass card: faint fill, top sheen, thin bright edge
  const fill = ctx.createLinearGradient(0, 0, 0, h)
  fill.addColorStop(0, 'rgba(255,255,255,0.10)')
  fill.addColorStop(1, 'rgba(255,255,255,0.03)')
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.roundRect(3, 3, w - 6, h - 6, 22)
  ctx.fill()
  const edge = ctx.createLinearGradient(0, 0, w, h)
  edge.addColorStop(0, 'rgba(255,255,255,0.7)')
  edge.addColorStop(0.5, 'rgba(255,255,255,0.18)')
  edge.addColorStop(1, 'rgba(52,211,153,0.6)')
  ctx.strokeStyle = edge
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.font = '600 20px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(title, 24, 40)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#34d399'
  ctx.fillText(status, w - 24, 40)
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fillRect(20, 56, w - 40, 1)
}

/** Candles that keep ticking. Faster while the avatar is thinking. */
function ChartPanel(props) {
  const W = 512
  const H = 320
  const { ctx, tex } = useCanvasTexture(W, H)
  const { loading } = useChat()
  const data = useRef(null)
  const last = useRef(0)
  if (!data.current) {
    let v = 196.5
    data.current = Array.from({ length: 34 }, () => {
      const o = v
      v += (Math.random() - 0.48) * 1.2
      return { o, c: v, h: Math.max(o, v) + Math.random() * 0.6, l: Math.min(o, v) - Math.random() * 0.6 }
    })
  }
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (t - last.current < (loading ? 0.25 : 0.9)) return
    last.current = t
    const d = data.current
    const prev = d[d.length - 1].c
    const n = prev + (Math.random() - 0.48) * 1.2
    d.push({ o: prev, c: n, h: Math.max(prev, n) + Math.random() * 0.6, l: Math.min(prev, n) - Math.random() * 0.6 })
    d.shift()
    const lo = Math.min(...d.map((x) => x.l))
    const hi = Math.max(...d.map((x) => x.h))
    const y = (v) => 70 + (1 - (v - lo) / (hi - lo || 1)) * (H - 100)
    const step = (W - 60) / d.length
    frame(ctx, W, H, 'DEMO.N0000 · 1s', `${n.toFixed(2)} ${n >= prev ? '▲' : '▼'}`)
    d.forEach((k, i) => {
      const x = 30 + i * step + step / 2
      const up = k.c >= k.o
      ctx.strokeStyle = ctx.fillStyle = up ? '#34d399' : '#fb7185'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, y(k.h))
      ctx.lineTo(x, y(k.l))
      ctx.stroke()
      const top = y(Math.max(k.o, k.c))
      ctx.fillRect(x - step * 0.3, top, step * 0.6, Math.max(2, y(Math.min(k.o, k.c)) - top))
    })
    // last price line
    ctx.setLineDash([6, 6])
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.beginPath()
    ctx.moveTo(24, y(n))
    ctx.lineTo(W - 24, y(n))
    ctx.stroke()
    ctx.setLineDash([])
    tex.needsUpdate = true
  })
  return (
    <mesh {...props}>
      <planeGeometry args={[0.9, 0.5625]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

const FIX = [
  ['→', '35=D 11=ORD-1042 55=DEMO.N0000 54=1 38=500 44=196.50', '#e2e8f0'],
  ['←', '35=8 150=0 39=0 11=ORD-1042 NEW', '#34d399'],
  ['←', 'MITCH A side=B qty=1,200 px=74.20', '#94a3b8'],
  ['←', '35=8 150=F 39=2 32=500 31=196.50 FILLED', '#34d399'],
  ['→', '35=F 41=ORD-1043 11=CXL-0007', '#e2e8f0'],
  ['←', 'MITCH P qty=300 px=74.10', '#94a3b8'],
  ['↔', '35=0 heartbeat', '#94a3b8'],
]

/** FIX session terminal, a new line every second. */
function TerminalPanel(props) {
  const W = 512
  const H = 320
  const { ctx, tex } = useCanvasTexture(W, H)
  const lines = useRef([])
  const i = useRef(0)
  const last = useRef(-1)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (t - last.current < 1) return
    last.current = t
    lines.current.push(FIX[i.current++ % FIX.length])
    if (lines.current.length > 8) lines.current.shift()
    frame(ctx, W, H, 'FIX 5.0 SP2 · CSE', '● CONNECTED')
    ctx.font = '500 17px ui-monospace, Menlo, monospace'
    lines.current.forEach(([dir, txt, col], k) => {
      ctx.globalAlpha = 0.35 + (0.65 * (k + 1)) / lines.current.length
      ctx.fillStyle = '#64748b'
      ctx.fillText(dir, 22, 86 + k * 29)
      ctx.fillStyle = col
      ctx.fillText(txt.length > 44 ? `${txt.slice(0, 43)}…` : txt, 46, 86 + k * 29)
    })
    ctx.globalAlpha = 1
    // blinking cursor
    if (Math.floor(t) % 2) {
      ctx.fillStyle = '#34d399'
      ctx.fillRect(22, 86 + lines.current.length * 29 - 14, 10, 18)
    }
    tex.needsUpdate = true
  })
  return (
    <mesh {...props}>
      <planeGeometry args={[0.9, 0.5625]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** Floating tech logos (Java, Kafka, Go, K8s…) orbiting slowly above the avatar. */
const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
}
function Badges() {
  const group = useRef()
  const tex = useMemo(() => {
    const items = [...LOGOS, { name: 'FIX', text: 'FIX' }]
    return items.map((it) => {
      const c = document.createElement('canvas')
      c.width = c.height = 128
      const x = c.getContext('2d')
      // round glass tile
      const g = x.createLinearGradient(0, 0, 0, 128)
      g.addColorStop(0, 'rgba(255,255,255,0.16)')
      g.addColorStop(1, 'rgba(255,255,255,0.05)')
      x.fillStyle = g
      x.beginPath()
      x.roundRect(4, 4, 120, 120, 32)
      x.fill()
      x.strokeStyle = 'rgba(255,255,255,0.4)'
      x.lineWidth = 2.5
      x.stroke()
      if (it.path) {
        // logo in its brand colour; very dark brands (e.g. Kafka) drawn white so they show on the dark scene
        x.save()
        x.translate(28, 28)
        x.scale(3, 3)
        x.fillStyle = lum(it.hex) < 0.25 ? '#f1f5f9' : it.hex
        x.fill(new Path2D(it.path))
        x.restore()
      } else {
        x.font = '800 40px Inter, system-ui, sans-serif'
        x.fillStyle = '#e2e8f0'
        x.textAlign = 'center'
        x.textBaseline = 'middle'
        x.fillText(it.text, 64, 66)
      }
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
      return { t, name: it.name }
    })
  }, [])
  useFrame((s, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.15
  })
  return (
    <group ref={group} position={[0, 1.98, -1.5]}>
      {tex.map(({ t, name }, k) => {
        const a = (k / tex.length) * Math.PI * 2
        return (
          <sprite key={name} position={[Math.cos(a) * 1.1, Math.sin(k * 1.7) * 0.1, Math.sin(a) * 0.35]} scale={[0.13, 0.13, 1]}>
            <spriteMaterial map={t} transparent toneMapped={false} />
          </sprite>
        )
      })}
    </group>
  )
}

export function Holo() {
  // screens only where there's room beside the avatar; badges stay out of close-ups
  const aspect = useThree((st) => st.size.width / st.size.height)
  const tall = useThree((st) => st.size.height >= 560)
  const { view } = useChat()
  const wide = aspect >= 1.15 && tall // not on portrait phones or landscape phones
  // keep both screens inside the frame: closer to the avatar on narrower screens
  const panelX = Math.min(1.1, Math.max(0.72, 0.55 * aspect - 0.05))
  return (
    <>
      {wide && (
        <>
          <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.35}>
            <ChartPanel position={[-panelX, 1.52, -1.3]} rotation={[0, 0.45, 0]} />
          </Float>
          <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.35}>
            <TerminalPanel position={[panelX, 1.52, -1.3]} rotation={[0, -0.45, 0]} />
          </Float>
        </>
      )}
      {view !== 'face' && <Badges />}
    </>
  )
}
