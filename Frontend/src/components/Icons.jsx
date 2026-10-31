// Small line icons (lucide-style, inline so there's no extra dependency)
const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
const I = (paths) => function Icon({ size = 18, className = '' }) {
  return (
    <svg {...base} width={size} height={size} className={className} aria-hidden>
      {paths}
    </svg>
  )
}
export const Volume = I(<><path d='M11 5 6 9H2v6h4l5 4V5z' /><path d='M15.5 8.5a5 5 0 0 1 0 7' /><path d='M19 5a10 10 0 0 1 0 14' /></>)
export const VolumeOff = I(<><path d='M11 5 6 9H2v6h4l5 4V5z' /><path d='m22 9-6 6' /><path d='m16 9 6 6' /></>)
export const Mic = I(<><rect x='9' y='2' width='6' height='12' rx='3' /><path d='M5 10a7 7 0 0 0 14 0' /><path d='M12 19v3' /></>)
export const Send = I(<><path d='m22 2-7 20-4-9-9-4 20-7z' /><path d='M22 2 11 13' /></>)
export const Stop = I(<rect x='6' y='6' width='12' height='12' rx='2' />)
export const Chat = I(<path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />)
export const Sparkle = I(<path d='m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z' />)
export const Shirt = I(<path d='M20.4 6.6 16 4l-1.5 1.5a3.5 3.5 0 0 1-5 0L8 4 3.6 6.6a1 1 0 0 0-.4 1.3l1.5 3a1 1 0 0 0 1.3.4L7 11v9a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-9l1 .3a1 1 0 0 0 1.3-.4l1.5-3a1 1 0 0 0-.4-1.3z' />)
export const Github = I(<path d='M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-1-2.6c3.1-.4 6.4-1.5 6.4-7A5.4 5.4 0 0 0 20 4.8 5 5 0 0 0 19.9 1S18.7.7 16 2.5a13.4 13.4 0 0 0-7 0C6.3.7 5.1 1 5.1 1A5 5 0 0 0 5 4.8a5.4 5.4 0 0 0-1.5 3.7c0 5.5 3.3 6.6 6.4 7a3.4 3.4 0 0 0-1 2.6V22' />)
export const Linkedin = I(<><path d='M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z' /><rect x='2' y='9' width='4' height='12' /><circle cx='4' cy='4' r='2' /></>)
export const Globe = I(<><circle cx='12' cy='12' r='10' /><path d='M2 12h20' /><path d='M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z' /></>)
export const Glasses = I(<><circle cx='6' cy='15' r='4' /><circle cx='18' cy='15' r='4' /><path d='M14 15a2 2 0 0 0-4 0' /><path d='M2.5 13 5 7c.7-1.3 1.4-2 3-2' /><path d='M21.5 13 19 7c-.7-1.3-1.5-2-3-2' /></>)
