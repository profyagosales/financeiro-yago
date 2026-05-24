// ─── Mais — lista de atalhos. Mesma identidade peach. ──────────────
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  IconBuildingBank, IconRepeat, IconTarget, IconChartBar, IconSettings,
  IconChevronRight, IconHeart, IconChartLine, IconCreditCardOff,
} from '@tabler/icons-react'
import { useContasFixas, usePagamentosFixos } from '@/db/hooks/useContasFixas'
import { mesAnoAtual, fmt } from '@/lib/format'

const C = {
  bgTop: '#FFE2C7', bgMid: '#FFF1DE', bgBottom: '#FFE9D7',
  ink: '#2C1A0F', inkSoft: '#5C4339', muted: '#9B7B6A',
  orange: '#C4553B', orangeBri: '#F1642E',
  glass: 'rgba(255,255,255,0.65)', glassStrong: 'rgba(255,255,255,0.85)',
  glassBorder: 'rgba(255,255,255,0.7)',
  glassShadow: '0 1px 2px rgba(196,85,59,0.06), 0 8px 24px rgba(196,85,59,0.08)',
}

const SECTIONS = [
  {
    title: 'Movimentação',
    items: [
      { path: '/contas',       Icon: IconBuildingBank,   label: 'Contas',           sub: 'Carteira, banco, poupança',  cor: '#3D7EB5', bg: 'rgba(61,126,181,0.13)' },
      { path: '/contas-fixas', Icon: IconRepeat,         label: 'Contas Fixas',     sub: 'Aluguel, assinaturas',       cor: '#D4A017', bg: 'rgba(212,160,23,0.16)' },
    ],
  },
  {
    title: 'Patrimônio',
    items: [
      { path: '/metas',         Icon: IconTarget,          label: 'Metas',          sub: 'Sonhos e reserva',           cor: '#1E7D5A', bg: 'rgba(30,125,90,0.13)' },
      { path: '/investimentos', Icon: IconChartLine,       label: 'Investimentos',  sub: 'Sua carteira',               cor: '#504E76', bg: 'rgba(80,78,118,0.13)' },
      { path: '/dividas',       Icon: IconCreditCardOff,   label: 'Dívidas',        sub: 'Empréstimos e parcelados',   cor: '#C4553B', bg: 'rgba(196,85,59,0.13)' },
      { path: '/desejos',       Icon: IconHeart,           label: 'Desejos',        sub: 'Lista de compras',           cor: '#F1642E', bg: 'rgba(241,100,46,0.13)' },
    ],
  },
  {
    title: 'Análise',
    items: [
      { path: '/relatorios',    Icon: IconChartBar,        label: 'Relatórios',     sub: 'Análise detalhada',          cor: '#7C5CBF', bg: 'rgba(124,92,191,0.13)' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { path: '/configuracoes', Icon: IconSettings,        label: 'Configurações',  sub: 'Perfil, notificações',       cor: '#9B7B6A', bg: 'rgba(155,123,106,0.13)' },
    ],
  },
]

const PAGE = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const ITEM = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 24 } } }

export function Page() {
  const navigate = useNavigate()
  const { mes, ano } = mesAnoAtual()
  const fixas = useContasFixas()
  const pagamentos = usePagamentosFixos(mes, ano)
  const pendentes = fixas.filter(cf => !pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const totalPendente = pendentes.reduce((s, cf) => s + cf.valor, 0)

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', width: '100%',
      background: `linear-gradient(180deg, ${C.bgTop} 0%, ${C.bgMid} 35%, ${C.bgBottom} 100%)` }}>
      <div aria-hidden style={{ position: 'absolute', right: -80, top: -120, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(241,100,46,0.18), transparent 65%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', left: -100, bottom: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,191,0.14), transparent 60%)', filter: 'blur(28px)', pointerEvents: 'none' }} />

      <motion.div variants={PAGE} initial="hidden" animate="show"
        style={{ position: 'relative', padding: '16px 18px', paddingTop: 'calc(20px + env(safe-area-inset-top))', paddingBottom: 'calc(120px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 18 }}>

        <motion.header variants={ITEM}>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 30, fontWeight: 700, color: C.ink, letterSpacing: '-1px', margin: 0, lineHeight: 1 }}>Mais</h1>
          {pendentes.length > 0 && (
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, color: C.orange, margin: '4px 0 0', fontWeight: 600 }}>
              {pendentes.length} {pendentes.length === 1 ? 'conta fixa pendente' : 'contas fixas pendentes'} · {fmt(totalPendente)}
            </p>
          )}
        </motion.header>

        {SECTIONS.map((sec) => (
          <motion.section key={sec.title} variants={ITEM}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, letterSpacing: '.16em', textTransform: 'uppercase', margin: '0 0 8px', padding: '0 4px' }}>{sec.title}</h2>
            <div style={{
              background: C.glass, backdropFilter: 'blur(16px)',
              border: `1px solid ${C.glassBorder}`, borderRadius: 18,
              padding: '4px 14px', boxShadow: C.glassShadow,
            }}>
              {sec.items.map((item, i) => (
                <button key={item.path} onClick={() => navigate(item.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 0', width: '100%',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'left',
                    borderTop: i > 0 ? '1px dashed rgba(44,26,15,0.08)' : 'none',
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                  }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <item.Icon size={18} stroke={2} color={item.cor} />
                  </div>
                  <p style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.ink, margin: 0 }}>
                    {item.label}
                    <span style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 500, marginTop: 1 }}>{item.sub}</span>
                  </p>
                  <IconChevronRight size={16} stroke={2.2} color={C.muted} />
                </button>
              ))}
            </div>
          </motion.section>
        ))}
      </motion.div>
    </div>
  )
}
