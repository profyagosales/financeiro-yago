import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────
export type EmojiType = 'crown' | 'sparkle' | 'flame' | 'diamond' | 'warning'
export interface Phrase { text: string; emoji: EmojiType }

// ─── Custom SVG Emojis (inline, sem Unicode) ──────────────────────
function SvgCrown() {
  return (
    <svg width="15" height="12" viewBox="0 0 20 16" fill="none"
      style={{ display:'inline-block', verticalAlign:'middle', marginLeft:4 }}>
      <path d="M1 13 L4 4 L8.5 8.5 L10 1 L11.5 8.5 L16 4 L19 13 Z" fill="#FFD700"/>
      <rect x="1" y="13" width="18" height="2.2" rx="1.1" fill="#E8C000"/>
      <circle cx="10" cy="2" r="2.2" fill="#FF6B9D"/>
      <circle cx="4"  cy="7" r="1.6" fill="#C77DFF"/>
      <circle cx="16" cy="7" r="1.6" fill="#6EC6FF"/>
    </svg>
  )
}
function SvgSparkle() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none"
      style={{ display:'inline-block', verticalAlign:'middle', marginLeft:4 }}>
      <path d="M10 1 L11.6 7.8 L18.5 9 L11.6 10.2 L10 17 L8.4 10.2 L1.5 9 L8.4 7.8 Z" fill="#FFD700"/>
      <circle cx="3.5" cy="3"    r="1.4" fill="#FF6B9D" opacity=".85"/>
      <circle cx="17"  cy="3.5"  r="1.1" fill="#C77DFF" opacity=".8"/>
      <circle cx="16"  cy="16.5" r="1.3" fill="#6EC6FF" opacity=".8"/>
    </svg>
  )
}
function SvgFlame() {
  return (
    <svg width="13" height="17" viewBox="0 0 14 20" fill="none"
      style={{ display:'inline-block', verticalAlign:'middle', marginLeft:4 }}>
      <path d="M7 1 C9 5 13 7 13 13 C13 17.5 10.3 20 7 20 C3.7 20 1 17.5 1 13 C1 7 5 5 7 1 Z" fill="#FF6B35"/>
      <path d="M7 9 C9 11.5 9.5 14.5 9 16.5 C8.3 18.5 5.5 18.5 5 16.5 C4.5 14.5 5 11.5 7 9 Z" fill="#FFD93D"/>
    </svg>
  )
}
function SvgDiamond() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none"
      style={{ display:'inline-block', verticalAlign:'middle', marginLeft:4 }}>
      <path d="M4 7 L10 2 L16 7 L10 18 Z" fill="#6EC6FF"/>
      <path d="M4 7 L10 7 L10 18 Z" fill="#0090D0" opacity=".5"/>
      <path d="M10 2 L16 7 L10 7 L14 4.5 Z" fill="#A8E4FF"/>
    </svg>
  )
}
function SvgWarning() {
  return (
    <svg width="15" height="13" viewBox="0 0 20 18" fill="none"
      style={{ display:'inline-block', verticalAlign:'middle', marginLeft:4 }}>
      <path d="M10 1.5 L19 16.5 H1 Z" fill="#FF6B35"/>
      <rect x="9" y="7.5" width="2" height="4.5" rx="1" fill="white"/>
      <circle cx="10" cy="14" r="1" fill="white"/>
    </svg>
  )
}
function EmojiIcon({ type }: { type: EmojiType }) {
  if (type === 'crown')   return <SvgCrown />
  if (type === 'sparkle') return <SvgSparkle />
  if (type === 'flame')   return <SvgFlame />
  if (type === 'diamond') return <SvgDiamond />
  return <SvgWarning />
}

// ─── Phrases ──────────────────────────────────────────────────────
const PHRASES: Phrase[] = [
  { text: 'Economiza teu dinheiro, mulher!',              emoji: 'sparkle' },
  { text: 'A viagem pra Europa está mais perto, baby!',   emoji: 'diamond' },
  { text: 'Controle financeiro é glamour, bestie!',       emoji: 'crown'   },
  { text: 'Cada real economizado é liberdade, dragging!', emoji: 'sparkle' },
  { text: 'A Lady Gaga aprovaria seus gastos?',           emoji: 'warning' },
]

// ─── Hook ─────────────────────────────────────────────────────────
export function useFairyPhrase(contextPhrase?: Phrase): Phrase {
  const [idx, setIdx] = useState(0)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (contextPhrase) return
    ref.current = setInterval(() => setIdx(i => (i + 1) % PHRASES.length), 6000)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [contextPhrase])
  return contextPhrase ?? PHRASES[idx]
}

// ─── Speech Bubble ────────────────────────────────────────────────
export function FairyBubble({ phrase }: { phrase: Phrase }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phrase.text}
        initial={{ opacity: 0, scale: 0.92, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{
          background: 'white',
          borderRadius: '14px 14px 4px 14px',
          padding: '9px 13px',
          boxShadow: '0 4px 18px rgba(80,78,118,0.18)',
          border: '1px solid rgba(196,195,227,0.4)',
          maxWidth: 240,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontStyle: 'italic',
          fontSize: 12.5,
          fontWeight: 600,
          color: '#2C1A0F',
          lineHeight: 1.4,
        }}>
          {phrase.text}
        </span>
        <EmojiIcon type={phrase.emoji} />
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Magic dust particles ─────────────────────────────────────────
const DUST = [
  { color: '#FF6B9D', dx: 12,  dy: 8,   r: 3,   dur: 1.2, delay: 0    },
  { color: '#FFD700', dx: -8,  dy: 12,  r: 2.5, dur: 1.4, delay: 0.25 },
  { color: '#6EC6FF', dx: 16,  dy: -4,  r: 2,   dur: 1.1, delay: 0.5  },
  { color: '#C77DFF', dx: -12, dy: 6,   r: 2.8, dur: 1.5, delay: 0.75 },
  { color: '#A3B565', dx: 6,   dy: 14,  r: 2,   dur: 1.3, delay: 1.0  },
  { color: '#FF6B35', dx: -4,  dy: -10, r: 1.8, dur: 1.6, delay: 1.25 },
]

// ─── Flying Fairy SVG ─────────────────────────────────────────────
// Horizontal pose, 110×80 viewBox. Facing right.
// Wand tip at approximately (104, 10)
const WX = 104, WY = 10

function FairySvg() {
  return (
    <svg width="110" height="80" viewBox="0 0 110 80" fill="none" overflow="visible">
      <defs>
        <linearGradient id="ff-wing-ul" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%"   stopColor="rgba(196,180,255,0.7)"/>
          <stop offset="100%" stopColor="rgba(240,210,255,0.25)"/>
        </linearGradient>
        <linearGradient id="ff-wing-ll" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="rgba(180,140,255,0.65)"/>
          <stop offset="100%" stopColor="rgba(255,180,240,0.2)"/>
        </linearGradient>
        <linearGradient id="ff-wing-ur" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="rgba(255,180,230,0.55)"/>
          <stop offset="100%" stopColor="rgba(210,190,255,0.2)"/>
        </linearGradient>
        <linearGradient id="ff-dress" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#8B5CF6"/>
          <stop offset="100%" stopColor="#5B21B6"/>
        </linearGradient>
        <linearGradient id="ff-hair" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#FF2D87"/>
          <stop offset="100%" stopColor="#8B2FFF"/>
        </linearGradient>
        <radialGradient id="ff-skin" cx="48%" cy="42%" r="52%">
          <stop offset="0%"   stopColor="#FFE8CE"/>
          <stop offset="100%" stopColor="#F5C9A0"/>
        </radialGradient>
        <radialGradient id="ff-wglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(255,220,70,0.7)"/>
          <stop offset="100%" stopColor="rgba(255,220,70,0)"/>
        </radialGradient>
      </defs>

      {/* ══ WINGS ════════════════════════════════════════════════ */}

      {/* Left wings group — pivot at body attachment point ~(54,44) */}
      <motion.g
        style={{ transformOrigin: '54px 44px' }}
        animate={{ scaleY: [1, 0.18, 1] }}
        transition={{ duration: 0.38, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
      >
        {/* Upper left wing */}
        <path d="M54 44 C36 36 12 18 8 6 C4 -4 26 0 42 20 C48 28 52 36 54 44 Z"
              fill="url(#ff-wing-ul)" stroke="rgba(200,170,255,0.55)" strokeWidth="0.7"/>
        {/* Vein */}
        <path d="M54 44 C38 36 18 20 10 8" stroke="rgba(200,170,255,0.3)" strokeWidth="0.6" fill="none"/>
        {/* Lower left wing */}
        <path d="M54 48 C34 54 10 62 8 72 C6 80 28 78 46 66 C51 62 53 55 54 48 Z"
              fill="url(#ff-wing-ll)" stroke="rgba(180,140,255,0.45)" strokeWidth="0.6"/>
      </motion.g>

      {/* Right wing — behind body, smaller, same pivot */}
      <motion.g
        style={{ transformOrigin: '54px 44px' }}
        animate={{ scaleY: [1, 0.18, 1] }}
        transition={{ duration: 0.38, repeat: Infinity, ease: [0.45, 0, 0.55, 1], delay: 0.02 }}
      >
        <path d="M58 42 C70 32 88 20 92 24 C96 28 82 44 64 52 C60 54 58 48 58 42 Z"
              fill="url(#ff-wing-ur)" stroke="rgba(255,180,230,0.45)" strokeWidth="0.6"/>
      </motion.g>

      {/* ══ DRESS / BODY ════════════════════════════════════════ */}
      {/* Flowing dress tail (wind effect, streams behind) */}
      <path d="M56 50 C44 55 24 60 18 54 C12 48 28 40 48 44 Z"
            fill="#6D28D9" opacity="0.5"/>
      {/* Body oval */}
      <ellipse cx="58" cy="47" rx="15" ry="9.5"
               transform="rotate(-18 58 47)"
               fill="url(#ff-dress)"/>
      {/* Shimmer on dress */}
      <ellipse cx="52" cy="43" rx="7" ry="4"
               transform="rotate(-18 52 43)"
               fill="rgba(255,255,255,0.15)"/>
      {/* Sequin dots */}
      {([
        [50,50],[56,52],[44,50],[58,46],[46,46],[52,44],
      ] as [number,number][]).map(([cx,cy],i) => (
        <motion.circle key={i} cx={cx} cy={cy} r="1.4"
          fill="rgba(255,255,255,0.6)"
          animate={{ opacity:[0.25,0.85,0.25], r:[1.2,1.8,1.2] }}
          transition={{ duration:1.8+i*0.15, repeat:Infinity, delay:i*0.2 }}/>
      ))}

      {/* ══ HEAD ════════════════════════════════════════════════ */}
      <circle cx="74" cy="30" r="14" fill="url(#ff-skin)"/>

      {/* ══ HAIR ════════════════════════════════════════════════ */}
      <ellipse cx="74" cy="20" rx="12" ry="8.5" fill="url(#ff-hair)"/>
      <ellipse cx="64" cy="24" rx="9"  ry="11"  fill="#FF2D87"/>
      <ellipse cx="84" cy="22" rx="8"  ry="9"   fill="#8B2FFF"/>
      <ellipse cx="74" cy="17" rx="9"  ry="7"   fill="#FF6EC7"/>
      {/* Hair highlight */}
      <ellipse cx="70" cy="16" rx="4" ry="3.5" fill="rgba(255,255,255,0.2)"/>

      {/* ══ CROWN ════════════════════════════════════════════════ */}
      <path d="M66 19 L68.5 13.5 L72 17 L74 11 L76 17 L79.5 13.5 L82 19 Z"
            fill="#FFD700" stroke="#E8C000" strokeWidth="0.6" strokeLinejoin="round"/>
      <rect x="66" y="19" width="16" height="2.2" rx="0.8" fill="#FFD700"/>
      <circle cx="74"   cy="12.5" r="1.8" fill="#FF6B9D"/>
      <circle cx="69"   cy="15.5" r="1.3" fill="#6EC6FF"/>
      <circle cx="79"   cy="15.5" r="1.3" fill="#C77DFF"/>
      <circle cx="73.2" cy="12"   r="0.7" fill="rgba(255,255,255,0.75)"/>

      {/* ══ EYESHADOW ═══════════════════════════════════════════ */}
      <ellipse cx="70" cy="28" rx="5"   ry="3"   fill="#9B27D0" opacity=".4"/>
      <ellipse cx="78" cy="26.5" rx="4.5" ry="2.8" fill="#9B27D0" opacity=".4"/>

      {/* ══ EYES ════════════════════════════════════════════════ */}
      <path d="M65 29.5 Q70 24.5 75 29.5 Q70 34 65 29.5 Z" fill="white"/>
      <ellipse cx="70" cy="29.5" rx="4" ry="3.5" fill="#1A0840"/>
      <circle cx="70" cy="29.5" r="2.2" fill="#0A0420"/>
      <ellipse cx="68.5" cy="27.5" rx="1.6" ry="1.3" fill="white"/>

      <path d="M73 28 Q78 23 83 28 Q78 32.5 73 28 Z" fill="white"/>
      <ellipse cx="78" cy="28" rx="4" ry="3.5" fill="#1A0840"/>
      <circle cx="78" cy="28" r="2.2" fill="#0A0420"/>
      <ellipse cx="76.5" cy="26" rx="1.6" ry="1.3" fill="white"/>

      {/* ══ LASHES (shorter, more natural for flying) ═══════════ */}
      <line x1="65.5" y1="26.5" x2="63"  y2="23.5" stroke="#1A0840" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="68.5" y1="25"   x2="68"  y2="21.5" stroke="#1A0840" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="72"   y1="25.5" x2="73"  y2="22"   stroke="#1A0840" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="74"   y1="24.5" x2="75.5" y2="21"  stroke="#1A0840" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="77.5" y1="24.5" x2="79"  y2="21.5" stroke="#1A0840" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="81"   y1="25.5" x2="83.5" y2="23"  stroke="#1A0840" strokeWidth="1.2" strokeLinecap="round"/>

      {/* ══ NOSE ════════════════════════════════════════════════ */}
      <path d="M73 34 Q74 36 75 34" stroke="rgba(200,140,90,0.35)" strokeWidth="1.1" fill="none" strokeLinecap="round"/>

      {/* ══ SMILE ════════════════════════════════════════════════ */}
      <path d="M69.5 38 Q74 41.5 78.5 38" stroke="#E91E8C" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      <path d="M69.5 38 Q74 40 78.5 38" stroke="#FF80C0" strokeWidth="0.7" fill="none" strokeLinecap="round" opacity=".5"/>

      {/* ══ BLUSH ════════════════════════════════════════════════ */}
      <circle cx="66" cy="35" r="5.5" fill="rgba(255,120,165,0.22)"/>
      <circle cx="82" cy="33" r="5.5" fill="rgba(255,120,165,0.22)"/>

      {/* ══ NECK ════════════════════════════════════════════════ */}
      <rect x="69" y="41" width="9" height="9" rx="3.5" fill="#F5C9A0"/>

      {/* ══ ARM + WAND (oscillating group) ══════════════════════ */}
      <motion.g
        style={{ transformOrigin: '73px 46px' }}
        animate={{ rotate: [-7, 7, -7] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Upper arm */}
        <path d="M78 43 Q90 35 98 22" stroke="#F5C9A0" strokeWidth="8" strokeLinecap="round" fill="none"/>
        {/* Wand glow halo */}
        <circle cx={WX} cy={WY} r="13" fill="url(#ff-wglow)"/>
        {/* Wand stick */}
        <line x1="94" y1="24" x2={WX} y2={WY} stroke="#C89A00" strokeWidth="2.8" strokeLinecap="round"/>
        <line x1="94" y1="24" x2={WX} y2={WY} stroke="rgba(255,220,60,0.35)" strokeWidth="7" strokeLinecap="round"/>
        {/* Wand star */}
        <path d={`
          M${WX} ${WY-10}
          L${WX+2.9} ${WY-3.6} L${WX+9.5} ${WY-3.6}
          L${WX+4.7} ${WY+1.4} L${WX+5.9} ${WY+8}
          L${WX} ${WY+4.5} L${WX-5.9} ${WY+8}
          L${WX-4.7} ${WY+1.4} L${WX-9.5} ${WY-3.6}
          L${WX-2.9} ${WY-3.6} Z
        `} fill="#FFD700" stroke="#E8C000" strokeWidth="0.7"/>
        <circle cx={WX} cy={WY} r="4" fill="rgba(255,255,255,0.7)"/>
        {/* Magic dust particles from wand tip */}
        {DUST.map((d, i) => (
          <motion.circle key={i}
            cx={WX} cy={WY} r={d.r} fill={d.color}
            animate={{
              cx: [WX, WX + d.dx, WX + d.dx * 1.7],
              cy: [WY, WY + d.dy, WY + d.dy * 1.7],
              opacity: [0, 0.95, 0],
              r: [0, d.r, 0],
            }}
            transition={{ duration: d.dur, repeat: Infinity, delay: d.delay, ease: 'easeOut' }}
          />
        ))}
      </motion.g>
    </svg>
  )
}

// ─── Flying Fairy component (posicionar no Dashboard) ─────────────
// Renderize dentro de um container `position:'relative'` e
// envolva num motion.div com animate x/y para o percurso de voo.
export function DragFairy() {
  return (
    <motion.div
      animate={{ y: [0, -4, 2, -6, 0], rotate: [-2, 1, -3, 2, -2] }}
      transition={{ duration: 4.5, ease: 'easeInOut', repeat: Infinity, times:[0,0.25,0.5,0.75,1] }}
      style={{ display: 'inline-block', filter: 'drop-shadow(0 6px 14px rgba(139,92,246,0.25))' }}
    >
      <FairySvg />
    </motion.div>
  )
}
