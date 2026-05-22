import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Dobrao } from '@/components/mascot/Dobrao'
import { useContas, useSaldoTotal } from '@/db/hooks/useContas'
import { useTransacoes, useTotaisMes, useGastosPorCategoria } from '@/db/hooks/useTransacoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useContasFixas, usePagamentosFixos } from '@/db/hooks/useContasFixas'
import { useCartoes, useAllLancamentosAtivos } from '@/db/hooks/useCartoes'
import { useOrcamentos } from '@/db/hooks/useOrcamentos'
import { db, seedCategories } from '@/db/schema'
import { fmt, fmtDate, mesAnoAtual } from '@/lib/format'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { OdometroSaldo } from '@/components/ui/OdometroSaldo'
import {
  IconTrendingDown, IconAlertCircle, IconChevronRight,
  IconCalendarEvent, IconCreditCard, IconRepeat,
  IconCalendarStats, IconArrowUpRight, IconArrowDownRight,
} from '@tabler/icons-react'

const C = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const I = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 26 } } }

const CARD: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 20,
  border: '1px solid #EDE6DC',
  boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 20px rgba(44,26,15,0.06)',
}

const LABEL: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '.09em',
  textTransform: 'uppercase',
}

export function DashboardPage() {
  const { mes, ano } = mesAnoAtual()
  const navigate = useNavigate()
  const contas = useContas()
  const saldoTotal = useSaldoTotal()
  const transacoes = useTransacoes(5)
  const { receitas, despesas } = useTotaisMes(mes, ano)
  const gastosPorCat = useGastosPorCategoria(mes, ano)
  const categorias = useCategorias('despesa')
  const contasFixas = useContasFixas()
  const pagamentos = usePagamentosFixos(mes, ano)
  const parcelamentos = useAllLancamentosAtivos().filter(l => l.totalParcelas > 1)
  const orcamentos = useOrcamentos()
  const cartoes = useCartoes()

  useEffect(() => { seedCategories() }, [])

  const fixasPendentes = contasFixas.filter(cf => !pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const fixasPagas = contasFixas.filter(cf => pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const totalFixasMes = contasFixas.reduce((s, cf) => s + cf.valor, 0)
  const totalParcelamentos = parcelamentos.reduce((s, l) => s + l.valor, 0)
  const totalComprometido = despesas + fixasPendentes.reduce((s, cf) => s + cf.valor, 0) + totalParcelamentos
  const saldoLivre = receitas - totalComprometido

  const hoje = new Date().getDate()
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const diasRestantes = Math.max(1, diasNoMes - hoje + 1)
  const porDia = saldoLivre / diasRestantes

  const proximosVenc = contasFixas.filter(cf => {
    const pago = pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago')
    return !pago && cf.diaVencimento >= hoje && cf.diaVencimento <= hoje + 7
  }).sort((a, b) => a.diaVencimento - b.diaVencimento)

  const cartoesAlerta = cartoes.filter(c => {
    const dias = c.diaFechamento >= hoje ? c.diaFechamento - hoje : 31 - hoje + c.diaFechamento
    return dias <= 5
  })

  const pieData = categorias
    .map(c => ({ name: c.nome, value: gastosPorCat.get(c.id!) ?? 0, color: c.cor, cat: c }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  const h = new Date().getHours()
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  const mesNome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })

  return (
    <motion.div variants={C} initial="hidden" animate="show"
      style={{ padding: '24px 28px', width: '100%', maxWidth: 900 }}>

      {/* ─── Hero ─── */}
      <motion.div variants={I} style={{
        background: 'linear-gradient(148deg, #0D0604 0%, #1C0A06 100%)',
        borderRadius: 24,
        padding: '28px 28px 26px',
        marginBottom: 18,
        boxShadow: '0 20px 60px rgba(13,6,4,0.55), 0 4px 16px rgba(13,6,4,0.3)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>

        {/* Greeting + mascote */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.38)', letterSpacing: '.01em' }}>
            {saudacao}, Yago
          </p>
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '50%', padding: 3, border: '1px solid rgba(255,255,255,0.1)' }}>
            <Dobrao mood={saldoLivre < 0 ? 'sad' : 'happy'} size={50} />
          </div>
        </div>

        {/* Saldo total */}
        <OdometroSaldo value={saldoTotal} style={{
          fontFamily: "'Fraunces',Georgia,serif",
          fontSize: 46,
          fontWeight: 700,
          color: 'white',
          letterSpacing: '-2.5px',
          display: 'block',
          lineHeight: 1,
          marginBottom: 5,
        }} />
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.28)', marginBottom: 26 }}>
          saldo em {contas.length} conta{contas.length !== 1 ? 's' : ''}
        </p>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 22 }} />

        {/* Panorama label */}
        <p style={{ ...LABEL, color: 'rgba(255,255,255,0.28)', marginBottom: 18 }}>
          Panorama · {mesNome}
        </p>

        {/* Entradas / Saídas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 22 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
              <IconArrowUpRight size={11} color="#6EC9C4" stroke={2.5} />
              <span style={{ ...LABEL, color: '#6EC9C4' }}>Entradas</span>
            </div>
            <OdometroSaldo value={receitas} style={{
              fontFamily: "'Fraunces',Georgia,serif",
              fontSize: 22,
              fontWeight: 700,
              color: 'white',
              display: 'block',
              letterSpacing: '-0.5px',
            }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
              <IconArrowDownRight size={11} color="#F0957A" stroke={2.5} />
              <span style={{ ...LABEL, color: '#F0957A' }}>Saídas</span>
            </div>
            <OdometroSaldo value={totalComprometido} style={{
              fontFamily: "'Fraunces',Georgia,serif",
              fontSize: 22,
              fontWeight: 700,
              color: 'white',
              display: 'block',
              letterSpacing: '-0.5px',
            }} />
          </div>
        </div>

        {/* Breakdown */}
        {[
          { icon: IconTrendingDown, label: 'Gastos variáveis', valor: despesas },
          { icon: IconRepeat, label: `Contas fixas (${contasFixas.length})`, valor: totalFixasMes, sub: `${fixasPagas.length} pagas · ${fixasPendentes.length} pendentes` },
          { icon: IconCalendarStats, label: `Parcelamentos (${parcelamentos.length})`, valor: totalParcelamentos },
        ].filter(item => item.valor > 0).map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <item.icon size={12} color="rgba(255,255,255,0.28)" stroke={1.8} />
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.42)', flex: 1 }}>
              {item.label}
              {'sub' in item && item.sub ? <span style={{ opacity: .7 }}> · {item.sub}</span> : ''}
            </span>
            <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>{fmt(item.valor)}</span>
          </div>
        ))}

        {/* Saldo livre */}
        {receitas > 0 && (
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            marginTop: 14,
            paddingTop: 18,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <p style={{ ...LABEL, color: saldoLivre >= 0 ? '#6EC9C4' : '#F0957A', marginBottom: 6 }}>
                Saldo livre
              </p>
              <OdometroSaldo value={saldoLivre} style={{
                fontFamily: "'Fraunces',Georgia,serif",
                fontSize: 22,
                fontWeight: 700,
                color: 'white',
                display: 'block',
              }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ ...LABEL, color: 'rgba(255,255,255,0.28)', marginBottom: 6 }}>Por dia</p>
              <OdometroSaldo value={Math.max(0, porDia)} style={{
                fontFamily: "'Fraunces',Georgia,serif",
                fontSize: 18,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.6)',
                display: 'block',
              }} />
            </div>
          </div>
        )}
      </motion.div>

      {/* ─── Alerta vencimento ─── */}
      {proximosVenc.length > 0 && (
        <motion.div variants={I} style={{ ...CARD, padding: '16px 18px', marginBottom: 14, borderColor: '#F5DFA0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: '#FEF3CC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconAlertCircle size={14} color="#D4A017" stroke={2} />
            </div>
            <p style={{ ...LABEL, color: '#B8860B' }}>Vencimentos próximos</p>
          </div>
          {proximosVenc.slice(0, 3).map((cf, idx) => {
            const dias = cf.diaVencimento - hoje
            return (
              <div key={cf.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', paddingTop: idx > 0 ? 10 : 0, borderTop: idx > 0 ? '1px solid #F5F0E8' : 'none', marginTop: idx > 0 ? 10 : 0 }}
                onClick={() => navigate('/contas-fixas')}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: dias === 0 ? '#FEE2DC' : '#FEF8E6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconCalendarEvent size={17} color={dias === 0 ? '#C4553B' : '#D4A017'} stroke={1.8} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F' }}>{cf.nome}</p>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: dias === 0 ? '#C4553B' : '#C49A3C', fontWeight: 600, marginTop: 1 }}>
                    {dias === 0 ? 'Vence hoje!' : `Em ${dias} dia${dias !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, fontWeight: 700, color: '#2C1A0F' }}>{fmt(cf.valor)}</p>
                <IconChevronRight size={13} color="#C4B4A8" />
              </div>
            )
          })}
        </motion.div>
      )}

      {/* ─── Alerta cartão ─── */}
      {cartoesAlerta.length > 0 && (
        <motion.div variants={I} style={{ ...CARD, padding: '16px 18px', marginBottom: 14, borderColor: '#F5C8B8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: '#FEE2DC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCreditCard size={14} color="#C4553B" stroke={2} />
            </div>
            <p style={{ ...LABEL, color: '#A83828' }}>Fatura fechando em breve</p>
          </div>
          {cartoesAlerta.map((c, idx) => {
            const dias = c.diaFechamento >= hoje ? c.diaFechamento - hoje : 0
            return (
              <div key={c.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', paddingTop: idx > 0 ? 10 : 0, borderTop: idx > 0 ? '1px solid #F5F0E8' : 'none', marginTop: idx > 0 ? 10 : 0 }}
                onClick={() => navigate('/cartoes')}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: c.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconCreditCard size={17} color="white" stroke={1.8} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F' }}>{c.nome}</p>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: dias === 0 ? '#C4553B' : '#C49A3C', fontWeight: 600, marginTop: 1 }}>
                    {dias === 0 ? 'Fecha hoje!' : `Fecha em ${dias} dia${dias !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }}>dia {c.diaFechamento}</p>
                <IconChevronRight size={13} color="#C4B4A8" />
              </div>
            )
          })}
        </motion.div>
      )}

      {/* ─── Contas ─── */}
      {contas.length > 0 && (
        <motion.div variants={I} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F' }}>Contas</h2>
            <button onClick={() => navigate('/contas')}
              style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#C4553B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              Ver todas <IconChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {contas.map(c => (
              <motion.div key={c.id}
                whileHover={{ y: -3, boxShadow: '0 8px 28px rgba(44,26,15,0.12)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/transacoes?conta=${c.id}`)}
                style={{
                  minWidth: 148,
                  flexShrink: 0,
                  cursor: 'pointer',
                  background: '#FFFFFF',
                  borderRadius: 18,
                  padding: '15px 16px 14px',
                  border: '1px solid #EDE6DC',
                  borderTop: `3px solid ${c.cor}`,
                  boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 14px rgba(44,26,15,0.05)',
                  transition: 'box-shadow .18s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: c.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>{c.icone}</span>
                  </div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#7A5C4F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</p>
                </div>
                <OdometroSaldo value={c.saldoAtual} style={{
                  fontFamily: "'Fraunces',Georgia,serif",
                  fontSize: 19,
                  fontWeight: 700,
                  color: c.saldoAtual < 0 ? '#C4553B' : '#2C1A0F',
                  display: 'block',
                  letterSpacing: '-0.5px',
                }} />
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#C4B4A8', marginTop: 3, textTransform: 'capitalize' }}>{c.tipo}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── Gastos por categoria ─── */}
      {pieData.length > 0 && (
        <motion.div variants={I} style={{ ...CARD, padding: '18px 20px', marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F' }}>Gastos por categoria</h2>
            <button onClick={() => navigate('/relatorios')}
              style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#C4553B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              Relatórios <IconChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 118, height: 118, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={34} outerRadius={54} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)}
                    contentStyle={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, borderRadius: 10, border: 'none', background: '#2C1A0F', color: 'white', padding: '6px 12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, minWidth: 140 }}>
              {pieData.map(d => {
                const orc = orcamentos.find(o => o.categoriaId === d.cat.id)
                const pct = orc ? Math.min(100, (d.value / orc.valorLimite) * 100) : null
                return (
                  <div key={d.name}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: pct !== null ? 4 : 0 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#2C1A0F', flex: 1 }}>{d.name}</span>
                      <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F' }}>{fmt(d.value)}</span>
                    </div>
                    {pct !== null && (
                      <div style={{ background: '#F0EAE2', borderRadius: 3, height: 3, overflow: 'hidden', marginLeft: 15 }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                          style={{ height: '100%', background: pct > 90 ? '#C4553B' : pct > 75 ? '#D4A017' : d.color, borderRadius: 3 }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Últimas transações ─── */}
      <motion.div variants={I}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F' }}>Últimas transações</h2>
          <button onClick={() => navigate('/transacoes')}
            style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#C4553B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            Ver todas <IconChevronRight size={14} />
          </button>
        </div>

        {transacoes.length === 0 ? (
          <div style={{ ...CARD, textAlign: 'center', padding: '36px 0' }}>
            <Dobrao mood="sleeping" size={72} />
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginTop: 8 }}>
              Sem transações · toque no + para lançar
            </p>
          </div>
        ) : (
          <div style={{ ...CARD, overflow: 'hidden' }}>
            {transacoes.map((tx, i) => (
              <TxRowDash key={tx.id} tx={tx} i={i} last={i === transacoes.length - 1} />
            ))}
          </div>
        )}
      </motion.div>

      <div style={{ height: 32 }} />
    </motion.div>
  )
}

function TxRowDash({ tx, i, last }: { tx: any; i: number; last: boolean }) {
  const [cat, setCat] = useState<any>(null)
  useEffect(() => { db.categorias.get(tx.categoriaId).then(setCat) }, [tx.categoriaId])

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.14 + i * 0.04, type: 'spring', stiffness: 280, damping: 26 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 18px',
        borderBottom: last ? 'none' : '1px solid #F5F0EA',
      }}>
      {cat && <CategoryIcon nome={cat.nome} cor={cat.cor} size={42} radius={13} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {tx.descricao}
        </p>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', marginTop: 2 }}>
          {cat?.nome} · {fmtDate(tx.data)}
        </p>
      </div>
      <OdometroSaldo value={tx.valor} style={{
        fontFamily: "'Fraunces',Georgia,serif",
        fontSize: 15,
        fontWeight: 700,
        color: tx.tipo === 'receita' ? '#3A8580' : '#C4553B',
        flexShrink: 0,
        display: 'block',
      }} />
    </motion.div>
  )
}
