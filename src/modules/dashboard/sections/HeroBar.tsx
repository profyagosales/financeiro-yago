// ─── HeroBar: saudação + saldo grande + status + ações rápidas ──────
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { IconPlus, IconArrowsExchange, IconSparkles } from '@tabler/icons-react'
import { fmt } from '@/lib/format'
import { OdometroSaldo } from '@/components/ui/OdometroSaldo'
import { DeltaPill } from '@/components/ui/DeltaPill'
import { Sparkline } from '@/components/ui/Sparkline'
import { useUIStore } from '@/store/ui'
import { useAuthStore } from '@/store/auth'
import {
  saudacao,
} from '../lib/useDashboardData'
import { corStatus, labelStatus, type StatusFinanceiro, type SaudeScore } from '../lib/calculos'

interface HeroBarProps {
  saldoContas: number
  patrimonioLiquido: number
  trendSaldo: number
  saldoPrevisto: number
  sparkAcumulado: number[]
  status: StatusFinanceiro
  score: SaudeScore
}

export function HeroBar({
  saldoContas,
  patrimonioLiquido,
  trendSaldo,
  saldoPrevisto,
  sparkAcumulado,
  status,
  score,
}: HeroBarProps) {
  const navigate = useNavigate()
  const { openFab } = useUIStore()
  const email = useAuthStore(s => s.email)
  const greet = saudacao()
  const statusCor = corStatus(status)
  const firstName = (email ?? '').split('@')[0].split('.')[0].replace(/^\w/, c => c.toUpperCase())

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 26 }}
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #2A1E3F 0%, #504E76 55%, #6B4E8F 100%)',
        borderRadius: 26,
        padding: '26px 30px',
        overflow: 'hidden',
        boxShadow: '0 18px 48px rgba(42,30,63,0.32), 0 2px 6px rgba(42,30,63,0.18)',
      }}
    >
      {/* Decorative orbs */}
      <div aria-hidden style={{
        position: 'absolute', right: -60, top: -80, width: 280, height: 280,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,160,23,0.32), transparent 70%)',
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />
      <div aria-hidden style={{
        position: 'absolute', left: '40%', bottom: -100, width: 360, height: 360,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(241,100,46,0.16), transparent 70%)',
        filter: 'blur(28px)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 28, alignItems: 'center' }}
        className="hero-grid">
        {/* LEFT: saudação + saldo */}
        <div>
          {/* Saudação */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12, fontWeight: 600,
              color: 'rgba(255,255,255,0.75)',
              letterSpacing: '.02em',
            }}>
              {greet.texto}{firstName ? `, ${firstName}` : ''}
            </span>
            <span style={{ fontSize: 14 }}>{greet.emoji}</span>
          </div>

          {/* Saldo título */}
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 11, fontWeight: 700,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            margin: '0 0 6px',
          }}>Patrimônio líquido</p>

          {/* Patrimônio grande */}
          <OdometroSaldo value={patrimonioLiquido}
            style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 'clamp(34px, 5vw, 46px)',
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '-1px',
              lineHeight: 1,
              display: 'block',
            }} />

          {/* Sub: saldo em contas + delta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 13, color: 'rgba(255,255,255,0.78)',
            }}>
              <strong style={{ color: '#FFFFFF', fontWeight: 700 }}>{fmt(saldoContas)}</strong> em contas
            </span>
            {isFinite(trendSaldo) && (
              <DeltaPill value={trendSaldo} variant="gold" size="sm" suffix="vs mês passado" />
            )}
          </div>

          {/* Previsão fim do mês */}
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconSparkles size={13} stroke={2.2} color="#F2C745" />
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12, color: 'rgba(255,255,255,0.68)', fontWeight: 500,
            }}>
              Previsto pra fim do mês:&nbsp;
              <strong style={{
                color: saldoPrevisto >= 0 ? '#9CE5C9' : '#FFB199',
                fontWeight: 700,
              }}>{fmt(saldoPrevisto)}</strong>
            </span>
          </div>
        </div>

        {/* RIGHT: status + ações */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-end' }}>
          {/* Status pill grande */}
          <motion.div
            whileHover={{ scale: 1.04 }}
            onClick={() => navigate('/relatorios')}
            style={{
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '10px 16px',
              background: statusCor.bg,
              borderRadius: 999,
              boxShadow: `0 6px 18px ${statusCor.bg}66`,
            }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: statusCor.text,
              boxShadow: `0 0 8px ${statusCor.text}aa`,
            }} />
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12, fontWeight: 700,
              color: statusCor.text,
              letterSpacing: '.02em',
            }}>{labelStatus(status)}</span>
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12, fontWeight: 700,
              color: statusCor.text,
              opacity: 0.85,
            }}>· {score.total}/100</span>
          </motion.div>

          {/* Sparkline acumulado */}
          <div style={{ width: '100%', maxWidth: 220 }}>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 9.5, fontWeight: 700,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              margin: '0 0 4px',
              textAlign: 'right',
            }}>Acumulado · 6m</p>
            <Sparkline data={sparkAcumulado} color="#F2C745" accent="#FFFFFF" height={28} />
          </div>

          {/* Ações rápidas */}
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button
              whileHover={{ y: -1 }} whileTap={{ scale: 0.96 }}
              onClick={() => openFab()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 14px',
                background: 'rgba(255,255,255,0.16)',
                border: '1px solid rgba(255,255,255,0.28)',
                borderRadius: 11,
                color: '#FFFFFF', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 12, fontWeight: 700, letterSpacing: '.01em',
                backdropFilter: 'blur(8px)',
              }}>
              <IconPlus size={14} stroke={2.4} /> Transação
            </motion.button>
            <motion.button
              whileHover={{ y: -1 }} whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/transacoes')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 14px',
                background: 'rgba(0,0,0,0.18)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 11,
                color: '#FFFFFF', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 12, fontWeight: 600, letterSpacing: '.01em',
                backdropFilter: 'blur(8px)',
              }}>
              <IconArrowsExchange size={14} stroke={2.2} /> Ver tudo
            </motion.button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-grid > div:last-child { align-items: flex-start !important; }
        }
      `}</style>
    </motion.section>
  )
}
