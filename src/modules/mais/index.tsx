import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useContasFixas, usePagamentosFixos } from '@/db/hooks/useContasFixas'
import { useAllLancamentosAtivos } from '@/db/hooks/useCartoes'
import { mesAnoAtual, fmt } from '@/lib/format'

const ITEMS = [
  { path: '/contas', icon: '🏦', label: 'Contas', cor: '#3D7EB5', bg: '#E8F1FA' },
  { path: '/contas-fixas', icon: '🔄', label: 'Contas Fixas', cor: '#E89527', bg: '#FDF4E3' },
  { path: '/parcelamentos', icon: '📅', label: 'Parcelamentos', cor: '#D94F8A', bg: '#FAE8F2' },
  { path: '/metas', icon: '🎯', label: 'Metas', cor: '#1E7D5A', bg: '#E3F4EC' },
  { path: '/patrimonio', icon: '📈', label: 'Patrimônio', cor: '#7C5CBF', bg: '#EEE8FA' },
  { path: '/relatorios', icon: '📊', label: 'Relatórios', cor: '#C4553B', bg: '#FAF0EE' },
  { path: '/configuracoes', icon: '⚙️', label: 'Configurações', cor: '#9B7B6A', bg: '#F5F0E8' },
]

export function Page() {
  const navigate = useNavigate()
  const { mes, ano } = mesAnoAtual()
  const fixas = useContasFixas()
  const pagamentos = usePagamentosFixos(mes, ano)
  const parcelamentos = useAllLancamentosAtivos().filter(l => l.totalParcelas > 1)

  const pendentes = fixas.filter(cf => !pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const totalPendente = pendentes.reduce((s, cf) => s + cf.valor, 0)
  const totalParcelado = parcelamentos.reduce((s, l) => s + l.valor, 0)

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } } }

  return (
    <motion.div variants={container} initial="hidden" animate="show"
      style={{ padding: '20px 16px', maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F', marginBottom: 20 }}>Mais</h1>

      {/* Quick stats */}
      {(pendentes.length > 0 || parcelamentos.length > 0) && (
        <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {pendentes.length > 0 && (
            <motion.div whileHover={{ y: -2 }} onClick={() => navigate('/contas-fixas')}
              style={{ background: '#FDF4E3', border: '0.5px solid #F0D8A8', borderRadius: 16, padding: '14px', cursor: 'pointer' }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: '#E89527', marginBottom: 4 }}>CONTAS A PAGAR</p>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F' }}>{fmt(totalPendente)}</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', marginTop: 2 }}>{pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}</p>
            </motion.div>
          )}
          {parcelamentos.length > 0 && (
            <motion.div whileHover={{ y: -2 }} onClick={() => navigate('/parcelamentos')}
              style={{ background: '#FAE8F2', border: '0.5px solid #F0C8E0', borderRadius: 16, padding: '14px', cursor: 'pointer' }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: '#D94F8A', marginBottom: 4 }}>PARCELAMENTOS</p>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F' }}>{fmt(totalParcelado)}/mês</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', marginTop: 2 }}>{parcelamentos.length} em aberto</p>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Grid de módulos */}
      <motion.div variants={item}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 10, letterSpacing: '.05em' }}>MÓDULOS</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {ITEMS.map(it => (
            <motion.button key={it.path} onClick={() => navigate(it.path)}
              whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.97 }}
              style={{ background: it.bg, border: `0.5px solid ${it.cor}22`, borderRadius: 18, padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, textAlign: 'left' }}>
              <span style={{ fontSize: 28 }}>{it.icon}</span>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: it.cor }}>{it.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
