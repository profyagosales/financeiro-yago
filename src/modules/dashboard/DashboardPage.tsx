import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { Dobrao } from '@/components/mascot/Dobrao'
import { useContas, useSaldoTotal } from '@/db/hooks/useContas'
import { useTransacoes, useTotaisMes, useGastosPorCategoria } from '@/db/hooks/useTransacoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { db, seedCategories } from '@/db/schema'
import { fmt, fmtDate, mesAnoAtual } from '@/lib/format'

const C = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const I = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } } }

export function DashboardPage() {
  const { mes, ano } = mesAnoAtual()
  const contas = useContas()
  const saldoTotal = useSaldoTotal()
  const transacoes = useTransacoes(6)
  const { receitas, despesas } = useTotaisMes(mes, ano)
  const gastosPorCat = useGastosPorCategoria(mes, ano)
  const categorias = useCategorias('despesa')

  useEffect(() => { seedCategories() }, [])

  const topCats = categorias
    .map(c => ({ ...c, valor: gastosPorCat.get(c.id!) ?? 0 }))
    .filter(c => c.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5)

  const maxCat = topCats[0]?.valor ?? 1

  const saudacao = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  return (
    <motion.div variants={C} initial="hidden" animate="show"
      style={{ padding: '20px 16px', maxWidth: 680, margin: '0 auto' }}>

      {/* Header */}
      <motion.div variants={I} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
        <div>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginBottom: 2 }}>{saudacao()}, Yago!</p>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 32, fontWeight: 700, color: '#2C1A0F', lineHeight: 1, letterSpacing: '-1px' }}>
            {fmt(saldoTotal)}
          </h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 3 }}>
            Saldo total · {contas.length} {contas.length === 1 ? 'conta' : 'contas'}
          </p>
        </div>
        <Dobrao mood={saldoTotal < 0 ? 'sad' : 'happy'} size={70} />
      </motion.div>

      {/* Receitas / Despesas */}
      <motion.div variants={I} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#EBF5F0', borderRadius: 16, padding: '14px 16px' }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: '#3A8580', marginBottom: 4, letterSpacing: '.05em' }}>RECEITAS</p>
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F' }}>{fmt(receitas)}</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#3A8580', marginTop: 2 }}>este mês</p>
        </div>
        <div style={{ background: '#FAF0EE', borderRadius: 16, padding: '14px 16px' }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: '#C4553B', marginBottom: 4, letterSpacing: '.05em' }}>DESPESAS</p>
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F' }}>{fmt(despesas)}</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#C4553B', marginTop: 2 }}>este mês</p>
        </div>
      </motion.div>

      {/* Accounts */}
      {contas.length === 0 ? (
        <motion.div variants={I} style={{ background: '#FFFDF9', border: '1.5px dashed #E8E0D5', borderRadius: 20, padding: 24, textAlign: 'center', marginBottom: 20 }}>
          <Dobrao mood="sleeping" size={80} />
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', marginTop: 8 }}>Nenhuma conta ainda</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginTop: 4 }}>Adicione sua primeira conta em Contas</p>
        </motion.div>
      ) : (
        <motion.div variants={I} style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', marginBottom: 12 }}>Contas</h2>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {contas.map(c => (
              <motion.div key={c.id} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
                style={{ minWidth: 160, background: c.cor, borderRadius: 18, padding: 16, cursor: 'pointer', flexShrink: 0 }}>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: 'white', opacity: 0.7, marginBottom: 8 }}>{c.icone} {c.nome}</p>
                <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: 'white' }}>{fmt(c.saldoAtual)}</p>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: 'white', opacity: 0.6, marginTop: 4 }}>{c.tipo}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Category breakdown */}
      {topCats.length > 0 && (
        <motion.div variants={I} style={{ background: '#FFFDF9', borderRadius: 20, border: '0.5px solid #E8E0D5', padding: 18, marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', marginBottom: 14 }}>Gastos por categoria</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topCats.map((cat, i) => (
              <div key={cat.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F' }}>{cat.icone} {cat.nome}</span>
                  <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F' }}>{fmt(cat.valor)}</span>
                </div>
                <div style={{ background: '#F0EAE2', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${(cat.valor / maxCat) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25, delay: i * 0.07 }}
                    style={{ height: '100%', background: cat.cor, borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent transactions */}
      <motion.div variants={I}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F' }}>Últimas transações</h2>
        </div>

        {transacoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Dobrao mood="sleeping" size={72} />
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginTop: 8 }}>
              Sem transações ainda · toque no + para lançar
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {transacoes.map(async (tx, i) => {
              const cat = await db.categorias.get(tx.categoriaId)
              return (
                <motion.div key={tx.id}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }} whileHover={{ x: 2 }}
                  style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 13, background: cat?.cor ?? '#9B8A7A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {cat?.icone ?? '💸'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.descricao}</p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: 'white', background: cat?.cor ?? '#9B8A7A', padding: '1px 6px', borderRadius: 20 }}>{cat?.nome}</span>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#C4B4A8' }}>{fmtDate(tx.data)}</span>
                    </div>
                  </div>
                  <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, fontWeight: 700, color: tx.tipo === 'receita' ? '#3A8580' : '#C4553B', flexShrink: 0 }}>
                    {tx.tipo === 'receita' ? '+' : '−'}{fmt(tx.valor)}
                  </p>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      <div style={{ height: 24 }} />
    </motion.div>
  )
}
