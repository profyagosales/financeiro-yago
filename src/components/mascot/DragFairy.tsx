import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────
export type EmojiType = 'crown' | 'sparkle' | 'flame' | 'diamond' | 'warning'
export interface Phrase { text: string; emoji: EmojiType }

// ─── Custom SVG Emojis ────────────────────────────────────────────
function SvgCrown() {
  return (
    <svg width="16" height="13" viewBox="0 0 20 16" fill="none" style={{ display:'inline-block', verticalAlign:'middle', marginLeft:4 }}>
      <path d="M1 13 L4 4 L8.5 8.5 L10 1 L11.5 8.5 L16 4 L19 13 Z" fill="#FFD700"/>
      <rect x="1" y="13" width="18" height="2.2" rx="1.1" fill="#E8C000"/>
      <circle cx="10" cy="2" r="2.2" fill="#FF6B9D"/>
      <circle cx="4" cy="7" r="1.6" fill="#C77DFF"/>
      <circle cx="16" cy="7" r="1.6" fill="#6EC6FF"/>
    </svg>
  )
}
function SvgSparkle() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ display:'inline-block', verticalAlign:'middle', marginLeft:4 }}>
      <path d="M10 1 L11.6 7.8 L18.5 9 L11.6 10.2 L10 17 L8.4 10.2 L1.5 9 L8.4 7.8 Z" fill="#FFD700"/>
      <circle cx="3.5" cy="3" r="1.4" fill="#FF6B9D" opacity=".85"/>
      <circle cx="17" cy="3.5" r="1.1" fill="#C77DFF" opacity=".8"/>
      <circle cx="16" cy="16.5" r="1.3" fill="#6EC6FF" opacity=".8"/>
    </svg>
  )
}
function SvgFlame() {
  return (
    <svg width="14" height="18" viewBox="0 0 14 20" fill="none" style={{ display:'inline-block', verticalAlign:'middle', marginLeft:4 }}>
      <path d="M7 1 C9 5 13 7 13 13 C13 17.5 10.3 20 7 20 C3.7 20 1 17.5 1 13 C1 7 5 5 7 1 Z" fill="#FF6B35"/>
      <path d="M7 9 C9 11.5 9.5 14.5 9 16.5 C8.3 18.5 5.5 18.5 5 16.5 C4.5 14.5 5 11.5 7 9 Z" fill="#FFD93D"/>
    </svg>
  )
}
function SvgDiamond() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ display:'inline-block', verticalAlign:'middle', marginLeft:4 }}>
      <path d="M4 7 L10 2 L16 7 L10 18 Z" fill="#6EC6FF"/>
      <path d="M4 7 L10 7 L10 18 Z" fill="#0090D0" opacity=".5"/>
      <path d="M10 2 L16 7 L10 7 L14 4.5 Z" fill="#A8E4FF"/>
    </svg>
  )
}
function SvgWarning() {
  return (
    <svg width="16" height="15" viewBox="0 0 20 18" fill="none" style={{ display:'inline-block', verticalAlign:'middle', marginLeft:4 }}>
      <path d="M10 1.5 L19 16.5 H1 Z" fill="#FF6B35"/>
      <path d="M10 2.5 L17.5 16 H2.5 Z" fill="#FF8C5A" opacity=".25"/>
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

// ─── Speech Bubble (stand-alone, renderize no Dashboard) ──────────
export function FairyBubble({ phrase }: { phrase: Phrase }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phrase.text}
        initial={{ opacity: 0, y: 6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.97 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        style={{
          background: 'white',
          borderRadius: '14px 14px 14px 4px',
          padding: '10px 14px',
          boxShadow: '0 4px 20px rgba(80,78,118,0.15)',
          border: '1px solid rgba(196,195,227,0.4)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          maxWidth: 280,
        }}
      >
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontStyle: 'italic',
          fontSize: 13,
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

// ─── Hook for phrase state ────────────────────────────────────────
export function useFairyPhrase(contextPhrase?: Phrase) {
  const [idx, setIdx] = useState(0)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (contextPhrase) return
    ref.current = setInterval(() => setIdx(i => (i + 1) % PHRASES.length), 6000)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [contextPhrase])
  return contextPhrase ?? PHRASES[idx]
}

// ─── Wand tip coordinates (in the 160×220 viewBox) ───────────────
const WX = 150  // wand star tip x
const WY = 62   // wand star tip y
const SPARKLE_DEFS = [
  { color: '#FF6B9D', dx: 14,  dy: -10, r: 3.0, dur: 1.4, delay: 0    },
  { color: '#6EC6FF', dx: -10, dy: -14, r: 2.5, dur: 1.6, delay: 0.3  },
  { color: '#FFD700', dx: 18,  dy: 6,   r: 2.8, dur: 1.2, delay: 0.55 },
  { color: '#C77DFF', dx: -14, dy: 4,   r: 2.2, dur: 1.5, delay: 0.8  },
  { color: '#A3B565', dx: 6,   dy: 16,  r: 2.0, dur: 1.8, delay: 1.05 },
]

// ─── Fairy SVG (viewBox 0 0 160 220) ─────────────────────────────
function FairySvg() {
  return (
    <svg width="160" height="220" viewBox="0 0 160 220" fill="none" overflow="visible">
      <defs>
        <linearGradient id="df-hair" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#FF2D87"/>
          <stop offset="55%"  stopColor="#D42BA0"/>
          <stop offset="100%" stopColor="#7B2FFF"/>
        </linearGradient>
        <linearGradient id="df-hair2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#FF6EC7"/>
          <stop offset="100%" stopColor="#AB52FF"/>
        </linearGradient>
        <linearGradient id="df-dress" x1="0%" y1="0%" x2="20%" y2="100%">
          <stop offset="0%"   stopColor="#8B5CF6"/>
          <stop offset="50%"  stopColor="#6D28D9"/>
          <stop offset="100%" stopColor="#4C1D95"/>
        </linearGradient>
        <linearGradient id="df-dress-shimmer" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.18)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </linearGradient>
        <linearGradient id="df-wing-l" x1="100%" y1="30%" x2="0%" y2="70%">
          <stop offset="0%"   stopColor="rgba(196,180,255,0.65)"/>
          <stop offset="100%" stopColor="rgba(240,200,255,0.2)"/>
        </linearGradient>
        <linearGradient id="df-wing-r" x1="0%" y1="30%" x2="100%" y2="70%">
          <stop offset="0%"   stopColor="rgba(255,180,230,0.65)"/>
          <stop offset="100%" stopColor="rgba(200,180,255,0.2)"/>
        </linearGradient>
        <linearGradient id="df-wing-lo" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="rgba(180,120,255,0.55)"/>
          <stop offset="100%" stopColor="rgba(255,200,255,0.15)"/>
        </linearGradient>
        <linearGradient id="df-wing-ro" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="rgba(255,120,200,0.55)"/>
          <stop offset="100%" stopColor="rgba(200,180,255,0.15)"/>
        </linearGradient>
        <radialGradient id="df-skin" cx="48%" cy="42%" r="52%">
          <stop offset="0%"   stopColor="#FFE8CE"/>
          <stop offset="100%" stopColor="#F5C9A0"/>
        </radialGradient>
        <radialGradient id="df-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(255,220,80,0.55)"/>
          <stop offset="100%" stopColor="rgba(255,220,80,0)"/>
        </radialGradient>
      </defs>

      {/* ══ WINGS — animated (left group, pivot at right/center) ═══ */}
      <motion.g
        style={{ transformOrigin: '80px 138px' }}
        animate={{ scaleX: [1, 0.09, 1] }}
        transition={{ duration: 0.68, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
      >
        {/* left upper wing */}
        <path d="M80 128 C58 108 28 92 18 66 C10 42 34 36 55 52 C65 60 74 76 80 96 Z"
              fill="url(#df-wing-l)" stroke="rgba(196,150,255,0.5)" strokeWidth="0.8"/>
        {/* wing vein detail */}
        <path d="M80 128 C68 110 42 98 30 76" stroke="rgba(200,160,255,0.35)" strokeWidth="0.8" fill="none"/>
        <path d="M80 128 C72 112 55 103 44 90" stroke="rgba(200,160,255,0.25)" strokeWidth="0.6" fill="none"/>
        {/* left lower wing */}
        <path d="M80 148 C55 155 26 162 20 178 C14 194 36 198 58 188 C68 184 76 170 80 160 Z"
              fill="url(#df-wing-lo)" stroke="rgba(196,120,255,0.4)" strokeWidth="0.7"/>
      </motion.g>

      <motion.g
        style={{ transformOrigin: '80px 138px' }}
        animate={{ scaleX: [1, 0.09, 1] }}
        transition={{ duration: 0.68, repeat: Infinity, ease: [0.4, 0, 0.6, 1], delay: 0.02 }}
      >
        {/* right upper wing */}
        <path d="M80 128 C102 108 132 92 142 66 C150 42 126 36 105 52 C95 60 86 76 80 96 Z"
              fill="url(#df-wing-r)" stroke="rgba(255,160,230,0.5)" strokeWidth="0.8"/>
        {/* wing vein detail */}
        <path d="M80 128 C92 110 118 98 130 76" stroke="rgba(255,180,230,0.35)" strokeWidth="0.8" fill="none"/>
        {/* right lower wing */}
        <path d="M80 148 C105 155 134 162 140 178 C146 194 124 198 102 188 C92 184 84 170 80 160 Z"
              fill="url(#df-wing-ro)" stroke="rgba(255,140,220,0.4)" strokeWidth="0.7"/>
      </motion.g>

      {/* ══ DRESS / GOWN ══════════════════════════════════════════ */}
      <path d="M60 128 Q52 162 46 215 Q63 218 80 218 Q97 218 114 215 Q108 162 100 128 Z"
            fill="url(#df-dress)"/>
      {/* Shimmer overlay on dress */}
      <path d="M60 128 Q55 155 50 185 Q63 192 80 192 Q65 165 64 128 Z"
            fill="url(#df-dress-shimmer)"/>
      {/* Sequin dots */}
      {([
        [66,142],[78,138],[90,143],[70,155],[84,151],[94,158],
        [62,167],[76,164],[90,170],[68,180],[82,177],[96,182],
        [72,192],[86,190],[100,195],
      ] as [number,number][]).map(([cx,cy],i) => (
        <motion.circle key={i} cx={cx} cy={cy} r="1.8"
          fill="rgba(255,255,255,0.55)"
          animate={{ opacity:[0.3,0.9,0.3], r:[1.5,2.1,1.5] }}
          transition={{ duration:2+i*0.1, repeat:Infinity, delay:i*0.12 }}/>
      ))}
      {/* Waist / bodice band */}
      <path d="M62 118 Q58 126 60 128 L100 128 Q102 126 98 118 Z" fill="#5B21B6"/>
      {/* Belt gem */}
      <circle cx="80" cy="123" r="4" fill="#FFD700"/>
      <circle cx="80" cy="122" r="1.8" fill="rgba(255,255,255,0.7)"/>

      {/* ══ HEAD (oval — fashion proportions) ══════════════════════ */}
      <ellipse cx="80" cy="90" rx="28" ry="33" fill="url(#df-skin)"/>
      {/* Jaw/chin softening */}
      <ellipse cx="80" cy="113" rx="18" ry="10" fill="url(#df-skin)"/>

      {/* ══ BIG HAIR ═══════════════════════════════════════════════ */}
      {/* Left mega puff */}
      <ellipse cx="46" cy="76" rx="24" ry="30" fill="#FF2D87"/>
      {/* Right mega puff */}
      <ellipse cx="114" cy="76" rx="24" ry="30" fill="#7B2FFF"/>
      {/* Center volume base */}
      <ellipse cx="80" cy="60" rx="38" ry="30" fill="url(#df-hair)"/>
      {/* Top dramatic height */}
      <ellipse cx="80" cy="38" rx="28" ry="22" fill="#FF2D87"/>
      <ellipse cx="66" cy="30" rx="16" ry="14" fill="#D42BA0"/>
      <ellipse cx="94" cy="30" rx="16" ry="14" fill="#8B2FE0"/>
      {/* Crown poof */}
      <ellipse cx="80" cy="22" rx="18" ry="12" fill="#FF6EC7"/>
      {/* Hair highlights (volume suggestion) */}
      <ellipse cx="68" cy="34" rx="9" ry="10" fill="rgba(255,180,220,0.38)"/>
      <ellipse cx="92" cy="34" rx="9" ry="10" fill="rgba(180,120,255,0.38)"/>
      <ellipse cx="80" cy="26" rx="8" ry="6"  fill="rgba(255,255,255,0.18)"/>
      {/* Side hair wisps */}
      <ellipse cx="34" cy="88" rx="14" ry="18" fill="#FF2D87" opacity=".75"/>
      <ellipse cx="126" cy="88" rx="14" ry="18" fill="#7B2FFF" opacity=".75"/>

      {/* ══ CROWN ══════════════════════════════════════════════════ */}
      {/* Crown band */}
      <path d="M56 63 Q80 59 104 63 L103 69 Q80 65 57 69 Z" fill="#FFD700"/>
      {/* Crown points (5 points) */}
      <path d="M57 63 L60 50 L67 60 L74 44 L80 58 L86 44 L93 60 L100 50 L103 63 Z"
            fill="#FFD700" stroke="#E8C000" strokeWidth="0.8" strokeLinejoin="round"/>
      {/* Crown inner fill (depth) */}
      <path d="M57 63 L60 50 L67 60 L80 58 Z" fill="#C89A00" opacity=".3"/>
      {/* Crown gems */}
      <ellipse cx="80" cy="47" rx="4.5" ry="3.5" fill="#FF6B9D"/>
      <ellipse cx="67" cy="56" rx="3.5" ry="3"   fill="#C77DFF"/>
      <ellipse cx="93" cy="56" rx="3.5" ry="3"   fill="#6EC6FF"/>
      {/* Gem highlights */}
      <circle cx="79" cy="46" r="1.5" fill="rgba(255,255,255,0.75)"/>
      <circle cx="66" cy="55" r="1.1" fill="rgba(255,255,255,0.6)"/>
      <circle cx="92" cy="55" r="1.1" fill="rgba(255,255,255,0.6)"/>

      {/* ══ EYEBROWS (arched, fierce) ══════════════════════════════ */}
      <path d="M52 81 Q60 76 68 79" stroke="#1A0A30" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <path d="M92 79 Q100 76 108 81" stroke="#1A0A30" strokeWidth="2.2" fill="none" strokeLinecap="round"/>

      {/* ══ EYE SHADOW (dramatic drag colors) ══════════════════════ */}
      {/* Left eye shadow — two-tone */}
      <ellipse cx="60" cy="86" rx="13" ry="9" fill="#9B27D0" opacity=".5"/>
      <ellipse cx="60" cy="88" rx="10" ry="6" fill="#FF2D87" opacity=".35"/>
      {/* Right eye shadow */}
      <ellipse cx="100" cy="86" rx="13" ry="9" fill="#9B27D0" opacity=".5"/>
      <ellipse cx="100" cy="88" rx="10" ry="6" fill="#FF2D87" opacity=".35"/>
      {/* Inner shimmer highlight */}
      <ellipse cx="56" cy="83" rx="5" ry="3" fill="rgba(255,200,255,0.4)"/>
      <ellipse cx="96" cy="83" rx="5" ry="3" fill="rgba(255,200,255,0.4)"/>

      {/* ══ EYES (almond — more fashion, less cartoon) ═════════════ */}
      {/* Left eye white */}
      <path d="M48 89 Q60 82 72 89 Q60 96 48 89 Z" fill="white"/>
      {/* Left iris */}
      <ellipse cx="60" cy="89" rx="6.5" ry="5.5" fill="#2D1A6B"/>
      <circle cx="60" cy="89" r="3.8" fill="#1A0840"/>
      {/* Left shine */}
      <ellipse cx="57.5" cy="86.5" rx="2.5" ry="2" fill="white"/>
      <circle cx="62" cy="90.5" r="1.1" fill="rgba(255,255,255,0.5)"/>
      {/* Right eye white */}
      <path d="M88 89 Q100 82 112 89 Q100 96 88 89 Z" fill="white"/>
      {/* Right iris */}
      <ellipse cx="100" cy="89" rx="6.5" ry="5.5" fill="#2D1A6B"/>
      <circle cx="100" cy="89" r="3.8" fill="#1A0840"/>
      {/* Right shine */}
      <ellipse cx="97.5" cy="86.5" rx="2.5" ry="2" fill="white"/>
      <circle cx="102" cy="90.5" r="1.1" fill="rgba(255,255,255,0.5)"/>

      {/* ══ LASHES (exaggerated drag queen) ════════════════════════ */}
      {/* Left top — 6 lashes */}
      <line x1="49" y1="87" x2="44" y2="80" stroke="#1A0840" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="53" y1="84" x2="49" y2="77" stroke="#1A0840" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="57" y1="83" x2="55" y2="75" stroke="#1A0840" strokeWidth="2.0" strokeLinecap="round"/>
      <line x1="61" y1="82.5" x2="61" y2="74" stroke="#1A0840" strokeWidth="2.0" strokeLinecap="round"/>
      <line x1="65" y1="83" x2="67" y2="76" stroke="#1A0840" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="69" y1="85" x2="73" y2="79" stroke="#1A0840" strokeWidth="1.6" strokeLinecap="round"/>
      {/* Left bottom — 3 lashes */}
      <line x1="51" y1="93" x2="49" y2="97" stroke="#1A0840" strokeWidth="1.0" strokeLinecap="round"/>
      <line x1="60" y1="94.5" x2="60" y2="99" stroke="#1A0840" strokeWidth="1.0" strokeLinecap="round"/>
      <line x1="69" y1="93" x2="71" y2="97" stroke="#1A0840" strokeWidth="1.0" strokeLinecap="round"/>
      {/* Right top — 6 lashes */}
      <line x1="91" y1="85" x2="87" y2="79" stroke="#1A0840" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="95" y1="83" x2="93" y2="76" stroke="#1A0840" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="99" y1="82.5" x2="99" y2="74" stroke="#1A0840" strokeWidth="2.0" strokeLinecap="round"/>
      <line x1="103" y1="83" x2="105" y2="75" stroke="#1A0840" strokeWidth="2.0" strokeLinecap="round"/>
      <line x1="107" y1="84" x2="111" y2="77" stroke="#1A0840" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="111" y1="87" x2="116" y2="80" stroke="#1A0840" strokeWidth="1.6" strokeLinecap="round"/>
      {/* Right bottom */}
      <line x1="91" y1="93" x2="89" y2="97" stroke="#1A0840" strokeWidth="1.0" strokeLinecap="round"/>
      <line x1="100" y1="94.5" x2="100" y2="99" stroke="#1A0840" strokeWidth="1.0" strokeLinecap="round"/>
      <line x1="109" y1="93" x2="111" y2="97" stroke="#1A0840" strokeWidth="1.0" strokeLinecap="round"/>

      {/* ══ NOSE (subtle) ══════════════════════════════════════════ */}
      <path d="M77 104 Q80 108 83 104" stroke="rgba(210,150,100,0.4)" strokeWidth="1.4" fill="none" strokeLinecap="round"/>

      {/* ══ LIPS (full, bold, drag) ═════════════════════════════════ */}
      {/* Lower lip */}
      <path d="M66 113 Q72 120 80 121 Q88 120 94 113 Q88 118 80 119 Q72 118 66 113 Z" fill="#E0106A"/>
      {/* Upper lip */}
      <path d="M66 113 Q72 108 80 110 Q88 108 94 113 Q88 111 80 112 Q72 111 66 113 Z" fill="#FF2D87"/>
      {/* Cupid's bow highlight */}
      <path d="M72 111 Q76 109 80 110 Q84 109 88 111" stroke="rgba(255,255,255,0.25)" strokeWidth="1" fill="none" strokeLinecap="round"/>
      {/* Lip shine */}
      <ellipse cx="80" cy="110" rx="6" ry="1.5" fill="rgba(255,255,255,0.28)"/>

      {/* ══ BLUSH ══════════════════════════════════════════════════ */}
      <circle cx="48" cy="100" r="11" fill="rgba(255,120,165,0.22)"/>
      <circle cx="112" cy="100" r="11" fill="rgba(255,120,165,0.22)"/>

      {/* ══ NECK ════════════════════════════════════════════════════ */}
      <rect x="70" y="118" width="20" height="14" rx="5" fill="#F5C9A0"/>

      {/* ══ COLLAR SPARKLES ════════════════════════════════════════ */}
      <circle cx="73" cy="130" r="3" fill="rgba(255,210,100,0.75)"/>
      <circle cx="80" cy="128" r="3.5" fill="rgba(200,180,255,0.75)"/>
      <circle cx="87" cy="130" r="3" fill="rgba(110,200,255,0.75)"/>

      {/* ══ ARM + WAND ══════════════════════════════════════════════ */}
      {/* Upper arm */}
      <path d="M98 125 Q116 118 128 106" stroke="#F5C9A0" strokeWidth="14" strokeLinecap="round" fill="none"/>
      {/* Wand stick glow */}
      <line x1="122" y1="110" x2={WX} y2={WY} stroke="rgba(255,220,60,0.28)" strokeWidth="9" strokeLinecap="round"/>
      {/* Wand stick */}
      <line x1="122" y1="110" x2={WX} y2={WY} stroke="#C89A00" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Wand star glow */}
      <circle cx={WX} cy={WY} r="16" fill="url(#df-glow)"/>
      {/* Wand star */}
      <path d={`
        M${WX} ${WY-14}
        L${WX+3.3} ${WY-4.8} L${WX+13.3} ${WY-4.8}
        L${WX+5.4} ${WY+1.8} L${WX+8.2} ${WY+12}
        L${WX} ${WY+6} L${WX-8.2} ${WY+12}
        L${WX-5.4} ${WY+1.8} L${WX-13.3} ${WY-4.8}
        L${WX-3.3} ${WY-4.8} Z
      `} fill="#FFD700" stroke="#E8C000" strokeWidth="0.8"/>
      {/* Star center shine */}
      <circle cx={WX} cy={WY} r="5" fill="rgba(255,255,255,0.65)"/>

      {/* ══ WAND SPARKLE TRAIL (animated) ══════════════════════════ */}
      {SPARKLE_DEFS.map((s, i) => (
        <motion.circle key={i}
          cx={WX} cy={WY} r={s.r}
          fill={s.color}
          animate={{
            cx: [WX, WX + s.dx, WX + s.dx * 1.6],
            cy: [WY, WY + s.dy, WY + s.dy * 1.6],
            opacity: [0, 1, 0],
            r: [0, s.r, 0],
          }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: 'easeOut' }}
        />
      ))}
      {/* Extra mini sparkle dots */}
      <motion.circle cx={WX+8} cy={WY-18} r="1.8" fill="#FF6B9D"
        animate={{ opacity:[0,1,0], scale:[0,1.4,0] }}
        transition={{ duration:1.1, repeat:Infinity, delay:0.15 }}/>
      <motion.circle cx={WX-18} cy={WY+2} r="1.5" fill="#6EC6FF"
        animate={{ opacity:[0,1,0], scale:[0,1.3,0] }}
        transition={{ duration:1.3, repeat:Infinity, delay:0.7 }}/>
      <motion.circle cx={WX+4} cy={WY+18} r="1.6" fill="#FFD700"
        animate={{ opacity:[0,1,0], scale:[0,1.2,0] }}
        transition={{ duration:1.0, repeat:Infinity, delay:1.1 }}/>
    </svg>
  )
}

// ─── Main export ──────────────────────────────────────────────────
export function DragFairy({ size = 160 }: { size?: number }) {
  const scale = size / 160
  return (
    <motion.div
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: 3.8, ease: 'easeInOut', repeat: Infinity }}
      style={{ display: 'inline-block', flexShrink: 0,
        width: 160 * scale, height: 220 * scale,
        transform: `scale(${scale})`, transformOrigin: 'bottom center' }}
    >
      <FairySvg />
    </motion.div>
  )
}
