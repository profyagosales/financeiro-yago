import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useContasFixas, usePagamentosFixos } from '@/db/hooks/useContasFixas'
import { useAllLancamentosAtivos } from '@/db/hooks/useCartoes'
import { mesAnoAtual, fmt } from '@/lib/format'
import {
  IconBuildingBank, IconRepeat, IconCalendarStats, IconTarget,
  IconTrendingUp, IconChartBar, IconSettings, IconChevronRight
} from '@tabler/icons-react'

const ITEMS = [
  { path: '/contas', Icon: IconBuildingBank, label: 'Contas', cor: '#3D7EB5', bg: '#EBF3FB' },
  { path: '/contas-fixas', Icon: IconRepeat, label: 'Contas Fixas', cor: '#E89527', bg: '#FDF4E3' },
  { path: '/parcelamentos', Icon: IconCalendarStats, label: 'Parcelamentos', cor: '#D94F8A', bg: '#FAE8F2' },
  { path: '/metas', Icon: IconTarget, label: 'Metas & Orçamento', cor: '#1E7D5A', bg: '#E3F4EC' },
  { path: '/patrimonio', Icon: IconTrendingUp, label: 'Patrimônio', cor: '#7C5CBF', bg: '#EEE8FA' },
  { path: '/relatorios', Icon: IconChartBar, label: 'Relatórios', cor: '#C4553B', bg: '#FAF0EE' },
  { path: '/configuracoes', Icon: IconSettings, label: 'Configurações', cor: '#9B7B6A', bg: '#F5F0E8' },
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "24px 28px", width: "100%" }}>
      <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 28, fontWeight: 700, color: '#2C1A0F', marginBottom: 20 }}>Mais</h1>

      {(pendentes.length > 0 || parcelamentos.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {pendentes.length > 0 && (
            <motion.div whileHover={{ y: -2 }} onClick={() => navigate('/contas-fixas')}
              style={{ background: '#FDF4E3', border: '0.5px solid #E8C87A', borderRadius: 18, padding: 16, cursor: 'pointer' }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#E89527', marginBottom: 6, letterSpacing: '.04em' }}>A PAGAR ESTE MÊS</p>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F' }}>{fmt(totalPendente)}</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', marginTop: 4 }}>{pendentes.length} conta{pendentes.length !== 1 ? 's' : ''} pendente{pendentes.length !== 1 ? 's' : ''}</p>
            </motion.div>
          )}
          {parcelamentos.length > 0 && (
            <motion.div whileHover={{ y: -2 }} onClick={() => navigate('/parcelamentos')}
              style={{ background: '#FAE8F2', border: '0.5px solid #E8B0D0', borderRadius: 18, padding: 16, cursor: 'pointer' }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#D94F8A', marginBottom: 6, letterSpacing: '.04em' }}>PARCELAMENTOS</p>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F' }}>{fmt(totalParcelado)}/mês</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', marginTop: 4 }}>{parcelamentos.length} em aberto</p>
            </motion.div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ITEMS.map(({ path, Icon, label, cor, bg }) => (
          <motion.button key={path} onClick={() => navigate(path)}
            whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }}
            style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 16, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} stroke={1.8} color={cor} />
            </div>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#2C1A0F', flex: 1 }}>{label}</span>
            <IconChevronRight size={16} color="#C4B4A8" />
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
