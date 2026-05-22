import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────
export type EmojiType = 'crown' | 'sparkle' | 'flame' | 'diamond' | 'warning'

export interface Phrase {
  text: string
  emoji: EmojiType
}

// ─── Rotative phrases ─────────────────────────────────────────────
const PHRASES: Phrase[] = [
  { text: 'Economiza teu dinheiro, mulher!', emoji: 'sparkle' },
  { text: 'A viagem pra Europa está mais perto, baby!', emoji: 'diamond' },
  { text: 'Controle financeiro é glamour, bestie!', emoji: 'crown' },
  { text: 'Cada real economizado é um passo pra liberdade, dragging!', emoji: 'sparkle' },
  { text: 'A Lady Gaga ficaria feliz com seus gastos recentes?', emoji: 'warning' },
]

// ─── Custom SVG Emojis ────────────────────────────────────────────
function SvgCrown() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <path d="M1.5 10.5 L2.5 4.5 L5.5 7.5 L7 2.5 L8.5 7.5 L11.5 4.5 L12.5 10.5 Z" fill="#FFD700" stroke="#E6B800" strokeWidth="0.4" strokeLinejoin="round"/>
      <rect x="1.5" y="10.5" width="11" height="1.5" rx="0.5" fill="#FFD700" stroke="#E6B800" strokeWidth="0.3"/>
      <circle cx="4.5" cy="10.8" r="0.8" fill="#E91E8C"/>
      <circle cx="7" cy="10.8" r="0.8" fill="#00BCD4"/>
      <circle cx="9.5" cy="10.8" r="0.8" fill="#9C27B0"/>
    </svg>
  )
}

function SvgSparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <path d="M7 1 L7.7 5.3 L12 7 L7.7 8.7 L7 13 L6.3 8.7 L2 7 L6.3 5.3 Z" fill="#FFD700" stroke="#E6B800" strokeWidth="0.3" strokeLinejoin="round"/>
      <circle cx="2" cy="2" r="0.9" fill="#E91E8C"/>
      <circle cx="12" cy="2.5" r="0.7" fill="#00BCD4"/>
      <circle cx="11.5" cy="12" r="0.8" fill="#9C27B0"/>
    </svg>
  )
}

function SvgFlame() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <path d="M7 13 C3.5 13 1.5 10.5 2 7.5 C2.3 5.5 4 4 4 4 C4 6 5 6.5 5.5 5.5 C6.5 3.5 6 1.5 7 1 C8 3 7.5 5 9 4 C9 4 11 5.5 11.5 7.5 C12 10 10.5 13 7 13 Z" fill="#FF5722"/>
      <path d="M7 12 C5 12 3.8 10.5 4.2 8.5 C4.5 7 6 6 6.5 5.5 C6.3 7 7.2 7.5 7.8 7 C8.5 6.5 8.5 5.5 9 5 C10 6 10.5 7.5 10 9 C9.5 11 8.5 12 7 12 Z" fill="#FFC107"/>
    </svg>
  )
}

function SvgDiamond() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <path d="M7 1.5 L12.5 5.5 L7 12.5 L1.5 5.5 Z" fill="#29B6F6" stroke="#0288D1" strokeWidth="0.4" strokeLinejoin="round"/>
      <path d="M1.5 5.5 L7 5.5 L7 12.5 Z" fill="#0288D1" opacity="0.35"/>
      <path d="M7 5.5 L12.5 5.5 L7 12.5 Z" fill="#4FC3F7" opacity="0.4"/>
      <path d="M3.5 2.5 L7 1.5 L10.5 2.5 L7 5.5 Z" fill="#B3E5FC" opacity="0.7"/>
    </svg>
  )
}

function SvgWarning() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <path d="M7 1.5 L13 12.5 L1 12.5 Z" fill="#FF9800" stroke="#E65100" strokeWidth="0.4" strokeLinejoin="round"/>
      <rect x="6.4" y="5.5" width="1.2" height="4" rx="0.5" fill="white"/>
      <circle cx="7" cy="11" r="0.7" fill="white"/>
    </svg>
  )
}

function EmojiIcon({ type }: { type: EmojiType }) {
  switch (type) {
    case 'crown': return <SvgCrown />
    case 'sparkle': return <SvgSparkle />
    case 'flame': return <SvgFlame />
    case 'diamond': return <SvgDiamond />
    case 'warning': return <SvgWarning />
  }
}

// ─── Speech Bubble ────────────────────────────────────────────────
function SpeechBubble({ phrase }: { phrase: Phrase }) {
  return (
    <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8, zIndex: 10, minWidth: 200, maxWidth: 260 }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={phrase.text}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            padding: '10px 14px',
            boxShadow: '0 4px 20px rgba(44,26,15,0.13), 0 1px 4px rgba(44,26,15,0.07)',
            position: 'relative',
          }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontStyle: 'italic',
            fontSize: 13,
            color: '#2C1A0F',
            lineHeight: 1.45,
            margin: 0,
          }}>
            {phrase.text}{' '}
            <EmojiIcon type={phrase.emoji} />
          </p>
          {/* Bubble tail pointing down-left toward the fairy */}
          <div style={{
            position: 'absolute',
            bottom: -7,
            left: 28,
            width: 0,
            height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: '8px solid #FFFFFF',
            filter: 'drop-shadow(0 2px 2px rgba(44,26,15,0.08))',
          }} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Fairy SVG ────────────────────────────────────────────────────
function FairySvg({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 150 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      overflow="visible"
    >
      <defs>
        <linearGradient id="wingGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C084FC" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="#F9A8D4" stopOpacity="0.3"/>
        </linearGradient>
        <linearGradient id="wingGrad2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A855F7" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#EC4899" stopOpacity="0.25"/>
        </linearGradient>
        <linearGradient id="dressGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7B5EA7"/>
          <stop offset="100%" stopColor="#4B2D8B"/>
        </linearGradient>
        <linearGradient id="hairGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EC4899"/>
          <stop offset="100%" stopColor="#8B5CF6"/>
        </linearGradient>
        <radialGradient id="skinGrad" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFE5C8"/>
          <stop offset="100%" stopColor="#FDDCB8"/>
        </radialGradient>
      </defs>

      {/* ── 1. Wings (behind body) ── */}
      {/* Left upper wing */}
      <ellipse cx="38" cy="115" rx="34" ry="22" transform="rotate(-30 38 115)" fill="url(#wingGrad)" stroke="#C084FC" strokeWidth="0.7" opacity="0.85"/>
      {/* Left lower wing */}
      <ellipse cx="42" cy="142" rx="22" ry="14" transform="rotate(-15 42 142)" fill="url(#wingGrad2)" stroke="#A855F7" strokeWidth="0.5" opacity="0.7"/>
      {/* Right upper wing */}
      <ellipse cx="112" cy="115" rx="34" ry="22" transform="rotate(30 112 115)" fill="url(#wingGrad)" stroke="#C084FC" strokeWidth="0.7" opacity="0.85"/>
      {/* Right lower wing */}
      <ellipse cx="108" cy="142" rx="22" ry="14" transform="rotate(15 108 142)" fill="url(#wingGrad2)" stroke="#A855F7" strokeWidth="0.5" opacity="0.7"/>

      {/* ── 2. Dress/body ── */}
      <path d="M58 130 Q50 160 45 195 L105 195 Q100 160 92 130 Z" fill="url(#dressGrad)"/>
      {/* Sequin dots */}
      {[
        [62, 145], [75, 140], [88, 145], [68, 157], [82, 153],
        [58, 168], [75, 163], [92, 168], [65, 178], [85, 178],
        [72, 188], [95, 183],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.5" fill="rgba(255,255,255,0.55)"/>
      ))}
      {/* Waist/bodice */}
      <path d="M60 120 Q55 128 58 130 L92 130 Q95 128 90 120 Z" fill="#6A4F96"/>
      {/* Bodice sparkle details */}
      <circle cx="75" cy="124" r="1.2" fill="rgba(255,255,255,0.6)"/>
      <circle cx="68" cy="127" r="0.9" fill="rgba(255,255,255,0.45)"/>
      <circle cx="82" cy="127" r="0.9" fill="rgba(255,255,255,0.45)"/>

      {/* ── 3. Head ── */}
      <circle cx="75" cy="82" r="40" fill="url(#skinGrad)"/>

      {/* ── 4. Poofy hair ── */}
      {/* Top poof */}
      <ellipse cx="75" cy="50" rx="32" ry="20" fill="url(#hairGrad)"/>
      {/* Left poof */}
      <ellipse cx="44" cy="70" rx="18" ry="22" fill="#EC4899"/>
      {/* Right poof */}
      <ellipse cx="106" cy="70" rx="18" ry="22" fill="#8B5CF6"/>
      {/* Central top volume */}
      <ellipse cx="75" cy="48" rx="25" ry="16" fill="#F472B6"/>
      {/* Hair highlight */}
      <ellipse cx="75" cy="46" rx="14" ry="7" fill="rgba(255,255,255,0.2)"/>

      {/* ── 5. Crown ── */}
      <path d="M54 57 L58 46 L65 54 L75 40 L85 54 L92 46 L96 57 Z" fill="#FFD700" stroke="#E6B800" strokeWidth="0.8" strokeLinejoin="round"/>
      <rect x="54" y="57" width="42" height="5" rx="1.5" fill="#FFD700" stroke="#E6B800" strokeWidth="0.5"/>
      {/* Crown gems */}
      <circle cx="63" cy="59" r="2.2" fill="#E91E8C"/>
      <circle cx="75" cy="59" r="2.2" fill="#29B6F6"/>
      <circle cx="87" cy="59" r="2.2" fill="#9C27B0"/>
      {/* Crown sparkle highlights */}
      <circle cx="75" cy="43" r="1.2" fill="white" opacity="0.7"/>
      <circle cx="63" cy="48.5" r="0.8" fill="white" opacity="0.6"/>
      <circle cx="87" cy="48.5" r="0.8" fill="white" opacity="0.6"/>

      {/* ── 6. Eyeshadow ── */}
      <ellipse cx="61" cy="83" rx="12" ry="7" fill="#B879FF" opacity="0.55"/>
      <ellipse cx="89" cy="83" rx="12" ry="7" fill="#B879FF" opacity="0.55"/>

      {/* ── 7. Eyes ── */}
      {/* Left eye */}
      <ellipse cx="61" cy="83" rx="9" ry="7" fill="white"/>
      <ellipse cx="61" cy="84" rx="6" ry="5.5" fill="#2D1A6B"/>
      <circle cx="61" cy="84" r="3.5" fill="#1A0A40"/>
      <circle cx="58.5" cy="81.5" r="1.8" fill="white"/>
      {/* Right eye */}
      <ellipse cx="89" cy="83" rx="9" ry="7" fill="white"/>
      <ellipse cx="89" cy="84" rx="6" ry="5.5" fill="#2D1A6B"/>
      <circle cx="89" cy="84" r="3.5" fill="#1A0A40"/>
      <circle cx="86.5" cy="81.5" r="1.8" fill="white"/>

      {/* ── 8. Exaggerated lashes ── */}
      {/* Left top lashes */}
      <line x1="53" y1="78" x2="50" y2="72" stroke="#1A0A40" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="57" y1="76" x2="55" y2="70" stroke="#1A0A40" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="61" y1="75.5" x2="61" y2="69" stroke="#1A0A40" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="65" y1="76" x2="67" y2="70" stroke="#1A0A40" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="69" y1="78" x2="72" y2="73" stroke="#1A0A40" strokeWidth="1.4" strokeLinecap="round"/>
      {/* Left bottom lashes */}
      <line x1="54" y1="89" x2="52" y2="93" stroke="#1A0A40" strokeWidth="0.9" strokeLinecap="round"/>
      <line x1="61" y1="90.5" x2="61" y2="94.5" stroke="#1A0A40" strokeWidth="0.9" strokeLinecap="round"/>
      <line x1="68" y1="89" x2="70" y2="93" stroke="#1A0A40" strokeWidth="0.9" strokeLinecap="round"/>
      {/* Right top lashes */}
      <line x1="81" y1="78" x2="78" y2="72" stroke="#1A0A40" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="85" y1="76" x2="83" y2="70" stroke="#1A0A40" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="89" y1="75.5" x2="89" y2="69" stroke="#1A0A40" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="93" y1="76" x2="95" y2="70" stroke="#1A0A40" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="97" y1="78" x2="100" y2="73" stroke="#1A0A40" strokeWidth="1.4" strokeLinecap="round"/>
      {/* Right bottom lashes */}
      <line x1="82" y1="89" x2="80" y2="93" stroke="#1A0A40" strokeWidth="0.9" strokeLinecap="round"/>
      <line x1="89" y1="90.5" x2="89" y2="94.5" stroke="#1A0A40" strokeWidth="0.9" strokeLinecap="round"/>
      <line x1="96" y1="89" x2="98" y2="93" stroke="#1A0A40" strokeWidth="0.9" strokeLinecap="round"/>

      {/* ── 9. Nose ── */}
      <ellipse cx="75" cy="95" rx="4" ry="2.5" fill="rgba(200,140,100,0.3)"/>

      {/* ── 10. Lips ── */}
      <path d="M64 104 Q68 101 75 102 Q82 101 86 104 Q82 110 75 111 Q68 110 64 104 Z" fill="#E91E8C"/>
      <path d="M64 104 Q68 101 75 102 Q82 101 86 104" stroke="#C2185B" strokeWidth="0.7" fill="none"/>
      <path d="M68 104 Q75 106 82 104" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" strokeLinecap="round" fill="none"/>

      {/* ── 11. Blush ── */}
      <circle cx="52" cy="94" r="8" fill="rgba(255,105,155,0.22)"/>
      <circle cx="98" cy="94" r="8" fill="rgba(255,105,155,0.22)"/>

      {/* ── 12. Arm + wand ── */}
      {/* Right arm reaching out with wand */}
      <path d="M90 120 Q105 115 118 108" stroke="#FDDCB8" strokeWidth="8" strokeLinecap="round" fill="none"/>
      {/* Wand handle */}
      <line x1="118" y1="108" x2="130" y2="82" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round"/>

      {/* ── 13. Wand star (10-point) ── */}
      <path d="
        M130 68
        L132.2 74.8 L139.4 74.8 L133.6 78.8 L135.8 85.6
        L130 81.6 L124.2 85.6 L126.4 78.8 L120.6 74.8
        L127.8 74.8 Z
      " fill="#FFD700" stroke="#E6B800" strokeWidth="0.5"/>

      {/* ── 14. Sparkles around wand star ── */}
      {/* Sparkle 1 */}
      <motion.g animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}>
        <circle cx="140" cy="64" r="2.5" fill="#E91E8C"/>
        <line x1="140" y1="60" x2="140" y2="68" stroke="#E91E8C" strokeWidth="0.8" strokeLinecap="round"/>
        <line x1="136" y1="64" x2="144" y2="64" stroke="#E91E8C" strokeWidth="0.8" strokeLinecap="round"/>
      </motion.g>
      {/* Sparkle 2 */}
      <motion.g animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}>
        <circle cx="118" cy="62" r="2" fill="#29B6F6"/>
        <line x1="118" y1="58.5" x2="118" y2="65.5" stroke="#29B6F6" strokeWidth="0.7" strokeLinecap="round"/>
        <line x1="114.5" y1="62" x2="121.5" y2="62" stroke="#29B6F6" strokeWidth="0.7" strokeLinecap="round"/>
      </motion.g>
      {/* Sparkle 3 */}
      <motion.g animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.8 }}>
        <circle cx="142" cy="80" r="1.8" fill="#9C27B0"/>
        <line x1="142" y1="77" x2="142" y2="83" stroke="#9C27B0" strokeWidth="0.7" strokeLinecap="round"/>
        <line x1="139" y1="80" x2="145" y2="80" stroke="#9C27B0" strokeWidth="0.7" strokeLinecap="round"/>
      </motion.g>
      {/* Sparkle 4 — tiny dots */}
      <motion.g animate={{ opacity: [0.3, 0.9, 0.3] }} transition={{ duration: 1.0, repeat: Infinity, delay: 0.2 }}>
        <circle cx="125" cy="60" r="1.2" fill="#FFD700"/>
        <circle cx="136" cy="90" r="1.2" fill="#FF9800"/>
        <circle cx="144" cy="72" r="1" fill="#4CAF50"/>
      </motion.g>
    </svg>
  )
}

// ─── Main DragFairy component ─────────────────────────────────────
export function DragFairy({ size = 150, contextPhrase }: {
  size?: number
  contextPhrase?: Phrase
}) {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (contextPhrase) return // don't rotate when contextual phrase is provided
    timerRef.current = setInterval(() => {
      setPhraseIndex(i => (i + 1) % PHRASES.length)
    }, 6000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [contextPhrase])

  const activePhrase = contextPhrase ?? PHRASES[phraseIndex]

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'flex-end', flexShrink: 0 }}>
      {/* Speech bubble above the fairy */}
      <SpeechBubble phrase={activePhrase} />

      {/* Fairy body with float animation */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5, ease: 'easeInOut', repeat: Infinity, repeatType: 'loop' }}
      >
        <FairySvg size={size} />
      </motion.div>
    </div>
  )
}
