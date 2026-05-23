import { motion } from 'framer-motion'
import { CardChip } from './CardChip'
import { BandeiraLogo } from './BandeiraLogo'

// ─── Cartão de crédito visual realista ────────────────────────────────
//
// Renderiza um cartão na proporção real (1.586:1), com:
//   - Gradient da cor do banco como fundo
//   - Chip dourado EMV
//   - Bandeira no canto superior direito
//   - Logo do banco uploaded (opcional) ou nome do banco
//   - Número do cartão (gerado pseudo-aleatório baseado no id ou
//     do último 4 dígitos definido pelo usuário)
//   - Titular + validade
//   - Brilho holográfico diagonal

interface RealCardVisualProps {
  nome: string                  // "Nubank"
  bandeira: string              // "mastercard"
  cor: string                   // hex
  logo?: string                 // base64 (opcional)
  titular?: string              // nome do titular
  ultimosDigitos?: string       // últimos 4 dígitos (opcional)
  diaVencimento?: number        // pra montar "VÁLIDO 12/30"
  width?: number | string       // px ou string CSS (default: 100%)
  cartaoId?: number             // pra gerar número pseudo-aleatório estável
}

function lighten(hex: string, pct: number): string {
  const n = hex.replace('#', '')
  if (n.length !== 6) return hex
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  const lr = Math.min(255, Math.round(r + (255 - r) * pct))
  const lg = Math.min(255, Math.round(g + (255 - g) * pct))
  const lb = Math.min(255, Math.round(b + (255 - b) * pct))
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}
function darken(hex: string, pct: number): string {
  const n = hex.replace('#', '')
  if (n.length !== 6) return hex
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  const dr = Math.max(0, Math.round(r * (1 - pct)))
  const dg = Math.max(0, Math.round(g * (1 - pct)))
  const db = Math.max(0, Math.round(b * (1 - pct)))
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`
}

// Gera 16 dígitos pseudo-aleatórios estáveis a partir de um seed (id)
function generateCardNumber(seed: number, lastFour?: string): string {
  // Usa um PRNG simples baseado no seed
  let n = seed * 1103515245 + 12345
  const digits: string[] = []
  for (let i = 0; i < 12; i++) {
    n = (n * 1103515245 + 12345) & 0x7fffffff
    digits.push(String(n % 10))
  }
  // Últimos 4 dígitos: usa o customizado ou gera mais 4
  const last = lastFour && lastFour.length === 4
    ? lastFour
    : digits.splice(8, 4).join('')
  const first12 = digits.slice(0, 12).join('')
  // Formata: XXXX XXXX XXXX XXXX
  return `${first12.slice(0, 4)} ${first12.slice(4, 8)} ${first12.slice(8, 12)} ${last}`
}

export function RealCardVisual({
  nome, bandeira, cor, logo, titular, ultimosDigitos,
  diaVencimento, width = '100%', cartaoId = 0,
}: RealCardVisualProps) {
  const corStart = lighten(cor, 0.22)
  const corEnd = darken(cor, 0.2)

  const numero = generateCardNumber(cartaoId || 1, ultimosDigitos)

  // Validade: mês de fechamento + 4 anos (genérico)
  const validade = (() => {
    const anoAtual = new Date().getFullYear()
    const ano = (anoAtual + 4) % 100
    const mes = String(diaVencimento ?? 12).padStart(2, '0')
    // Limita mes a 12
    const mesNum = Math.min(12, Math.max(1, parseInt(mes) || 12))
    return `${String(mesNum).padStart(2, '0')}/${String(ano).padStart(2, '0')}`
  })()

  const isContainerString = typeof width === 'string'
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: isContainerString ? width : `${width}px`,
    aspectRatio: '1.586 / 1',
    borderRadius: 16,
    overflow: 'hidden',
    color: '#FFFFFF',
    background: `linear-gradient(135deg, ${corStart} 0%, ${cor} 45%, ${corEnd} 100%)`,
    boxShadow: `0 18px 48px ${cor}40, 0 4px 16px rgba(28,10,5,0.18), inset 0 1px 0 rgba(255,255,255,0.16)`,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      style={containerStyle}
    >
      {/* Holographic shine diagonal */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(125deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 38%, transparent 60%)',
        pointerEvents: 'none',
      }}/>
      {/* Subtle radial highlight top-left */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%', width: '70%', height: '120%',
        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18) 0%, transparent 55%)',
        pointerEvents: 'none',
      }}/>
      {/* Subtle pattern dots */}
      <svg style={{ position: 'absolute', inset: 0, opacity: 0.08, pointerEvents: 'none' }} viewBox="0 0 400 252">
        <defs>
          <pattern id={`dots-${cartaoId}`} x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#FFFFFF"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${cartaoId})`}/>
      </svg>

      {/* Content layout — uses % for responsive scaling */}
      <div style={{
        position: 'relative', zIndex: 1, height: '100%',
        padding: '6% 6.5%',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        {/* Top row — nome banco + bandeira */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            {logo && (logo.startsWith('data:') || logo.startsWith('http')) ? (
              <div style={{
                width: '14%', aspectRatio: '1',
                borderRadius: 8, overflow: 'hidden',
                background: 'rgba(255,255,255,0.95)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <img src={logo} alt={nome}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              </div>
            ) : null}
            <span style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 800,
              fontSize: 'clamp(13px, 2.4vw, 22px)',
              letterSpacing: '-0.4px',
              color: '#FFFFFF',
              textShadow: '0 1px 4px rgba(0,0,0,0.25)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{nome}</span>
          </div>
          <div style={{ flexShrink: 0 }}>
            <BandeiraLogo bandeira={bandeira} size={48} variant="light" />
          </div>
        </div>

        {/* Middle — chip */}
        <div style={{ marginTop: '-3%' }}>
          <CardChip size={44} variant="gold" />
        </div>

        {/* Bottom — número + titular/validade */}
        <div>
          {/* Número */}
          <p style={{
            margin: 0,
            fontFamily: '"Inconsolata", "Courier New", monospace',
            fontWeight: 700,
            fontSize: 'clamp(13px, 2.6vw, 22px)',
            letterSpacing: '0.15em',
            color: '#FFFFFF',
            textShadow: '0 2px 6px rgba(0,0,0,0.32)',
          }}>{numero}</p>

          {/* Titular + validade */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            marginTop: '4%',
          }}>
            <div>
              <p style={{
                margin: 0, opacity: 0.66,
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700,
                fontSize: 'clamp(7px, 1.2vw, 9px)',
                letterSpacing: '.16em', textTransform: 'uppercase',
              }}>Titular</p>
              <p style={{
                margin: '2px 0 0',
                fontFamily: '"Inconsolata", monospace', fontWeight: 700,
                fontSize: 'clamp(10px, 1.7vw, 14px)',
                letterSpacing: '0.06em',
                color: '#FFFFFF',
                textTransform: 'uppercase',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%',
              }}>{(titular || 'Yago Salese').slice(0, 24)}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{
                margin: 0, opacity: 0.66,
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700,
                fontSize: 'clamp(7px, 1.2vw, 9px)',
                letterSpacing: '.16em', textTransform: 'uppercase',
              }}>Válido até</p>
              <p style={{
                margin: '2px 0 0',
                fontFamily: '"Inconsolata", monospace', fontWeight: 700,
                fontSize: 'clamp(10px, 1.7vw, 14px)',
                letterSpacing: '0.06em',
                color: '#FFFFFF',
              }}>{validade}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
