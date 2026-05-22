import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────
export type EmojiType = 'crown' | 'sparkle' | 'flame' | 'diamond' | 'warning'
export interface Phrase { text: string; emoji: EmojiType }

// ─── Custom SVG Emojis ────────────────────────────────────────────
function SvgCrown() {
  return (
    <svg width="14" height="11" viewBox="0 0 20 16" fill="none"
      style={{ display:'inline-block', verticalAlign:'middle', marginLeft:4, flexShrink:0 }}>
      <path d="M1 13 L4 4 L8.5 8.5 L10 1 L11.5 8.5 L16 4 L19 13 Z" fill="#FFD700"/>
      <rect x="1" y="13" width="18" height="2.2" rx="1" fill="#E8C000"/>
      <circle cx="10" cy="2"  r="2.2" fill="#FF6B9D"/>
      <circle cx="4"  cy="7" r="1.6" fill="#C77DFF"/>
      <circle cx="16" cy="7" r="1.6" fill="#6EC6FF"/>
    </svg>
  )
}
function SvgSparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none"
      style={{ display:'inline-block', verticalAlign:'middle', marginLeft:4, flexShrink:0 }}>
      <path d="M10 1 L11.5 7.5 L18 9 L11.5 10.5 L10 17 L8.5 10.5 L2 9 L8.5 7.5 Z" fill="#FFD700"/>
      <circle cx="3.5"  cy="3"    r="1.5" fill="#FF6B9D" opacity=".85"/>
      <circle cx="16.5" cy="3.5"  r="1.2" fill="#C77DFF" opacity=".8"/>
      <circle cx="16"   cy="16.5" r="1.4" fill="#6EC6FF" opacity=".8"/>
    </svg>
  )
}
function SvgFlame() {
  return (
    <svg width="12" height="16" viewBox="0 0 14 20" fill="none"
      style={{ display:'inline-block', verticalAlign:'middle', marginLeft:4, flexShrink:0 }}>
      <path d="M7 1 C9 5 13 7 13 13 C13 17.5 10.3 20 7 20 C3.7 20 1 17.5 1 13 C1 7 5 5 7 1Z" fill="#FF6B35"/>
      <path d="M7 9 C9 11.5 9.5 15 9 17 C8.3 19 5.7 19 5 17 C4.5 15 5 11.5 7 9Z" fill="#FFD93D"/>
    </svg>
  )
}
function SvgDiamond() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none"
      style={{ display:'inline-block', verticalAlign:'middle', marginLeft:4, flexShrink:0 }}>
      <path d="M4 7 L10 2 L16 7 L10 18 Z" fill="#6EC6FF"/>
      <path d="M4 7 L10 7 L10 18 Z" fill="#0090D0" opacity=".5"/>
      <path d="M10 2 L16 7 L10 7 L14 4.5 Z" fill="#A8E4FF"/>
    </svg>
  )
}
function SvgWarning() {
  return (
    <svg width="14" height="13" viewBox="0 0 20 18" fill="none"
      style={{ display:'inline-block', verticalAlign:'middle', marginLeft:4, flexShrink:0 }}>
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
        initial={{ opacity: 0, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{
          background: 'white',
          borderRadius: '12px 12px 4px 12px',
          padding: '9px 12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
          border: '1px solid rgba(255,255,255,0.9)',
          width: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flexWrap: 'nowrap',
        }}
      >
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontStyle: 'italic',
          fontSize: 12,
          fontWeight: 600,
          color: '#2C1A0F',
          lineHeight: 1.35,
          flex: 1,
          minWidth: 0,
          wordBreak: 'break-word',
          whiteSpace: 'normal',
        }}>
          {phrase.text}
        </span>
        <EmojiIcon type={phrase.emoji} />
      </motion.div>
    </AnimatePresence>
  )
}

// ─── CSS keyframes para animações do SVG ─────────────────────────
const FAIRY_CSS = `
  @keyframes dfFlapL {
    0%,100% { transform: scaleY(1);    }
    40%,60% { transform: scaleY(0.06); }
  }
  @keyframes dfFlapR {
    0%,100% { transform: scaleY(1);    }
    40%,60% { transform: scaleY(0.06); }
  }
  /* Varinha: lento, multi-step, y+rotate natural — 5.5s */
  @keyframes dfWand {
    0%   { transform: rotate(-5deg) translateY(0px); }
    18%  { transform: rotate(4deg)  translateY(-3px); }
    35%  { transform: rotate(-3deg) translateY(2px);  }
    52%  { transform: rotate(7deg)  translateY(-4px); }
    70%  { transform: rotate(-4deg) translateY(1px);  }
    85%  { transform: rotate(5deg)  translateY(-2px); }
    100% { transform: rotate(-5deg) translateY(0px);  }
  }
  /* Pó mágico: opacity+translate (sem scale que causava bug de interpolação) */
  @keyframes dfDust1 { 0%{opacity:0;transform:translate(0,0)}   22%{opacity:.9;transform:translate(6px,4px)}   100%{opacity:0;transform:translate(16px,12px)} }
  @keyframes dfDust2 { 0%{opacity:0;transform:translate(0,0)}   22%{opacity:.85;transform:translate(-4px,5px)} 100%{opacity:0;transform:translate(-11px,14px)} }
  @keyframes dfDust3 { 0%{opacity:0;transform:translate(0,0)}   22%{opacity:.9;transform:translate(7px,-2px)}  100%{opacity:0;transform:translate(18px,-7px)} }
  @keyframes dfDust4 { 0%{opacity:0;transform:translate(0,0)}   22%{opacity:.8;transform:translate(-5px,3px)}  100%{opacity:0;transform:translate(-13px,8px)} }
  @keyframes dfDust5 { 0%{opacity:0;transform:translate(0,0)}   22%{opacity:.85;transform:translate(3px,6px)}  100%{opacity:0;transform:translate(8px,16px)} }
  @keyframes dfDust6 { 0%{opacity:0;transform:translate(0,0)}   22%{opacity:.75;transform:translate(-2px,-4px)} 100%{opacity:0;transform:translate(-6px,-12px)} }

  .df-wing-l { transform-box:fill-box; transform-origin:right center; animation:dfFlapL 0.42s ease-in-out infinite; }
  .df-wing-r { transform-box:fill-box; transform-origin:left center;  animation:dfFlapR 0.42s ease-in-out infinite 0.02s; }
  .df-wand-g { transform-box:fill-box; transform-origin:73px 46px;    animation:dfWand  5.5s ease-in-out infinite; }
  .df-dust-1 { animation:dfDust1 1.4s ease-out infinite; }
  .df-dust-2 { animation:dfDust2 1.6s ease-out infinite 0.3s; }
  .df-dust-3 { animation:dfDust3 1.3s ease-out infinite 0.6s; }
  .df-dust-4 { animation:dfDust4 1.7s ease-out infinite 0.9s; }
  .df-dust-5 { animation:dfDust5 1.5s ease-out infinite 1.2s; }
  .df-dust-6 { animation:dfDust6 1.2s ease-out infinite 0.45s; }
`

// ─── Fairy SVG — pose de voo horizontal (viewBox 0 0 110 80) ─────
function FairySvg() {
  return (
    <svg width="110" height="80" viewBox="0 0 110 80" fill="none" overflow="visible">
      <defs>
        <style>{FAIRY_CSS}</style>
        <linearGradient id="df-wl"  x1="100%" y1="50%" x2="0%"   y2="0%">
          <stop offset="0%"   stopColor="rgba(200,180,255,0.75)"/>
          <stop offset="100%" stopColor="rgba(230,210,255,0.18)"/>
        </linearGradient>
        <linearGradient id="df-wll" x1="100%" y1="50%" x2="0%"   y2="100%">
          <stop offset="0%"   stopColor="rgba(180,140,255,0.7)"/>
          <stop offset="100%" stopColor="rgba(255,180,240,0.15)"/>
        </linearGradient>
        <linearGradient id="df-wr"  x1="0%"   y1="50%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="rgba(255,180,230,0.6)"/>
          <stop offset="100%" stopColor="rgba(210,190,255,0.15)"/>
        </linearGradient>
        <linearGradient id="df-dress" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#8B5CF6"/>
          <stop offset="100%" stopColor="#5B21B6"/>
        </linearGradient>
        <linearGradient id="df-hair" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#FF2D87"/>
          <stop offset="100%" stopColor="#8B2FFF"/>
        </linearGradient>
        <radialGradient id="df-skin" cx="48%" cy="42%" r="52%">
          <stop offset="0%"   stopColor="#FFE8CE"/>
          <stop offset="100%" stopColor="#F5C9A0"/>
        </radialGradient>
        <radialGradient id="df-starglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(255,230,80,0.8)"/>
          <stop offset="100%" stopColor="rgba(255,230,80,0)"/>
        </radialGradient>
      </defs>

      {/* ── ASAS ESQUERDA (animadas com CSS class) ─────────────── */}
      <g className="df-wing-l">
        {/* Upper left wing */}
        <path d="M54 44 C36 36 10 18 6 6 C2 -4 26 0 42 20 C48 28 52 36 54 44 Z"
              fill="url(#df-wl)" stroke="rgba(200,170,255,0.6)" strokeWidth="0.7"/>
        {/* Wing vein */}
        <path d="M54 44 C38 36 16 20 8 8" stroke="rgba(200,160,255,0.28)" strokeWidth="0.6" fill="none"/>
        {/* Lower left wing */}
        <path d="M54 48 C32 55 8 64 6 74 C4 82 28 80 46 68 C51 64 53 56 54 48 Z"
              fill="url(#df-wll)" stroke="rgba(180,130,255,0.5)" strokeWidth="0.6"/>
      </g>

      {/* ── VESTIDO / CORPO ─────────────────────────────────────── */}
      {/* Cauda fluindo atrás (efeito vento) */}
      <path d="M56 50 C42 56 20 62 14 56 C8 50 24 40 46 44 Z"
            fill="#6D28D9" opacity="0.45"/>
      {/* Corpo oval */}
      <ellipse cx="58" cy="47" rx="15" ry="9.5" transform="rotate(-18 58 47)" fill="url(#df-dress)"/>
      {/* Shimmer */}
      <ellipse cx="51" cy="43" rx="7" ry="4" transform="rotate(-18 51 43)" fill="rgba(255,255,255,0.16)"/>
      {/* Sequins — estáticos para performance */}
      <circle cx="50" cy="50" r="1.4" fill="rgba(255,255,255,0.55)"/>
      <circle cx="56" cy="52" r="1.2" fill="rgba(255,255,255,0.45)"/>
      <circle cx="44" cy="50" r="1.0" fill="rgba(255,200,255,0.5)"/>
      <circle cx="59" cy="46" r="1.1" fill="rgba(255,255,255,0.4)"/>
      <circle cx="48" cy="46" r="0.9" fill="rgba(255,255,255,0.45)"/>

      {/* ── CABEÇA ──────────────────────────────────────────────── */}
      <circle cx="74" cy="30" r="14" fill="url(#df-skin)"/>

      {/* ── CABELO ──────────────────────────────────────────────── */}
      <ellipse cx="74" cy="20" rx="13" ry="9" fill="url(#df-hair)"/>
      <ellipse cx="63" cy="24" rx="9"  ry="11" fill="#FF2D87"/>
      <ellipse cx="85" cy="22" rx="8"  ry="9"  fill="#8B2FFF"/>
      <ellipse cx="74" cy="17" rx="9"  ry="7"  fill="#FF6EC7"/>
      <ellipse cx="70" cy="16" rx="4"  ry="3.5" fill="rgba(255,255,255,0.2)"/>

      {/* ── COROA ───────────────────────────────────────────────── */}
      <path d="M66 19 L68.5 13 L72 16.5 L74 10.5 L76 16.5 L79.5 13 L82 19 Z"
            fill="#FFD700" stroke="#E8C000" strokeWidth="0.6" strokeLinejoin="round"/>
      <rect x="66" y="19" width="16" height="2" rx="0.8" fill="#FFD700"/>
      <circle cx="74" cy="12" r="2"   fill="#FF6B9D"/>
      <circle cx="68.5" cy="15" r="1.4" fill="#6EC6FF"/>
      <circle cx="79.5" cy="15" r="1.4" fill="#C77DFF"/>
      <circle cx="73.2" cy="11.5" r="0.8" fill="rgba(255,255,255,0.75)"/>

      {/* ── SOMBRA DOS OLHOS ─────────────────────────────────────── */}
      <ellipse cx="69.5" cy="27.5" rx="5"   ry="3"   fill="#9B27D0" opacity=".38"/>
      <ellipse cx="78.5" cy="26"   rx="4.5" ry="2.8" fill="#9B27D0" opacity=".38"/>

      {/* ── OLHOS (amendoados) ───────────────────────────────────── */}
      <path d="M64.5 29 Q70 23.5 75.5 29 Q70 34 64.5 29 Z" fill="white"/>
      <ellipse cx="70" cy="29" rx="4" ry="3.5" fill="#1A0840"/>
      <circle  cx="70" cy="29" r="2.3" fill="#0A0420"/>
      <ellipse cx="68.5" cy="27" rx="1.6" ry="1.3" fill="white"/>

      <path d="M73 27.5 Q78.5 22 84 27.5 Q78.5 32.5 73 27.5 Z" fill="white"/>
      <ellipse cx="78.5" cy="27.5" rx="4" ry="3.5" fill="#1A0840"/>
      <circle  cx="78.5" cy="27.5" r="2.3" fill="#0A0420"/>
      <ellipse cx="77"   cy="25.5" rx="1.6" ry="1.3" fill="white"/>

      {/* ── CÍLIOS ───────────────────────────────────────────────── */}
      <line x1="65"  y1="26.5" x2="63"  y2="23.5" stroke="#1A0840" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="68.5" y1="24.5" x2="68" y2="21"   stroke="#1A0840" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="72"  y1="25"   x2="73"  y2="21.5" stroke="#1A0840" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="74"  y1="23.5" x2="76"  y2="20.5" stroke="#1A0840" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="78"  y1="23.5" x2="80"  y2="21"   stroke="#1A0840" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="82"  y1="25"   x2="84"  y2="22.5" stroke="#1A0840" strokeWidth="1.2" strokeLinecap="round"/>

      {/* ── NARIZ ────────────────────────────────────────────────── */}
      <path d="M73 34 Q74.2 36.5 75.4 34" stroke="rgba(200,140,90,0.38)" strokeWidth="1.1" fill="none" strokeLinecap="round"/>

      {/* ── SORRISO ──────────────────────────────────────────────── */}
      <path d="M69.5 38 Q74 42 78.5 38" stroke="#E91E8C" strokeWidth="1.7" fill="none" strokeLinecap="round"/>

      {/* ── BLUSH ────────────────────────────────────────────────── */}
      <circle cx="65.5" cy="34.5" r="5.5" fill="rgba(255,120,165,0.22)"/>
      <circle cx="82.5" cy="33"   r="5.5" fill="rgba(255,120,165,0.22)"/>

      {/* ── PESCOÇO ──────────────────────────────────────────────── */}
      <rect x="69" y="41" width="9" height="8" rx="3.5" fill="#F5C9A0"/>

      {/* ── ASA DIREITA (atrás do corpo) ─────────────────────────── */}
      <g className="df-wing-r">
        <path d="M58 42 C70 32 90 20 93 26 C96 32 80 46 62 52 C59 53 57 48 58 42 Z"
              fill="url(#df-wr)" stroke="rgba(255,180,230,0.45)" strokeWidth="0.6"/>
      </g>

      {/* ── BRAÇO + VARINHA (oscilação via CSS) ───────────────────── */}
      <g className="df-wand-g">
        {/* Braço */}
        <path d="M78 43 Q90 35 98 22" stroke="#F5C9A0" strokeWidth="8" strokeLinecap="round" fill="none"/>
        {/* Brilho do cabo */}
        <line x1="94" y1="24" x2="104" y2="10" stroke="rgba(255,220,60,0.3)" strokeWidth="7" strokeLinecap="round"/>
        {/* Cabo */}
        <line x1="94" y1="24" x2="104" y2="10" stroke="#C89A00" strokeWidth="2.8" strokeLinecap="round"/>
        {/* Halo da estrela */}
        <circle cx="104" cy="10" r="12" fill="url(#df-starglow)"/>
        {/* Estrela da varinha */}
        <path d="M104 1 L106.5 7.5 L113.5 7.5 L108 11.5 L110.5 18 L104 14 L97.5 18 L100 11.5 L94.5 7.5 L101.5 7.5 Z"
              fill="#FFD700" stroke="#E8C000" strokeWidth="0.7"/>
        <circle cx="104" cy="10" r="4" fill="rgba(255,255,255,0.7)"/>
      </g>

      {/* ── PÓ MÁGICO — fora do grupo rotacionado ─────────────────── */}
      {/* As partículas saem da ponta aproximada da varinha (104,10) */}
      <circle className="df-dust-1" cx="104" cy="10" r="3"   fill="#FF6B9D"/>
      <circle className="df-dust-2" cx="104" cy="10" r="2.5" fill="#FFD700"/>
      <circle className="df-dust-3" cx="104" cy="10" r="2.2" fill="#6EC6FF"/>
      <circle className="df-dust-4" cx="104" cy="10" r="2.8" fill="#C77DFF"/>
      <circle className="df-dust-5" cx="104" cy="10" r="2"   fill="#A3B565"/>
      <circle className="df-dust-6" cx="104" cy="10" r="2.4" fill="#FF6B35"/>
    </svg>
  )
}

// ─── Export principal ─────────────────────────────────────────────
// Renderize dentro de um motion.div no Dashboard para o percurso de voo
export function DragFairy() {
  return (
    <motion.div
      animate={{
        y: [0, -5, 2, -7, 1, -4, 0],
        rotate: [-1.5, 1, -2.5, 1.5, -1, 2, -1.5],
      }}
      transition={{
        duration: 5, ease: 'easeInOut', repeat: Infinity,
        times: [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1],
      }}
      style={{
        display: 'inline-block',
        filter: 'drop-shadow(0 8px 16px rgba(139,92,246,0.35))',
      }}
    >
      <FairySvg />
    </motion.div>
  )
}
