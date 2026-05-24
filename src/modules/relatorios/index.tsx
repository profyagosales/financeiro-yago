// ─── Relatórios — central analítica ─────────────────────────────────
// Página de scroll narrativo composta por 12 seções analíticas.
// Diferente do Dashboard (operacional / "agora"), aqui o foco é
// entender padrões, comparar períodos e projetar futuro.

import { motion } from 'framer-motion'
import { useRelatoriosData } from './lib/useRelatoriosData'
import { FiltrosBar } from './components/FiltrosBar'
import { SectionNav } from './components/SectionNav'
import { SecVisaoGeral } from './sections/SecVisaoGeral'
import { SecSaude } from './sections/SecSaude'
import { SecFluxoCaixa } from './sections/SecFluxoCaixa'
import { SecGastos } from './sections/SecGastos'
import { SecCompromissos } from './sections/SecCompromissos'
import { SecProjecao } from './sections/SecProjecao'
import { SecPatrimonio } from './sections/SecPatrimonio'
import { SecInvestimentos } from './sections/SecInvestimentos'
import { SecDividas } from './sections/SecDividas'
import { SecMetas } from './sections/SecMetas'
import { SecInsights } from './sections/SecInsights'
import { SecMovimentacoes } from './sections/SecMovimentacoes'

const NAV = [
  { id: 'visao-geral',    label: 'Visão geral' },
  { id: 'saude',          label: 'Saúde' },
  { id: 'fluxo-caixa',    label: 'Fluxo' },
  { id: 'gastos',         label: 'Gastos' },
  { id: 'compromissos',   label: 'Compromissos' },
  { id: 'projecao',       label: 'Projeção' },
  { id: 'patrimonio',     label: 'Patrimônio' },
  { id: 'investimentos',  label: 'Investimentos' },
  { id: 'dividas',        label: 'Dívidas' },
  { id: 'metas',          label: 'Metas' },
  { id: 'insights',       label: 'Insights' },
  { id: 'movimentacoes',  label: 'Detalhes' },
]

export function Page() {
  const d = useRelatoriosData()

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      style={{
        width: '100%',
        maxWidth: 1400,
        margin: '0 auto',
        padding: 'clamp(12px, 2vw, 24px)',
        paddingBottom: 80,
      }}
    >
      {/* Cabeçalho */}
      <div style={{ marginBottom: 8, paddingLeft: 4 }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 11, fontWeight: 700,
          color: '#C4553B', letterSpacing: '.18em', textTransform: 'uppercase',
          margin: 0,
        }}>Central analítica</p>
        <h1 style={{
          fontFamily: "'Fraunces',Georgia,serif",
          fontSize: 'clamp(30px, 4vw, 42px)', fontWeight: 700,
          color: '#2C1A0F', letterSpacing: '-1.2px',
          margin: '4px 0 0', lineHeight: 1,
        }}>Relatórios</h1>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 14, color: '#7A5C4F', fontWeight: 500,
          margin: '6px 0 0', maxWidth: 720, lineHeight: 1.4,
        }}>Análise profunda da sua vida financeira — cruza receitas, despesas, investimentos,
          dívidas, metas e projeta o futuro com base nos seus padrões.</p>
      </div>

      {/* Shelf sticky: filtros + nav num único bloco com bg sólido */}
      <div className="rel-sticky-shelf">
        <div className="rel-shelf-inner">
          <FiltrosBar periodoLabel={d.intervalo.label} />
          <div style={{ height: 10 }} />
          <SectionNav sections={NAV} />
        </div>
        {/* Fade inferior pra transição suave com o conteúdo */}
        <div className="rel-shelf-fade" aria-hidden />
      </div>

      <style>{`
        .rel-sticky-shelf {
          position: sticky;
          top: 0;
          z-index: 50;
          margin: 16px 0 24px;
        }
        .rel-shelf-inner {
          background: linear-gradient(180deg, #FBF8F3 0%, #FBF8F3 88%, rgba(251,248,243,0.96) 100%);
          padding: 14px 14px 12px;
          border-radius: 22px;
          /* Halo sutil em volta para destacar do conteúdo abaixo */
          box-shadow:
            0 2px 0 rgba(237,230,220,0.6),
            0 10px 28px rgba(44,26,15,0.06);
          /* Linha sutil de moldura */
          border: 1px solid rgba(237,230,220,0.85);
        }
        .rel-shelf-fade {
          position: absolute;
          left: 0; right: 0; top: 100%;
          height: 18px;
          background: linear-gradient(180deg, rgba(251,248,243,0.85), rgba(251,248,243,0));
          pointer-events: none;
        }
      `}</style>

      {/* Pilha de seções */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
        <SecVisaoGeral d={d} />
        <SecSaude score={d.score} status={d.status} />
        <SecFluxoCaixa d={d} />
        <SecGastos d={d} />
        <SecCompromissos d={d} />
        <SecProjecao d={d} />
        <SecPatrimonio d={d} />
        <SecInvestimentos d={d} />
        <SecDividas d={d} />
        <SecMetas d={d} />
        <SecInsights d={d} />
        <SecMovimentacoes d={d} />
      </div>
    </motion.div>
  )
}
