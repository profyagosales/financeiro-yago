// ─── Visão Geral: 4 KPIs grandes do período ─────────────────────────
import { IconChartHistogram, IconArrowDownRight, IconArrowUpRight, IconCoin, IconScale } from '@tabler/icons-react'
import { SectionShell } from '../components/SectionShell'
import { KpiCard } from '@/components/ui/KpiCard'
import { fmt } from '@/lib/format'
import type { RelatoriosData } from '../lib/useRelatoriosData'

interface Props { d: RelatoriosData }

export function SecVisaoGeral({ d }: Props) {
  const sparkRec = d.serie.map(p => p.receitas)
  const sparkDes = d.serie.map(p => p.despesas)
  const sparkSal = d.serie.map(p => p.saldo)
  const sparkAcc = d.serie.map(p => p.saldoAcumulado)

  return (
    <SectionShell
      id="visao-geral"
      eyebrow="Visão geral"
      title="Snapshot do período"
      description={`Indicadores principais para ${d.intervalo.label}. Comparativo automático com período anterior (${d.intervalo.prev.label}).`}
      icon={<IconChartHistogram size={18} stroke={2} color="#C4553B" />}
      accent="#C4553B"
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14,
      }}>
        <KpiCard
          label="Receitas"
          value={fmt(d.totais.receitas)}
          serie={sparkRec}
          delta={d.totais.deltaReceitas}
          variant="plain"
          color="#3A8580"
          icon={<IconArrowUpRight size={14} stroke={2.4} color="#3A8580" />}
          subtitle={`Média mensal ${fmt(d.totais.receitasMensalMedia)}`}
        />
        <KpiCard
          label="Despesas"
          value={fmt(d.totais.despesas)}
          serie={sparkDes}
          delta={d.totais.deltaDespesas}
          deltaVariant="inverse"
          variant="plain"
          color="#C4553B"
          icon={<IconArrowDownRight size={14} stroke={2.4} color="#C4553B" />}
          subtitle={`Média mensal ${fmt(d.totais.despesasMensalMedia)}`}
        />
        <KpiCard
          label="Saldo do período"
          value={fmt(d.totais.saldo)}
          serie={sparkSal}
          delta={d.totais.deltaSaldo}
          variant="plain"
          color={d.totais.saldo >= 0 ? '#1E7D5A' : '#A8442B'}
          icon={<IconScale size={14} stroke={2.4} color={d.totais.saldo >= 0 ? '#1E7D5A' : '#A8442B'} />}
          subtitle={d.totais.countTotal > 0 ? `${d.totais.countTotal} ${d.totais.countTotal === 1 ? 'transação' : 'transações'}` : 'Sem dados'}
        />
        <KpiCard
          label="Patrimônio líquido"
          value={fmt(d.patrimonioLiquido)}
          serie={sparkAcc}
          variant="plain"
          color="#504E76"
          icon={<IconCoin size={14} stroke={2.4} color="#504E76" />}
          subtitle={`Contas + Invest − Dívidas`}
        />
      </div>

      {/* Ticket médio + count grid */}
      <div style={{
        marginTop: 16, paddingTop: 16, borderTop: '1px dashed #EDE6DC',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14,
      }}>
        <MiniMetric label="Ticket médio receita" value={fmt(d.totais.ticketMedioReceita)} color="#1E7D5A" />
        <MiniMetric label="Ticket médio despesa" value={fmt(d.totais.ticketMedioDespesa)} color="#A8442B" />
        <MiniMetric label="Taxa de poupança" value={`${d.indicadores.taxaPoupanca.toFixed(1)}%`} color={d.indicadores.taxaPoupanca >= 20 ? '#1E7D5A' : d.indicadores.taxaPoupanca >= 0 ? '#A8730F' : '#A8442B'} />
        <MiniMetric label="Liquidez (meses)" value={`${d.indicadores.liquidezMeses.toFixed(1)}m`} color={d.indicadores.liquidezMeses >= 3 ? '#1E7D5A' : '#A8730F'} />
      </div>
    </SectionShell>
  )
}

function MiniMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 10, fontWeight: 700,
        color: '#9B7B6A', letterSpacing: '.12em', textTransform: 'uppercase',
        margin: '0 0 4px',
      }}>{label}</p>
      <p style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 18, fontWeight: 700,
        color, letterSpacing: '-0.3px', margin: 0,
      }}>{value}</p>
    </div>
  )
}
