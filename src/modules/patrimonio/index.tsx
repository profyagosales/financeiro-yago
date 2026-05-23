import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import {
  IconChartLine, IconCash, IconBuildingBank, IconArrowUpRight, IconArrowDownRight,
  IconShieldCheck, IconChevronRight,
} from '@tabler/icons-react'
import { fmt } from '@/lib/format'
import { useContas, useSaldoTotal } from '@/db/hooks/useContas'
import { useInvestimentos, useTotalInvestimentos } from '@/db/hooks/useInvestimentos'
import { useDividasComputed, useTotalDividas } from '@/db/hooks/useDividas'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { TIPOS as INV_TIPOS, TIPO_META as INV_TIPO_META, CLASSE_COR, CLASSE_LABEL } from '../investimentos/constants'
import { TIPO_META as DIV_TIPO_META } from '../dividas/constants'

export function Page() {
  const navigate = useNavigate()

  const contas = useContas()
  const saldoContas = useSaldoTotal()
  const investimentos = useInvestimentos()
  const { total: totalInvest, aplicado: totalAplicado, rendimento: rendimentoInvest } = useTotalInvestimentos()
  const dividas = useDividasComputed()
  const { totalDevido, totalParcelaMensal } = useTotalDividas()

  // Composição
  const totalAtivos = saldoContas + totalInvest
  const totalPassivos = totalDevido
  const patrimonioLiquido = totalAtivos - totalPassivos

  // Trend (delta no mês baseado em receitas - despesas + rendimento)
  const now = new Date()
  const inicioMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const txsMes = useLiveQuery(
    () => db.transacoes.where('data').aboveOrEqual(inicioMes).toArray(),
    [inicioMes],
  ) ?? []
  const fluxoMes = useMemo(() => {
    const rec = txsMes.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
    const des = txsMes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
    return rec - des
  }, [txsMes])
  const deltaMes = fluxoMes + rendimentoInvest // aproximação: cash flow + rendimento dos investimentos
  const deltaPct = patrimonioLiquido !== 0 ? (deltaMes / Math.abs(patrimonioLiquido)) * 100 : 0
  const deltaPositivo = deltaMes >= 0

  // Distribuição de investimentos por classe
  const distribuicaoInvest = useMemo(() => {
    const acc: Record<'fixa'|'variavel'|'cripto'|'caixa', number> = { fixa: 0, variavel: 0, cripto: 0, caixa: 0 }
    investimentos.forEach(i => {
      const tm = INV_TIPO_META.get(i.tipo)
      if (tm) acc[tm.classe] += i.valorAtual
    })
    return acc
  }, [investimentos])

  // Breakdown de dívidas por tipo
  const dividasPorTipo = useMemo(() => {
    const map = new Map<string, number>()
    dividas.forEach(d => {
      const prev = map.get(d.tipo) ?? 0
      map.set(d.tipo, prev + d.saldoDevedor)
    })
    return Array.from(map.entries())
  }, [dividas])

  // Evolução simulada (últimos 12 meses) — net worth estimado por mês
  // Estratégia: começa do patrimônio atual e desconta o fluxo mensal indo pra trás
  const evolucao = useEvolucao12Meses(patrimonioLiquido)

  // Razão ativos/passivos
  const razao = totalPassivos > 0 ? (totalAtivos / totalPassivos) : 0
  const saudeFinanceira =
    razao === 0 && totalAtivos > 0 ? { label: 'Sem dívidas', cor: '#3A8580' }
    : razao >= 4 ? { label: 'Excelente', cor: '#3A8580' }
    : razao >= 2 ? { label: 'Saudável', cor: '#1E7D5A' }
    : razao >= 1 ? { label: 'Atenção', cor: '#D4A017' }
    : { label: 'Crítica', cor: '#C4553B' }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: 32, width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid #EDE6DC' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, fontSize: 38, color: '#2C1A0F', margin: 0, letterSpacing: '-1.5px' }}>Patrimônio</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginTop: 4 }}>
            Visão consolidada: contas, investimentos e dívidas
          </p>
        </div>
      </div>

      {/* HERO — Patrimônio Líquido */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'relative',
          background: 'linear-gradient(155deg, #0D2826 0%, #0A1A19 100%)',
          borderRadius: 24, padding: '32px 36px',
          boxShadow: '0 12px 36px rgba(13,40,38,0.32), 0 2px 8px rgba(13,40,38,0.16)',
          marginBottom: 24, overflow: 'hidden',
        }}>
        {/* Decoração */}
        <svg style={{ position: 'absolute', right: -40, top: -40, width: 280, height: 280, opacity: 0.06, pointerEvents: 'none' }} viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="92" stroke="white" strokeWidth="1"/>
          <circle cx="100" cy="100" r="64" stroke="white" strokeWidth="1"/>
          <circle cx="100" cy="100" r="36" stroke="white" strokeWidth="1"/>
        </svg>

        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32, alignItems: 'center' }}>
          {/* Left */}
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: 'rgba(167,224,220,0.7)', letterSpacing: '.18em', textTransform: 'uppercase', margin: 0 }}>
              Patrimônio Líquido
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 54, fontWeight: 700,
                color: patrimonioLiquido >= 0 ? '#FFFFFF' : '#FFBFAE',
                margin: 0, letterSpacing: '-0.3px', lineHeight: 1,
              }}>{fmt(patrimonioLiquido)}</p>
              {deltaMes !== 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
                  color: deltaPositivo ? '#A7E0DC' : '#FFBFAE',
                  background: deltaPositivo ? 'rgba(167,224,220,0.12)' : 'rgba(255,191,174,0.14)',
                  border: `1px solid ${deltaPositivo ? 'rgba(167,224,220,0.35)' : 'rgba(255,191,174,0.35)'}`,
                  padding: '4px 10px', borderRadius: 20,
                }}>
                  {deltaPositivo ? <IconArrowUpRight size={13} stroke={2.4} /> : <IconArrowDownRight size={13} stroke={2.4} />}
                  {deltaPositivo ? '+' : ''}{fmt(deltaMes)} ({Math.abs(deltaPct).toFixed(1)}%) no mês
                </span>
              )}
            </div>
            <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(212,160,23,0.4) 0%, rgba(255,255,255,0.08) 60%, transparent 100%)', margin: '20px 0' }}/>

            <div style={{ display: 'flex', gap: 32 }}>
              <HeroStat
                label="Ativos"
                value={fmt(totalAtivos)}
                cor="#A7E0DC"
                icon={<IconArrowUpRight size={14} stroke={2.4} color="#A7E0DC" />}
              />
              <HeroStat
                label="Passivos"
                value={fmt(totalPassivos)}
                cor="#FFBFAE"
                icon={<IconArrowDownRight size={14} stroke={2.4} color="#FFBFAE" />}
              />
              <HeroStat
                label="Razão A/P"
                value={totalPassivos === 0 ? '∞' : `${razao.toFixed(1)}×`}
                cor={saudeFinanceira.cor === '#3A8580' ? '#A7E0DC' : saudeFinanceira.cor === '#D4A017' ? '#F2C745' : '#FFBFAE'}
                badge={saudeFinanceira.label}
              />
            </div>
          </div>

          {/* Right — Stacked bar Ativos x Passivos */}
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: 'rgba(167,224,220,0.7)', letterSpacing: '.18em', textTransform: 'uppercase', margin: '0 0 14px' }}>
              Composição
            </p>
            {(totalAtivos + totalPassivos) > 0 ? (
              <>
                <div style={{ display: 'flex', gap: 4, height: 14 }}>
                  {totalAtivos > 0 && (
                    <div style={{
                      flex: totalAtivos,
                      background: 'linear-gradient(90deg, #3A8580, #2C7470)',
                      borderRadius: 4,
                    }} />
                  )}
                  {totalPassivos > 0 && (
                    <div style={{
                      flex: totalPassivos,
                      background: 'linear-gradient(90deg, #C4553B, #A8442B)',
                      borderRadius: 4,
                    }} />
                  )}
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
                  <LegendItem cor="#3A8580" label="Ativos" valor={totalAtivos} total={totalAtivos + totalPassivos} />
                  <LegendItem cor="#C4553B" label="Passivos" valor={totalPassivos} total={totalAtivos + totalPassivos} />
                </div>
              </>
            ) : (
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: 'rgba(167,224,220,0.5)', margin: 0 }}>
                Cadastre contas, investimentos ou dívidas para ver a composição.
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Detail: Ativos × Passivos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24, alignItems: 'stretch' }}>

        {/* ─── ATIVOS ─── */}
        <div style={{
          position: 'relative',
          background: '#EBF5F0',
          border: '1px solid rgba(58,133,128,0.22)',
          borderRadius: 22, padding: 22,
          boxShadow: '0 4px 20px rgba(58,133,128,0.12), 0 1px 4px rgba(28,116,112,0.06)',
          display: 'flex', flexDirection: 'column', height: '100%',
        }}>
          <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.6px' }}>Ativos</h2>
              <div style={{ width: 28, height: 2, background: '#3A8580', borderRadius: 1, marginTop: 6 }}/>
            </div>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 20, fontWeight: 700, color: '#2C7470', letterSpacing: '-0.3px' }}>{fmt(totalAtivos)}</span>
          </header>

          {/* Contas */}
          <RowBig
            icon={<IconBuildingBank size={20} stroke={1.8} color="#FFFFFF" />}
            corIcon="#3A8580"
            label="Contas"
            sub={`${contas.length} ${contas.length === 1 ? 'conta' : 'contas'}`}
            valor={saldoContas}
            pct={totalAtivos > 0 ? (saldoContas / totalAtivos) * 100 : 0}
            barCor="#3A8580"
            onClick={() => navigate('/contas')}
          />

          {/* Investimentos */}
          <RowBig
            icon={<IconChartLine size={20} stroke={1.8} color="#FFFFFF" />}
            corIcon="#1E7D5A"
            label="Investimentos"
            sub={`${investimentos.length} ${investimentos.length === 1 ? 'ativo' : 'ativos'} · rendimento ${fmt(rendimentoInvest)} (${totalAplicado > 0 ? ((rendimentoInvest / totalAplicado) * 100).toFixed(1) : '0'}%)`}
            valor={totalInvest}
            pct={totalAtivos > 0 ? (totalInvest / totalAtivos) * 100 : 0}
            barCor="#1E7D5A"
            onClick={() => navigate('/investimentos')}
          />

          {/* Distribuição da carteira por classe */}
          {totalInvest > 0 && (
            <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#1E7D5A', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                Distribuição da carteira
              </p>
              <div style={{ height: 6, background: 'rgba(28,116,112,0.08)', borderRadius: 3, overflow: 'hidden', display: 'flex', marginBottom: 8 }}>
                {(['fixa', 'variavel', 'cripto', 'caixa'] as const).map(c => {
                  const pct = totalInvest > 0 ? (distribuicaoInvest[c] / totalInvest) * 100 : 0
                  if (pct === 0) return null
                  return <div key={c} style={{ width: `${pct}%`, background: CLASSE_COR[c] }}/>
                })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(['fixa', 'variavel', 'cripto', 'caixa'] as const).map(c => {
                  const v = distribuicaoInvest[c]
                  if (v === 0) return null
                  const pct = totalInvest > 0 ? (v / totalInvest) * 100 : 0
                  return (
                    <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 2, background: CLASSE_COR[c] }}/>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#2C1A0F', flex: 1 }}>{CLASSE_LABEL[c]}</span>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#7A5C4F', fontWeight: 600 }}>{pct.toFixed(0)}%</span>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#2C1A0F', minWidth: 70, textAlign: 'right' }}>{fmt(v)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ─── PASSIVOS ─── */}
        <div style={{
          position: 'relative',
          background: '#F5E8E4',
          border: '1px solid rgba(196,85,59,0.2)',
          borderRadius: 22, padding: 22,
          boxShadow: '0 4px 20px rgba(196,85,59,0.13), 0 1px 4px rgba(168,68,43,0.06)',
          display: 'flex', flexDirection: 'column', height: '100%',
        }}>
          <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.6px' }}>Passivos</h2>
              <div style={{ width: 28, height: 2, background: '#C4553B', borderRadius: 1, marginTop: 6 }}/>
            </div>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 20, fontWeight: 700, color: '#A8442B', letterSpacing: '-0.3px' }}>{fmt(totalPassivos)}</span>
          </header>

          {totalPassivos === 0 ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '32px 24px', textAlign: 'center', gap: 10,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 18,
                background: 'rgba(58,133,128,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconShieldCheck size={28} stroke={1.6} color="#1E7D5A" />
              </div>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', margin: 0 }}>
                Sem dívidas
              </p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#7A5C4F', margin: 0 }}>
                Patrimônio totalmente livre de passivos
              </p>
            </div>
          ) : (
            <>
              <RowBig
                icon={<IconCash size={20} stroke={1.8} color="#FFFFFF" />}
                corIcon="#A8442B"
                label="Dívidas"
                sub={`${dividas.filter(d => !d.quitada).length} ativa(s) · parcela mensal ${fmt(totalParcelaMensal)}`}
                valor={totalDevido}
                pct={100}
                barCor="#A8442B"
                onClick={() => navigate('/dividas')}
              />

              {/* Breakdown por tipo */}
              {dividasPorTipo.length > 0 && (
                <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#A8442B', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                    Por tipo
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dividasPorTipo.map(([tipo, valor]) => {
                      const tm = DIV_TIPO_META.get(tipo as any)
                      const pct = totalDevido > 0 ? (valor / totalDevido) * 100 : 0
                      return (
                        <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {tm && <span style={{ width: 7, height: 7, borderRadius: 2, background: tm.cor }}/>}
                          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#2C1A0F', flex: 1 }}>{tm?.label ?? tipo}</span>
                          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#7A5C4F', fontWeight: 600 }}>{pct.toFixed(0)}%</span>
                          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#2C1A0F', minWidth: 70, textAlign: 'right' }}>{fmt(valor)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Evolução 12 meses ─── */}
      <section style={{
        background: '#FFFFFF', border: '1px solid #EDE6DC',
        borderRadius: 22, padding: '24px 28px',
        boxShadow: '0 4px 20px rgba(44,26,15,0.05), 0 1px 4px rgba(44,26,15,0.04)',
        marginBottom: 24,
      }}>
        <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.6px' }}>
              Evolução do patrimônio
            </h2>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', margin: '4px 0 0' }}>
              Últimos 12 meses — estimativa a partir do fluxo de caixa
            </p>
          </div>
        </header>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolucao}>
              <defs>
                <linearGradient id="grad-patrimonio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#3A8580" stopOpacity={0.4}/>
                  <stop offset="100%" stopColor="#3A8580" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(44,26,15,0.06)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, fill: '#7A5C4F' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, fill: '#9B7B6A' }}
                axisLine={false} tickLine={false}
                tickFormatter={v => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              />
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.[0] ? (
                    <div style={{ background: '#1A0A05', borderRadius: 10, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 5, letterSpacing: '.06em', textTransform: 'uppercase' }}>{payload[0].payload.mes}</p>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#A7E0DC' }}>{fmt(payload[0].value as number)}</p>
                    </div>
                  ) : null
                }
              />
              <Area type="monotone" dataKey="valor" stroke="#3A8580" strokeWidth={2.5} fill="url(#grad-patrimonio)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <QuickLink
          label="Gerenciar Contas"
          sub={`${contas.length} contas · ${fmt(saldoContas)}`}
          cor="#3A8580"
          onClick={() => navigate('/contas')}
        />
        <QuickLink
          label="Investimentos"
          sub={`${investimentos.length} ativos · ${fmt(totalInvest)}`}
          cor="#1E7D5A"
          onClick={() => navigate('/investimentos')}
        />
        <QuickLink
          label="Dívidas"
          sub={`${dividas.filter(d => !d.quitada).length} ativas · ${fmt(totalDevido)}`}
          cor="#A8442B"
          onClick={() => navigate('/dividas')}
        />
      </div>
    </motion.div>
  )
}

// ─── Hook auxiliar: evolução do patrimônio em 12 meses ───────────────
function useEvolucao12Meses(patrimonioAtual: number) {
  const txs = useLiveQuery(() => db.transacoes.toArray(), []) ?? []

  return useMemo(() => {
    const now = new Date()
    const meses: { mes: string; valor: number; data: Date }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      meses.push({
        mes: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toLowerCase(),
        valor: 0,
        data: d,
      })
    }
    // Trabalha de trás pra frente: valor do mês N = patrimônio atual - net cash flow desde N até hoje
    // Simplificado: assume rendimento de investimentos constante (omitido para simplificar).
    for (let i = meses.length - 1; i >= 0; i--) {
      const mesAtual = meses[i]
      if (i === meses.length - 1) {
        mesAtual.valor = patrimonioAtual
      } else {
        const proxMes = meses[i + 1]
        // Fluxo do próximo mês (do início ao fim)
        const inicio = proxMes.data
        const fim = new Date(proxMes.data.getFullYear(), proxMes.data.getMonth() + 1, 0)
        const inicioStr = inicio.toISOString().split('T')[0]
        const fimStr = fim.toISOString().split('T')[0]
        const txsDoMes = txs.filter(t => t.data >= inicioStr && t.data <= fimStr)
        const rec = txsDoMes.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
        const des = txsDoMes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
        const fluxo = rec - des
        // Patrimônio do mês atual = patrimônio do próximo - fluxo do próximo
        mesAtual.valor = proxMes.valor - fluxo
      }
    }
    return meses.map(m => ({ mes: m.mes.charAt(0).toUpperCase() + m.mes.slice(1), valor: Math.round(m.valor * 100) / 100 }))
  }, [txs, patrimonioAtual])
}

// ─── Subcomponentes ─────────────────────────────────────────────────
function HeroStat({ label, value, cor, icon, badge }: {
  label: string
  value: React.ReactNode
  cor: string
  icon?: React.ReactNode
  badge?: string
}) {
  return (
    <div>
      <p style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
        color: 'rgba(167,224,220,0.55)', letterSpacing: '.1em', textTransform: 'uppercase',
        margin: 0, display: 'flex', alignItems: 'center', gap: 5,
      }}>
        {icon}{label}
      </p>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 700, color: cor, margin: '4px 0 0', letterSpacing: '-0.3px', lineHeight: 1 }}>
        {value}
      </p>
      {badge && (
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: cor, margin: '4px 0 0', letterSpacing: '.04em' }}>{badge}</p>
      )}
    </div>
  )
}

function LegendItem({ cor, label, valor, total }: { cor: string; label: string; valor: number; total: number }) {
  const pct = total > 0 ? (valor / total) * 100 : 0
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: cor }}/>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>{label}</span>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: 'rgba(167,224,220,0.55)', marginLeft: 'auto' }}>{pct.toFixed(0)}%</span>
      </div>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: '2px 0 0', letterSpacing: '-0.3px' }}>
        {fmt(valor)}
      </p>
    </div>
  )
}

function RowBig({ icon, corIcon, label, sub, valor, pct, barCor, onClick }: {
  icon: React.ReactNode
  corIcon: string
  label: string
  sub: string
  valor: number
  pct: number
  barCor: string
  onClick?: () => void
}) {
  return (
    <button onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.6)',
        borderRadius: 14, padding: '14px 16px', cursor: onClick ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8,
        textAlign: 'left', width: '100%',
        transition: 'all .15s',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, background: corIcon,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F', margin: 0 }}>
            {label}
          </p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 500, color: '#7A5C4F', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sub}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', letterSpacing: '-0.3px' }}>{fmt(valor)}</span>
          {onClick && <IconChevronRight size={14} stroke={2} color="#9B7B6A" />}
        </div>
      </div>
      <div style={{ height: 4, background: 'rgba(44,26,15,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 22 }}
          style={{ height: '100%', background: barCor, borderRadius: 2 }}/>
      </div>
    </button>
  )
}

function QuickLink({ label, sub, cor, onClick }: { label: string; sub: string; cor: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: '#FFFFFF', border: '1px solid #EDE6DC',
      borderLeft: `3px solid ${cor}`, borderRadius: 14, padding: '14px 18px',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 2px 10px rgba(44,26,15,0.04)',
      textAlign: 'left',
    }}>
      <div>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F', margin: 0 }}>{label}</p>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', margin: '3px 0 0' }}>{sub}</p>
      </div>
      <IconChevronRight size={16} stroke={2} color={cor} />
    </button>
  )
}
