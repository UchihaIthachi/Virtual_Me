// Things the avatar does on its own, without asking the server: tricks,
// reactions to being clicked, a greeting. Keeps it playful and instant.

const pick = (list) => list[Math.floor(Math.random() * list.length)]

export const GREETING = {
  text: "Hi! I'm Harshana's 3D twin. I build low-latency trading systems. Ask me anything about my work, or tap me if you're bored.",
  facialExpression: 'smile',
  animation: 'idle',
  gesture: 'wave',
}

const POKES = [
  { text: 'Hey! That tickles.', facialExpression: 'laugh', animation: 'jump', gesture: 'laugh' },
  { text: "Careful, I'm still compiling.", facialExpression: 'funnyFace', animation: 'idle', gesture: 'shake' },
  { text: 'Yes, I can see your cursor.', facialExpression: 'confident', animation: 'idle', gesture: 'nod', wink: true },
  { text: 'Okay okay, one dance move.', facialExpression: 'smile', animation: 'dance' },
  { text: "That's not a button. Well, it is now.", facialExpression: 'embarrassed', animation: 'idle', gesture: 'shrug' },
  { text: 'Hello again!', facialExpression: 'smile', animation: 'idle', gesture: 'wave' },
  { text: 'Personal space, please. I need at least one millisecond.', facialExpression: 'surprised', animation: 'idle', gesture: 'lean' },
]

// The Actions bar: instant, no server call
export const ACTIONS = [
  { id: 'wave', emoji: '👋', label: 'Wave', m: { text: 'Hi there!', facialExpression: 'smile', animation: 'idle', gesture: 'wave' } },
  { id: 'dance', emoji: '💃', label: 'Dance', m: { text: "Here's my deploy-went-green dance.", facialExpression: 'smile', animation: 'dance' } },
  { id: 'nod', emoji: '👍', label: 'Nod', m: { text: 'Absolutely.', facialExpression: 'confident', animation: 'idle', gesture: 'nod' } },
  { id: 'shake', emoji: '🙅', label: 'No', m: { text: 'Nope, not merging that on a Friday.', facialExpression: 'curious', animation: 'idle', gesture: 'shake' } },
  { id: 'think', emoji: '🤔', label: 'Think', m: { text: 'Hmm, let me think about the latency budget.', facialExpression: 'thinking', animation: 'idle', gesture: 'think' } },
  { id: 'shrug', emoji: '🤷', label: 'Shrug', m: { text: 'It works on my machine.', facialExpression: 'embarrassed', animation: 'idle', gesture: 'shrug' } },
  { id: 'laugh', emoji: '😂', label: 'Laugh', m: { text: 'Ha! Good one.', facialExpression: 'laugh', animation: 'happy', gesture: 'laugh' } },
  { id: 'bow', emoji: '🙇', label: 'Bow', m: { text: 'Thank you for visiting.', facialExpression: 'smile', animation: 'idle', gesture: 'bow' } },
  { id: 'wink', emoji: '😉', label: 'Wink', m: { text: 'Between us: I love a clean commit history.', facialExpression: 'confident', animation: 'idle', wink: true } },
  { id: 'kiss', emoji: '😘', label: 'Kiss', m: { text: 'Mwah! Thanks for stopping by.', facialExpression: 'love', animation: 'kiss' } },
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
export function localAnswer(q) {
  const t = q.toLowerCase()
  const act = (id) => ACTIONS.find((a) => a.id === id).m
  if (t.length < 40) {
    if (/\b(dance|show me a move|bust a move)\b/.test(t)) return act('dance')
    if (/\b(jump|hop)\b/.test(t)) return { ...act('jump'), text: 'Like this?' }
    if (/\bwave\b/.test(t)) return act('wave')
    if (/\b(bow|thank(s| you))\b/.test(t)) return act('bow')
    if (/\b(wink)\b/.test(t)) return act('wink')
    if (/\b(kiss|love you)\b/.test(t)) return act('kiss')
    if (/\b(shrug)\b/.test(t)) return act('shrug')
    if (/\b(laugh|lol|haha)\b/.test(t)) return act('laugh')
    if (/\b(nod|say yes)\b/.test(t)) return act('nod')
    if (/\b(say no|shake your head)\b/.test(t)) return act('shake')
    if (/\b(sad|cry)\b/.test(t)) return act('sad')
    if (/^(bye|goodbye|see you|cya)\b/.test(t)) return { text: 'Bye! Come back any time.', facialExpression: 'smile', animation: 'idle', gesture: 'wave' }
  }
  if (/\b(joke|funny|make me laugh)\b/.test(t)) return { text: pick(JOKES), facialExpression: 'laugh', animation: 'happy', gesture: 'laugh' }
  if (/^(hi|hello|hey|yo|hiya)[!. ]*$/.test(t)) return { text: 'Hey there! What would you like to know about my work?', facialExpression: 'smile', animation: 'idle', gesture: 'wave' }
  return null
}

// topic tabs with questions
export const TOPICS = [
  { id: 'work', label: 'Work', emoji: '💼', qs: ['What do you do at CAL?', 'What did you build at ISA?', 'What was ScaleX?', 'What are you looking for next?'] },
  { id: 'trading', label: 'Trading', emoji: '📈', qs: ['Tell me about your FIX gateway', 'What is MITCH market data?', 'How do you test a trading gateway?', 'Why Chronicle Queue?'] },
  { id: 'oss', label: 'Open source', emoji: '🌱', qs: ['Which PRs got merged?', 'What did you do in kgateway?', 'Why contribute to CNCF?'] },
  { id: 'skills', label: 'Skills', emoji: '🧠', qs: ['What are you best at?', 'Java or Go?', 'How do you use Kafka?', 'What cloud work have you done?'] },
  { id: 'fun', label: 'Fun', emoji: '🎉', qs: ['Can you dance?', 'Tell me a joke', 'Wave at me', 'Wink!'] },
]
