import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { Dobrao } from '@/components/mascot/Dobrao'
import { useContas, useSaldoTotal } from '@/db/hooks/useContas'
import { useTransacoes, useTotaisMes, useGastosPorCategoria } from '@/db/hooks/useTransacoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { db, seedCategories } from '@/db/schema'
import { fmt, fmtDate, mesAnoAtual } from '@/lib/format'
import { IconTrendingUp, IconTrendingDown, IconPlus } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

const C = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const I = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } } }

export function DashboardPage() {
  const { mes, ano } = mesAnoAtual()
  const navigate = useNavigate()
  const contas = useContas()
  const saldoTotal = useSaldoTotal()
  const transacoes = useTransacoes(6)
  const { receitas, despesas } = useTotaisMes(mes, ano)
  const gastosPorCat = useGastosPorCategoria(mes, ano)
  const categorias = useCategorias('despesa')

  useEffect(() => { seedCategories() }, [])

  const topCats = categorias.map(c => ({ ...c, valor: gastosPorCat.get(c.id!) ?? 0 }))
    .filter(c => c.valor > 0).sort((a, b) => b.valor - a.valor).slice(0, 5)
  const maxCat = topCats[0]?.valor ?? 1

  const h = new Date().getHours()
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <motion.div variants={C} initial="hidden" animate="show" style={{ padding: '24px 20px', maxWidth: 680, margin: '0 auto' }}>

      <motion.div variants={I} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 12 }}>
        <div>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginBottom: 4 }}>{saudacao}, Yago!</p>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 38, fontWeight: 700, color: '#2C1A0F', lineHeight: 1, letterSpacing: '-1.5px' }}>
            {fmt(saldoTotal)}
          </h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 4 }}>
            Saldo total · {contas.length} conta{contas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Dobrao mood={saldoTotal < 0 ? 'sad' : 'happy'} size={72} />
      </motion.div>

      <motion.div variants={I} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#EBF5F0', borderRadius: 18, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <IconTrendingUp size={14} color="#3A8580" stroke={2} />
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#3A8580', letterSpacing: '.05em' }}>RECEITAS</p>
          </div>
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F' }}>{fmt(receitas)}</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#3A8580', marginTop: 2 }}>este mês</p>
        </div>
        <div style={{ background: '#FAF0EE', borderRadius: 18, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <IconTrendingDown size={14} color="#C4553B" stroke={2} />
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#C4553B', letterSpacing: '.05em' }}>DESPESAS</p>
          </div>
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F' }}>{fmt(despesas)}</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#C4553B', marginTop: 2 }}>este mês</p>
        </div>
      </motion.div>

      {contas.length === 0 ? (
        <motion.div variants={I} style={{ background: '#FFFDF9', border: '1.5px dashed #E8E0D5', borderRadius: 20, padding: '32px 24px', textAlign: 'center', marginBottom: 24, cursor: 'pointer' }} onClick={() => navigate('/contas')}>
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 17, fontWeight: 700, color: '#2C1A0F', marginBottom: 6 }}>Nenhuma conta ainda</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A' }}>Toque para adicionar sua primeira conta</p>
        </motion.div>
      ) : (
        <motion.div variants={I} style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', marginBottom: 12 }}>Contas</h2>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {contas.map(c => (
              <motion.div key={c.id} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
                style={{ minWidth: 160, background: c.cor, borderRadius: 18, padding: '16px', cursor: 'pointer', flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'Georgia,serif', fontSize: 10, fontWeight: 700, color: 'white' }}>{c.icone}</span>
                </div>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>{c.nome}</p>
                <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: 'white' }}>{fmt(c.saldoAtual)}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {topCats.length > 0 && (
        <motion.div variants={I} style={{ background: '#FFFDF9', borderRadius: 20, border: '0.5px solid #E8E0D5', padding: 18, marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', marginBottom: 14 }}>Gastos por categoria</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topCats.map((cat, i) => (
              <div key={cat.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F' }}>{cat.icone} {cat.nome}</span>
                  <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F' }}>{fmt(cat.valor)}</span>
                </div>
                <div style={{ background: '#F0EAE2', borderRadius: 6, height: 7, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(cat.valor / maxCat) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25, delay: i * 0.07 }}
                    style={{ height: '100%', background: cat.cor, borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div variants={I}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F' }}>Últimas transações</h2>
          <button onClick={() => navigate('/transacoes')} style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#C4553B', background: 'none', border: 'none', cursor: 'pointer' }}>Ver todas</button>
        </div>
        {transacoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A' }}>Sem transações · toque no + para lançar</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {transacoes.map((tx, i) => (
              <TxRowDash key={tx.id} tx={tx} i={i} />
            ))}
          </div>
        )}
      </motion.div>

      <div style={{ height: 24 }} />
    </motion.div>
  )
}

function TxRowDash({ tx, i }: { tx: any; i: number }) {
  const [cat, setCat] = useState<any>(null)
  useEffect(() => { db.categorias.get(tx.categoriaId).then(setCat) }, [tx.categoriaId])
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
      style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 14, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: cat?.cor ?? '#9B8A7A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
        {cat?.icone ?? '💸'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.descricao}</p>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#C4B4A8', marginTop: 1 }}>{cat?.nome} · {fmtDate(tx.data)}</p>
      </div>
      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700, color: tx.tipo === 'receita' ? '#3A8580' : '#C4553B', flexShrink: 0 }}>
        {tx.tipo === 'receita' ? '+' : '−'}{fmt(tx.valor)}
      </p>
    </motion.div>
  )
}

import { useState } from 'react'
