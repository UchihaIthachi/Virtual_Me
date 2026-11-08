// Two faces, one brain.
//
//  assistant  The avatar the site has today. It doesn't look like Harshana, so
//             it is his personal assistant and talks ABOUT him ("he built…").
//  me         "Virtual Me": a look-alike of Harshana that talks AS him
//             ("I built…"). Off until his own model exists.
//
// Turning Virtual Me on later (no code change):
//  1. Put his model at Frontend/public/models/virtual-me.glb. It must be a
//     Ready Player Me style avatar with the same rig and morph targets as
//     me.glb (Wolf3D_Head, EyeLeft/EyeRight, Wolf3D_Teeth, Head, Neck, …), so
//     the lip sync, expressions, gestures and animations keep working.
//  2. In Netlify (this site): set VITE_VIRTUAL_ME=1, then redeploy.
// The "Virtual Me" pill then becomes a real switch, the server answers in the
// first person for that persona, and the visitor's choice is remembered.
// Until then the pill explains, with a joke, why he isn't available.
export const VIRTUAL_ME_READY = import.meta.env.VITE_VIRTUAL_ME === '1'

export const PERSONAS = {
  assistant: {
    id: 'assistant',
    model: '/models/me.glb',
    name: "Harshana Fernando's assistant",
    short: "Harshana's assistant",
    role: 'Personal assistant · knows his work and life',
    eyebrow: '3D assistant',
    introA: "Meet Harshana's",
    introB: 'assistant.',
    intro:
      "I know his work in trading systems, backend and open source, and a bit about his life off the clock. Answers come from his portfolio; your browser does the talking. (No, I don't look like him.)",
    placeholder: "Ask about Harshana's work or life…  ( / )",
    placeholderShort: 'Ask about Harshana…',
    footer: 'AI assistant, not Harshana · it can make mistakes · tap me for a reaction · ',
    footerShort: 'AI assistant · can be wrong · ',
  },
  me: {
    id: 'me',
    model: '/models/virtual-me.glb',
    name: 'Harshana Fernando',
    short: 'Harshana',
    role: 'Software Engineer · Trading Systems',
    eyebrow: 'Virtual Me',
    introA: 'Talk to my',
    introB: '3D twin.',
    intro: 'Ask about my work in trading systems, backend and open source, or what I do off the clock. Answers come from my portfolio; your browser does the talking.',
    placeholder: 'Ask me anything about my work…  ( / )',
    placeholderShort: 'Ask me anything…',
    footer: 'An AI version of me · it can make mistakes · tap me for a reaction · ',
    footerShort: 'AI me · can be wrong · ',
  },
}

const KEY = 'vm.persona'
/** The persona to start with: the visitor's last choice, if it is still available. */
export function readPersona() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'me' && VIRTUAL_ME_READY ? 'me' : 'assistant'
  } catch {
    return 'assistant'
  }
}
export function savePersona(id) {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* storage blocked */
  }
}
