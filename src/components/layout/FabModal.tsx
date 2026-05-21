import { useState } from 'react'
import { motion } from 'framer-motion'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useContas } from '@/db/hooks/useContas'
import { addTransacao } from '@/db/hooks/useTransacoes'
import { todayISO } from '@/lib/format'

export function FabModal({ onClose }: { onClose: () => void }) {
  const [tipo, setTipo] = useState<'despesa' | 'receita'>('despesa')
  const [valor, setValor] = useState('')
  const [desc, setDesc] = useState('')
  const [catId, setCatId] = useState<number | null>(null)
  const [contaId, setContaId] = useState<number | null>(null)
  const [data, setData] = useState(todayISO())
  const [saving, setSaving] = useState(false)

  const categorias = useCategorias(tipo)
  const contas = useContas()

  const handleSave = async () => {
    const num = parseFloat(valor.replace(',', '.'))
    if (!num || !catId || !contaId) return
    setSaving(true)
    await addTransacao({
      data, valor: num, tipo, contaId, categoriaId: catId,
      descricao: desc || categorias.find(c => c.id === catId)?.nome || '',
      status: 'confirmado',
    })
    setSaving(false)
    onClose()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px' }}>

        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E0D5', margin: '0 auto 18px' }} />
        <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', marginBottom: 16 }}>Novo lançamento</h2>

        {/* Type */}
        <div style={{ display: 'flex', background: '#F5F0E8', borderRadius: 12, padding: 4, marginBottom: 16 }}>
          {(['despesa','receita'] as const).map(t => (
            <button key={t} onClick={() => { setTipo(t); setCatId(null) }}
              style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: 'none', cursor: 'pointer', transition: 'all .15s',
                background: tipo === t ? (t === 'despesa' ? '#C4553B' : '#3A8580') : 'transparent',
                color: tipo === t ? 'white' : '#9B7B6A',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600 }}>
              {t === 'despesa' ? '− Despesa' : '+ Receita'}
            </button>
          ))}
        </div>

        {/* Value */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', gap: 6, marginBottom: 12 }}>
          <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, color: tipo === 'despesa' ? '#C4553B' : '#3A8580', fontWeight: 700 }}>R$</span>
          <input value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" type="tel"
            style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none', width: '100%' }} />
        </div>

        {/* Description */}
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição (opcional)"
          style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 12 }} />

        {/* Date */}
        <input value={data} onChange={e => setData(e.target.value)} type="date"
          style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 12 }} />

        {/* Account */}
        {contas.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 6 }}>CONTA</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {contas.map(c => (
                <button key={c.id} onClick={() => setContaId(c.id!)}
                  style={{ padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: contaId === c.id ? c.cor : '#F5F0E8',
                    color: contaId === c.id ? 'white' : '#7A5C4F',
                    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all .15s' }}>
                  {c.icone} {c.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 6 }}>CATEGORIA</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {categorias.map(c => (
              <button key={c.id} onClick={() => setCatId(c.id!)}
                style={{ padding: '5px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  background: catId === c.id ? c.cor : '#F5F0E8',
                  color: catId === c.id ? 'white' : '#7A5C4F',
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all .15s' }}>
                <span style={{ fontSize: 14 }}>{c.icone}</span>{c.nome}
              </button>
            ))}
          </div>
        </div>

        <motion.button onClick={handleSave} whileTap={{ scale: 0.97 }}
          disabled={!valor || !catId || saving}
          style={{ width: '100%', padding: '15px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: !valor || !catId ? '#E8E0D5' : '#C4553B',
            color: !valor || !catId ? '#9B7B6A' : 'white',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, transition: 'all .2s' }}>
          {saving ? 'Salvando...' : 'Salvar lançamento'}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
