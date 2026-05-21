import { motion } from 'framer-motion'
import { useAllLancamentosAtivos, useCartoes } from '@/db/hooks/useCartoes'
import { fmt } from '@/lib/format'
import { Dobrao } from '@/components/mascot/Dobrao'
import { useState } from 'react'
import { db } from '@/db/schema'

function ParcelaRow({ lanc }: { lanc: any }) {
  const cartoes = useCartoes()
  const cartao = cartoes.find(c => c.id === lanc.cartaoId)
  const [catIcon, setCatIcon] = useState('💸')
  const [catCor, setCatCor] = useState('#9B8A7A')
  const pct = (lanc.parcelaAtual / lanc.totalParcelas) * 100
  const restantes = lanc.totalParcelas - lanc.parcelaAtual
  useState(() => { db.categorias.get(lanc.categoriaId).then(c => { if (c) { setCatIcon(c.icone); setCatCor(c.cor) } }) })

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 16, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: catCor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{catIcon}</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#2C1A0F' }}>{lanc.descricao}</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', marginTop: 1 }}>
            {cartao?.nome ?? 'Cartão'} · {restantes} parcela{restantes !== 1 ? 's' : ''} restante{restantes !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, fontWeight: 700, color: '#C4553B' }}>{fmt(lanc.valor)}/mês</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', marginTop: 1 }}>{lanc.parcelaAtual}/{lanc.totalParcelas}x</p>
        </div>
      </div>
      <div style={{ background: '#F0EAE2', borderRadius: 6, height: 6, overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          style={{ height: '100%', background: cartao?.cor ?? '#C4553B', borderRadius: 6 }} />
      </div>
    </motion.div>
  )
}

export function Page() {
  const lancamentos = useAllLancamentosAtivos()
  const parcelamentos = lancamentos.filter(l => l.totalParcelas > 1)
  const totalMensal = parcelamentos.reduce((s, l) => s + l.valor, 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '20px 16px', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F' }}>Parcelamentos</h1>
        {parcelamentos.length > 0 && (
          <div style={{ marginTop: 12, background: '#FAF0EE', borderRadius: 16, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#C4553B', marginBottom: 2 }}>COMPROMETIDO POR MÊS</p>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 700, color: '#2C1A0F' }}>{fmt(totalMensal)}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }}>{parcelamentos.length} parcelamento{parcelamentos.length !== 1 ? 's' : ''}</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', marginTop: 2 }}>em aberto</p>
            </div>
          </div>
        )}
      </div>

      {parcelamentos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Dobrao mood="happy" size={100} />
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', marginTop: 12 }}>Nenhum parcelamento</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginTop: 6 }}>Lance compras parceladas em Cartões</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {parcelamentos.map(l => <ParcelaRow key={l.id} lanc={l} />)}
        </div>
      )}
    </motion.div>
  )
}
