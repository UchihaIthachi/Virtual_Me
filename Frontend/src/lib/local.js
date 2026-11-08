// Things the avatar does on its own, without asking the server: tricks,
// reactions to being clicked, a greeting. Keeps it playful and instant.

const pick = (list) => list[Math.floor(Math.random() * list.length)]

export const GREETING = {
  text: "Hi! I'm Harshana's personal assistant. He builds low-latency trading systems. Ask me anything about his work or life, or tap me if you're bored.",
  facialExpression: 'smile',
  animation: 'idle',
  gesture: 'wave',
}
const GREETING_ME = {
  text: "Hi! I'm Harshana, the virtual one. I build low-latency trading systems. Ask me anything about my work, or tap me if you're bored.",
  facialExpression: 'smile',
  animation: 'idle',
  gesture: 'wave',
}
/** persona: 'assistant' (talks about Harshana) | 'me' (Virtual Me, talks as him) */
export const greetingFor = (persona) => (persona === 'me' ? GREETING_ME : GREETING)

const POKES = [
  { text: 'Hey! That tickles.', facialExpression: 'laugh', animation: 'jump', gesture: 'laugh' },
  { text: "Careful, I'm still compiling.", facialExpression: 'funnyFace', animation: 'idle', gesture: 'shake' },
  { text: 'Yes, I can see your cursor.', facialExpression: 'confident', animation: 'idle', gesture: 'nod', wink: true },
  { text: "No dancing, I'm on the clock.", facialExpression: 'funnyFace', animation: 'idle', gesture: 'shrug' },
  { text: "That's not a button. Well, it is now.", facialExpression: 'embarrassed', animation: 'idle', gesture: 'shrug' },
  { text: 'Hello again!', facialExpression: 'smile', animation: 'idle', gesture: 'wave' },
  { text: 'Personal space, please. I need at least one millisecond.', facialExpression: 'surprised', animation: 'idle', gesture: 'lean' },
]

// Dance and kiss are locked: the avatar turns them down with a joke instead
// (it represents me to recruiters; a dancing, kissing avatar is a bit much).
const NOPE_DANCE = [
  { text: "Dance? Harshana says that's not very manly, so it's locked. The only moves we make here are order moves.", facialExpression: 'funnyFace', animation: 'idle', gesture: 'shake' },
  { text: "Sorry, the boss banned dancing. We deploy, we don't dance. Ask me about his FIX gateway instead.", facialExpression: 'confident', animation: 'idle', gesture: 'shrug' },
  { text: "That one's locked. He only dances when the build goes green, and only in private.", facialExpression: 'embarrassed', animation: 'idle', gesture: 'shrug' },
]
const NOPE_KISS = [
  { text: "A kiss? Harshana says that's not very manly on a first meeting. Let's shake hands and talk trading systems.", facialExpression: 'embarrassed', animation: 'idle', gesture: 'shake' },
  { text: "Easy there. I'm his assistant, and a firm handshake is as far as I go.", facialExpression: 'funnyFace', animation: 'idle', gesture: 'shake' },
  { text: "Locked, sorry. He saves that for passing test suites.", facialExpression: 'confident', animation: 'idle', gesture: 'shrug' },
]
// Virtual Me turns them down in his own voice
const NOPE_DANCE_ME = [
  { text: "Dance? Not very manly of me, mate. The only moves I make are order moves.", facialExpression: 'funnyFace', animation: 'idle', gesture: 'shake' },
  { text: "I don't dance. I deploy. Ask me about FIX instead.", facialExpression: 'confident', animation: 'idle', gesture: 'shrug' },
]
const NOPE_KISS_ME = [
  { text: "A kiss? Not very manly on a first meeting. Let's shake hands and talk trading systems.", facialExpression: 'embarrassed', animation: 'idle', gesture: 'shake' },
  { text: 'Easy there. A firm handshake is as far as I go.', facialExpression: 'funnyFace', animation: 'idle', gesture: 'shake' },
]
export const lockedLine = (id, persona = 'assistant') =>
  pick(persona === 'me' ? (id === 'kiss' ? NOPE_KISS_ME : NOPE_DANCE_ME) : id === 'kiss' ? NOPE_KISS : NOPE_DANCE)

// "Virtual Me" (a real look-alike of Harshana) isn't built yet
const VM_BUSY = [
  { text: "The real Virtual Me is out of office. Harshana's busy merging open-source PRs, studying for the CKA and AWS Associate, doing his day job and practising for IELTS. You've got me, his assistant.", facialExpression: 'funnyFace', animation: 'idle', gesture: 'shrug' },
  { text: "Virtual Me? Still in the backlog. Between open source, CKA, AWS Associate, a full-time job and IELTS, he hasn't found an evening for the 3D scan.", facialExpression: 'smile', animation: 'idle', gesture: 'shrug' },
  { text: "He tried to clone himself, but the clone wanted code review first. Until then, I'm the assistant on duty.", facialExpression: 'laugh', animation: 'idle', gesture: 'laugh' },
]
export const vmBusy = () => pick(VM_BUSY)
const NOT_HIM = [
  { text: "No, I'm not Harshana. I'm his personal assistant, and he says I don't look like him at all. But I know his work.", facialExpression: 'smile', animation: 'idle', gesture: 'shrug' },
  { text: "I'm his assistant, not him. The look-alike version is still on his to-do list.", facialExpression: 'confident', animation: 'idle', gesture: 'nod' },
]

// The Actions bar: instant, no server call
export const ACTIONS = [
  { id: 'wave', emoji: '👋', label: 'Wave', m: { text: 'Hi there!', facialExpression: 'smile', animation: 'idle', gesture: 'wave' } },
  { id: 'dance', emoji: '💃', label: 'Dance', locked: true, m: NOPE_DANCE[0] },
  { id: 'nod', emoji: '👍', label: 'Nod', m: { text: 'Absolutely.', facialExpression: 'confident', animation: 'idle', gesture: 'nod' } },
  { id: 'shake', emoji: '🙅', label: 'No', m: { text: 'Nope, not merging that on a Friday.', facialExpression: 'curious', animation: 'idle', gesture: 'shake' } },
  { id: 'think', emoji: '🤔', label: 'Think', m: { text: 'Hmm, let me think about the latency budget.', facialExpression: 'thinking', animation: 'idle', gesture: 'think' } },
  { id: 'shrug', emoji: '🤷', label: 'Shrug', m: { text: 'It works on my machine.', facialExpression: 'embarrassed', animation: 'idle', gesture: 'shrug' } },
  { id: 'laugh', emoji: '😂', label: 'Laugh', m: { text: 'Ha! Good one.', facialExpression: 'laugh', animation: 'happy', gesture: 'laugh' } },
  { id: 'bow', emoji: '🙇', label: 'Bow', m: { text: 'Thank you for visiting.', facialExpression: 'smile', animation: 'idle', gesture: 'bow' } },
  { id: 'wink', emoji: '😉', label: 'Wink', m: { text: 'Between us: I love a clean commit history.', facialExpression: 'confident', animation: 'idle', wink: true } },
  { id: 'kiss', emoji: '😘', label: 'Kiss', locked: true, m: NOPE_KISS[0] },
  { id: 'jump', emoji: '🦘', label: 'Jump', m: { text: 'Whee!', facialExpression: 'surprised', animation: 'jump' } },
  { id: 'look', emoji: '👀', label: 'Look', m: { text: 'Nice place you have here.', facialExpression: 'curious', animation: 'idle', gesture: 'lookAround' } },
  { id: 'sad', emoji: '😢', label: 'Sad', m: { text: 'That feeling when the build fails at 99 percent.', facialExpression: 'sad', animation: 'sad' } },
  { id: 'proud', emoji: '😎', label: 'Proud', m: { text: 'Final certification stage, baby.', facialExpression: 'proud', animation: 'happy', gesture: 'nod' } },
]
export const poke = () => pick(POKES)

const JOKES = [
  "Why did the FIX message break up with the socket? It needed more heartbeat.",
  'I told my Kafka consumer a joke. It got it, eventually.',
  'There are two hard things in trading systems: latency, cache invalidation, and off-by-one errors.',
  'My order book is like my calendar: lots of bids, very few fills.',
]

// question -> local answer (null = ask the portfolio)
export function localAnswer(q, persona = 'assistant') {
  const t = q.toLowerCase()
  const me = persona === 'me'
  const act = (id) => ACTIONS.find((a) => a.id === id).m
  if (t.length < 40) {
    if (/\b(dance|dancing|show me a move|bust a move)\b/.test(t)) return lockedLine('dance', persona)
    if (/\b(jump|hop)\b/.test(t)) return { ...act('jump'), text: 'Like this?' }
    if (/\bwave\b/.test(t)) return act('wave')
    if (/\b(bow|thank(s| you))\b/.test(t)) return act('bow')
    if (/\b(wink)\b/.test(t)) return act('wink')
    if (/\b(kiss|love you)\b/.test(t)) return lockedLine('kiss', persona)
    if (/\b(shrug)\b/.test(t)) return act('shrug')
    if (/\b(laugh|lol|haha)\b/.test(t)) return act('laugh')
    if (/\b(nod|say yes)\b/.test(t)) return act('nod')
    if (/\b(say no|shake your head)\b/.test(t)) return act('shake')
    if (/\b(sad|cry)\b/.test(t)) return act('sad')
    if (/^(bye|goodbye|see you|cya)\b/.test(t)) return { text: 'Bye! Come back any time.', facialExpression: 'smile', animation: 'idle', gesture: 'wave' }
  }
  if (/\b(are you (harshana|him|real)|is (this|that) (you|him|harshana)|who are you)\b/.test(t))
    return me ? { text: "I'm Harshana, the virtual one. The real me is probably reviewing a pull request right now.", facialExpression: 'smile', animation: 'idle', gesture: 'nod' } : pick(NOT_HIM)
  if (/\bvirtual me\b/.test(t)) return me ? { text: "You're talking to him. That's me!", facialExpression: 'laugh', animation: 'idle', gesture: 'laugh' } : vmBusy()
  if (/\b(assistant)\b/.test(t) && me) return { text: 'My assistant is on a break. You can switch back to it at the top any time.', facialExpression: 'smile', animation: 'idle', gesture: 'shrug' }
  if (/\b(joke|funny|make me laugh)\b/.test(t)) return { text: pick(JOKES), facialExpression: 'laugh', animation: 'happy', gesture: 'laugh' }
  if (/^(hi|hello|hey|yo|hiya)[!. ]*$/.test(t)) return { text: me ? 'Hey there! What would you like to know about my work?' : 'Hey there! What would you like to know about Harshana?', facialExpression: 'smile', animation: 'idle', gesture: 'wave' }
  return null
}

// topic tabs with questions (written for the assistant; Virtual Me gets them in the second person)
export const TOPICS = [
  { id: 'work', label: 'Work', emoji: '💼', qs: ['What does he do at CAL?', 'What did he build at ISA?', 'What was ScaleX?', 'What is he looking for next?'] },
  { id: 'trading', label: 'Trading', emoji: '📈', qs: ['Tell me about his FIX gateway', 'What is MITCH market data?', 'How does he test a trading gateway?', 'Why Chronicle Queue?'] },
  { id: 'oss', label: 'Open source', emoji: '🌱', qs: ['Which PRs got merged?', 'What did he do in kgateway?', 'Why does he contribute to CNCF?'] },
  { id: 'skills', label: 'Skills', emoji: '🧠', qs: ['What is he best at?', 'Java or Go?', 'How has he used Kafka?', 'What is he studying now?'] },
  { id: 'life', label: 'Life', emoji: '🌙', qs: ['What anime does he love?', 'Tell me about him outside work', 'Where did he go to school?', 'Did he have a pet?'] },
  { id: 'fun', label: 'Fun', emoji: '🎉', qs: ['Can you dance?', 'Are you Harshana?', 'Tell me a joke', 'Where is Virtual Me?'] },
]

// Virtual Me is asked directly: "What does he do at CAL?" -> "What do you do at CAL?"
const TO_YOU = [
  [/\bWhat does he\b/g, 'What do you'], [/\bdoes he\b/g, 'do you'], [/\bdid he\b/g, 'did you'], [/\bis he\b/g, 'are you'],
  [/\bhas he\b/g, 'have you'], [/\bDid he\b/g, 'Did you'], [/\bWhere did he\b/g, 'Where did you'], [/\bhis\b/g, 'your'],
  [/\babout him\b/g, 'about you'], [/\bhim\b/g, 'you'], [/\bhe\b/g, 'you'], [/\bAre you Harshana\?/g, 'Are you the real Harshana?'],
]
const toYou = (q) => TO_YOU.reduce((s, [re, to]) => s.replace(re, to), q)
export const topicsFor = (persona) => (persona === 'me' ? TOPICS.map((t) => ({ ...t, qs: t.qs.map(toYou) })) : TOPICS)
