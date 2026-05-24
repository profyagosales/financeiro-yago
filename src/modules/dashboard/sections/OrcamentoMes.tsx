// ─── OrçamentoMês: "quanto sobra pra gastar" ────────────────────────
// Card grande com barra empilhada visual:
//   Receitas (verde) ─ Despesas já gastas (laranja) ─ Comprometido (amarelo) = Livre (cinza)
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { IconChartBar } from '@tabler/icons-react'
import { fmt } from '@/lib/format'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface OrcamentoMesProps {
  receitas: number
  despesasGastas: number      // já saiu da conta
  comprometidoFixas: number   // contas fixas pendentes
  comprometidoParcelas: number
  saldoLivre: number
  diaAtual: number
  diasNoMes: number
}

export function OrcamentoMes({
  receitas, despesasGastas, comprometidoFixas, comprometidoParcelas, saldoLivre,
  diaAtual, diasNoMes,
}: OrcamentoMesProps) {
  const navigate = useNavigate()
  const totalComprometido = despesasGastas + comprometidoFixas + comprometidoParcelas
  const pctGasto = receitas > 0 ? (despesasGastas / receitas) * 100 : 0
  const pctFixas = receitas > 0 ? (comprometidoFixas / receitas) * 100 : 0
  const pctParcelas = receitas > 0 ? (comprometidoParcelas / receitas) * 100 : 0
  const pctTotal = pctGasto + pctFixas + pctParcelas
  const diasRest = Math.max(0, diasNoMes - diaAtual)
  const livrePorDia = diasRest > 0 ? saldoLivre / diasRest : saldoLivre
  const isNeg = saldoLivre < 0

  return (
    <section style={{
      background: '#FFFFFF',
      border: '1px solid #EDE6DC',
      borderRadius: 22,
      padding: '20px 22px',
      boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10, fontWeight: 700,
            color: '#9B7B6A', letterSpacing: '.14em', textTransform: 'uppercase',
            margin: 0,
          }}>Orçamento do mês</p>
          <h2 style={{
            fontFamily: "'Fraunces',Georgia,serif",
            fontSize: 22, fontWeight: 700, color: '#2C1A0F',
            letterSpacing: '-0.5px', margin: '2px 0 0',
          }}>{isNeg ? 'Saldo estourado' : 'Quanto pode gastar'}</h2>
        </div>
        <button
          onClick={() => navigate('/transacoes')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', background: '#FBF8F3', border: '1px solid #EDE6DC',
            borderRadius: 999, cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#7A5C4F',
          }}>
          <IconChartBar size={13} stroke={2} /> Detalhar
        </button>
      </div>

      {/* Valor livre grande */}
      <div style={{ marginBottom: 16 }}>
        <motion.span
          key={saldoLivre}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          style={{
            display: 'block',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 'clamp(28px, 4vw, 38px)',
            fontWeight: 700,
            color: isNeg ? '#C4553B' : '#1E7D5A',
            letterSpacing: '-0.6px', lineHeight: 1,
          }}>
          {fmt(Math.abs(saldoLivre))}
        </motion.span>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 12, color: '#7A5C4F', margin: '4px 0 0',
        }}>
          {isNeg
            ? <>compromissos do mês <strong>maiores</strong> que receita</>
            : diasRest > 0
              ? <>≈ <strong style={{ color: '#2C1A0F' }}>{fmt(livrePorDia)}</strong>/dia pelos próximos <strong style={{ color: '#2C1A0F' }}>{diasRest} {diasRest === 1 ? 'dia' : 'dias'}</strong></>
              : 'Último dia do mês'}
        </p>
      </div>

      {/* Barra empilhada */}
      <div style={{ marginBottom: 12 }}>
        <div style={{
          position: 'relative', height: 14, borderRadius: 999, overflow: 'hidden',
          background: '#F5EEE3',
        }}>
          {/* despesas gastas */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, pctGasto)}%` }}
            transition={{ duration: 0.8, ease: [0.22, 0.6, 0.36, 1] }}
            style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              background: 'linear-gradient(90deg, #C4553B, #A8442B)',
            }} />
          {/* comprometido fixas */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100 - pctGasto, pctFixas)}%` }}
            transition={{ duration: 0.8, delay: 0.15 }}
            style={{
              position: 'absolute', left: `${Math.min(100, pctGasto)}%`, top: 0, bottom: 0,
              background: 'linear-gradient(90deg, #D4A017, #B88514)',
            }} />
          {/* parcelas */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100 - pctGasto - pctFixas, pctParcelas)}%` }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{
              position: 'absolute', left: `${Math.min(100, pctGasto + pctFixas)}%`, top: 0, bottom: 0,
              background: 'linear-gradient(90deg, #504E76, #3D3B5F)',
            }} />
          {/* marker hoje */}
          {diaAtual > 0 && diasNoMes > 0 && (
            <div style={{
              position: 'absolute',
              left: `${(diaAtual / diasNoMes) * 100}%`,
              top: -3, bottom: -3,
              width: 2, background: 'rgba(44,26,15,0.45)',
              boxShadow: '0 0 6px rgba(0,0,0,0.18)',
            }} title={`Dia ${diaAtual}`} />
          )}
        </div>

        {/* Legenda */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>
          <LegendItem color="#C4553B" label="Gastei" value={despesasGastas} pct={pctGasto} />
          <LegendItem color="#D4A017" label="Contas fixas" value={comprometidoFixas} pct={pctFixas} />
          <LegendItem color="#504E76" label="Parcelas" value={comprometidoParcelas} pct={pctParcelas} />
          <LegendItem color="#3A8580" label="Sobra" value={saldoLivre} pct={Math.max(0, 100 - pctTotal)} highlight />
        </div>
      </div>

      {/* Footer: receitas total */}
      <div style={{
        marginTop: 12, paddingTop: 12,
        borderTop: '1px dashed #EDE6DC',
        display: 'flex', justifyContent: 'space-between',
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#7A5C4F',
      }}>
        <span>Receitas do mês</span>
        <strong style={{ color: '#2C1A0F', fontWeight: 700 }}>{fmt(receitas)}</strong>
      </div>
    </section>
  )
}

function LegendItem({ color, label, value, pct, highlight }: { color: string; label: string; value: number; pct: number; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 10, fontWeight: 700,
          color: '#9B7B6A', letterSpacing: '.06em', textTransform: 'uppercase',
        }}>{label} · {pct.toFixed(0)}%</span>
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 13, fontWeight: highlight ? 700 : 600,
          color: highlight ? '#1E7D5A' : '#2C1A0F',
          letterSpacing: '-0.2px',
        }}>{fmt(value)}</span>
      </div>
    </div>
  )
}
