import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useContasFixas, usePagamentosFixos, addContaFixa, editContaFixa, marcarPago, marcarPendente, deleteContaFixa } from '@/db/hooks/useContasFixas'
import { useContas } from '@/db/hooks/useContas'
import { useCartoes } from '@/db/hooks/useCartoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { BandeiraLogo } from '@/components/ui/BandeiraLogo'
import { fmt } from '@/lib/format'
import type { Categoria, Conta, Cartao, ContaFixa } from '@/db/schema'
import { IconPlus, IconX, IconTrash, IconCheck, IconEdit, IconChevronLeft, IconChevronRight, IconAlertTriangle, IconCircleCheck, IconCalendarDue, IconTrendingUp, IconCalendar, IconFlame, IconBuildingBank, IconCreditCard, IconCalendarRepeat } from '@tabler/icons-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

// ─── Typography tokens ───────────────────────────────────────────────
const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }
const NUM: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.1 }
const LABEL: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }
const SUB: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }
const TEXT: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif" }

// ─── Helpers ──────────────────────────────────────────────────────────
const MESES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function daysInMonth(mes: number, ano: number) {
  return new Date(ano, mes, 0).getDate()
}
function firstWeekdayOfMonth(mes: number, ano: number) {
  return new Date(ano, mes - 1, 1).getDay()
}

// ─── Page ─────────────────────────────────────────────────────────────
export function ContasFixasDesktop() {
  const today = new Date()
  const [view, setView] = useState({ mes: today.getMonth() + 1, ano: today.getFullYear() })
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const contasFixas = useContasFixas()
  const pagamentos = usePagamentosFixos(view.mes, view.ano)
  const categorias = useCategorias('despesa')
  const contas = useContas()
  const cartoes = useCartoes()

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [payingWithFee, setPayingWithFee] = useState<ContaFixa | null>(null)
  const [feeForm, setFeeForm] = useState({ juros: '', multa: '' })
  const [paymentMethod, setPaymentMethod] = useState<'conta' | 'cartao'>('conta')
  const [form, setForm] = useState({ nome: '', valor: '', diaVencimento: 10, categoriaId: null as number | null, contaId: null as number | null, cartaoId: null as number | null })

  // Lock body scroll quando qualquer modal estiver aberto
  useBodyScrollLock(adding || confirmDelete !== null || payingWithFee !== null)

  // Mapas de apoio
  const catMap = useMemo(() => new Map(categorias.map(c => [c.id!, c])), [categorias])
  const pgtoMap = useMemo(() => new Map(pagamentos.map(p => [p.contaFixaId, p])), [pagamentos])

  // KPIs
  const totalMes = contasFixas.reduce((s, cf) => s + cf.valor, 0)
  const fixasPagas = contasFixas.filter(cf => pgtoMap.get(cf.id!)?.status === 'pago')
  const fixasPendentes = contasFixas.filter(cf => pgtoMap.get(cf.id!)?.status !== 'pago')
  const totalPago = fixasPagas.reduce((s, cf) => s + cf.valor, 0)
  const totalPendente = totalMes - totalPago
  const totalAnualizado = totalMes * 12
  const pctPago = totalMes > 0 ? (totalPago / totalMes) * 100 : 0

  // Insights
  const maiorFixa = useMemo(() => [...contasFixas].sort((a, b) => b.valor - a.valor)[0], [contasFixas])
  const proximaPendente = useMemo(() => {
    const hoje = today.getDate()
    const isCurrentMonth = view.mes === today.getMonth() + 1 && view.ano === today.getFullYear()
    const pend = fixasPendentes.map(cf => {
      const dias = cf.diaVencimento - (isCurrentMonth ? hoje : 0)
      return { cf, dias }
    }).filter(x => x.dias >= 0).sort((a, b) => a.dias - b.dias)
    return pend[0] ?? null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixasPendentes, view.mes, view.ano])
  // Dia com mais concentração de vencimentos
  const diasConcentracao = useMemo(() => {
    const map = new Map<number, number>()
    contasFixas.forEach(cf => map.set(cf.diaVencimento, (map.get(cf.diaVencimento) ?? 0) + cf.valor))
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [contasFixas])
  const diaPico = diasConcentracao[0]

  // Agrupamento por categoria
  const groupedByCat = useMemo(() => {
    const map = new Map<number, { categoria: Categoria; items: ContaFixa[]; total: number }>()
    contasFixas.forEach(cf => {
      const cat = catMap.get(cf.categoriaId)
      if (!cat) return
      if (!map.has(cat.id!)) map.set(cat.id!, { categoria: cat, items: [], total: 0 })
      const g = map.get(cat.id!)!
      g.items.push(cf)
      g.total += cf.valor
    })
    // Ordenar grupos por total decrescente; itens dentro por dia de vencimento
    return [...map.values()]
      .map(g => ({ ...g, items: g.items.sort((a, b) => a.diaVencimento - b.diaVencimento) }))
      .sort((a, b) => b.total - a.total)
  }, [contasFixas, catMap])

  // Period selector
  const goPrev = () => setView(v => { const m = v.mes - 1; return m < 1 ? { mes: 12, ano: v.ano - 1 } : { mes: m, ano: v.ano } })
  const goNext = () => setView(v => { const m = v.mes + 1; return m > 12 ? { mes: 1, ano: v.ano + 1 } : { mes: m, ano: v.ano } })
  const isCurrentMonth = view.mes === today.getMonth() + 1 && view.ano === today.getFullYear()
  const labelMes = `${MESES_FULL[view.mes - 1]} ${view.ano}`

  // Form helpers
  const openEdit = (cf: ContaFixa) => {
    setEditingId(cf.id!)
    setPaymentMethod(cf.cartaoId ? 'cartao' : 'conta')
    setForm({ nome: cf.nome, valor: String(cf.valor), diaVencimento: cf.diaVencimento, categoriaId: cf.categoriaId, contaId: cf.contaId ?? null, cartaoId: cf.cartaoId ?? null })
    setAdding(true)
  }
  const resetForm = () => {
    setForm({ nome: '', valor: '', diaVencimento: 10, categoriaId: null, contaId: null, cartaoId: null })
    setPaymentMethod('conta')
  }
  const handleSave = async () => {
    if (!form.nome || !form.valor || !form.categoriaId) return
    const data = {
      nome: form.nome,
      valor: parseFloat(form.valor.replace(',', '.')),
      diaVencimento: form.diaVencimento,
      categoriaId: form.categoriaId,
      contaId: paymentMethod === 'conta' ? form.contaId : null,
      cartaoId: paymentMethod === 'cartao' ? (form.cartaoId ?? undefined) : undefined,
    }
    if (editingId !== null) await editContaFixa(editingId, data)
    else await addContaFixa({ ...data, recorrencia: 'mensal', alertaDiasAntes: 3, ativo: true })
    setAdding(false); setEditingId(null)
    resetForm()
  }

  // Scroll to day refs
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})
  useEffect(() => {
    if (selectedDay === null) return
    // tenta scrollar até o primeiro item daquele dia
    const firstId = contasFixas.find(cf => cf.diaVencimento === selectedDay)?.id
    if (firstId) {
      const el = itemRefs.current[String(firstId)]
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [selectedDay, contasFixas])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%' }}>

      {/* ─── STICKY HEADER ───────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: '24px 32px 18px',
        borderBottom: '1px solid #EDE6DC',
        background: '#FFFFFF',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24,
      }}>
        <div>
          <h1 style={{ ...DISPLAY as object, fontSize: 38, color: '#2C1A0F', letterSpacing: '-1.5px', margin: 0 }}>Contas Fixas</h1>
        </div>

        {/* Period selector + Adicionar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FAF6F0', border: '1px solid #EDE6DC', borderRadius: 12, padding: 4 }}>
            <button onClick={goPrev} style={{ background: 'transparent', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconChevronLeft size={16} color="#7A5C4F" stroke={2} />
            </button>
            <div style={{ minWidth: 140, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <span style={{ ...TEXT, fontSize: 13, fontWeight: 700, color: '#2C1A0F' }}>{labelMes}</span>
              {isCurrentMonth && <span style={{ ...LABEL as object, fontSize: 8, color: '#3A8580' }}>Atual</span>}
            </div>
            <button onClick={goNext} style={{ background: 'transparent', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconChevronRight size={16} color="#7A5C4F" stroke={2} />
            </button>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditingId(null); resetForm(); setAdding(true) }}
            style={{ background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: 'white', border: 'none', borderRadius: 12, padding: '10px 18px', ...TEXT, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 16px rgba(196,85,59,0.35)', flexShrink: 0 }}>
            <IconPlus size={16} stroke={2.5} /> Adicionar
          </motion.button>
        </div>
      </div>

      {/* ─── KPIs strip ─────────────────────────────────────────── */}
      {contasFixas.length > 0 && (
        <div style={{ flexShrink: 0, padding: '16px 32px', borderBottom: '1px solid #EDE6DC', background: '#FBF8F3' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            <Kpi label="Pago" value={fmt(totalPago)} sub={`${fixasPagas.length} de ${contasFixas.length}`} cor="#3A8580" bg="#EBF5F0" border="rgba(58,133,128,0.15)" />
            <Kpi label="Pendente" value={fmt(totalPendente)} sub={`${fixasPendentes.length} ${fixasPendentes.length === 1 ? 'conta' : 'contas'}`} cor="#C4553B" bg="#FAF0EE" border="rgba(196,85,59,0.15)" />
            <Kpi label="Total mês" value={fmt(totalMes)} sub={`${Math.round(pctPago)}% concluído`} cor="#2C1A0F" bg="#F5F0E8" border="rgba(44,26,15,0.08)" />
            <Kpi label="Anualizado" value={fmt(totalAnualizado)} sub="projeção 12 meses" cor="#504E76" bg="#F0EEF7" border="rgba(80,78,118,0.15)" />
            <Kpi label="Progresso" value={`${Math.round(pctPago)}%`} sub={pctPago === 100 ? 'Tudo pago' : `${fmt(totalPendente)} restante`} cor="#D4A017" bg="#FDF4E3" border="rgba(212,160,23,0.18)" progress={pctPago} />
          </div>
        </div>
      )}

      {/* ─── MAIN: 2 COLUNAS ────────────────────────────────────── */}
      {contasFixas.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 40 }}>
          <div
            style={{
              width: 104, height: 104, borderRadius: 30,
              background: 'linear-gradient(135deg, rgba(241,100,46,0.10), rgba(196,85,59,0.04))',
              border: '1px solid rgba(196,85,59,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <IconCalendarRepeat size={52} stroke={1.4} color="#C4553B" style={{ opacity: 0.55 }} />
          </div>
          <p style={{ ...DISPLAY as object, fontSize: 22, color: '#2C1A0F', marginTop: 18 }}>Nenhuma conta fixa</p>
          <p style={{ ...SUB as object, fontSize: 14, marginTop: 6, textAlign: 'center', maxWidth: 320 }}>
            Aluguel, internet, streaming, assinaturas... toda despesa que se repete todo mês.
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '420px 1fr', gap: 0, overflow: 'hidden' }}>

          {/* ─── LEFT: Calendar + Insights ────────────────────── */}
          <div style={{ overflowY: 'auto', padding: '20px 24px 24px', borderRight: '1px solid #EDE6DC', background: '#FBF8F3' }}>
            <MiniCalendar
              mes={view.mes}
              ano={view.ano}
              contasFixas={contasFixas}
              catMap={catMap}
              pgtoMap={pgtoMap}
              selectedDay={selectedDay}
              onSelectDay={d => setSelectedDay(prev => prev === d ? null : d)}
              isCurrentMonth={isCurrentMonth}
              todayDate={today.getDate()}
            />

            {/* ─── Insights box ─────────────────────────── */}
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ ...LABEL as object, color: '#9B7B6A' }}>Insights</span>

              {proximaPendente && (
                <InsightRow
                  icon={<IconCalendarDue size={16} stroke={2} color="#D4A017" />}
                  label="Próximo vencimento"
                  value={proximaPendente.cf.nome}
                  hint={proximaPendente.dias === 0 ? 'hoje' : proximaPendente.dias === 1 ? 'amanhã' : `em ${proximaPendente.dias} dias`}
                  amount={fmt(proximaPendente.cf.valor)}
                  cor="#D4A017"
                />
              )}

              {maiorFixa && (
                <InsightRow
                  icon={<IconFlame size={16} stroke={2} color="#C4553B" />}
                  label="Maior gasto fixo"
                  value={maiorFixa.nome}
                  hint={`${((maiorFixa.valor / totalMes) * 100).toFixed(0)}% do total mensal`}
                  amount={fmt(maiorFixa.valor)}
                  cor="#C4553B"
                />
              )}

              {diaPico && (
                <InsightRow
                  icon={<IconCalendar size={16} stroke={2} color="#504E76" />}
                  label="Dia de pico"
                  value={`Dia ${diaPico[0]}`}
                  hint={`${contasFixas.filter(cf => cf.diaVencimento === diaPico[0]).length} ${contasFixas.filter(cf => cf.diaVencimento === diaPico[0]).length === 1 ? 'conta' : 'contas'} vencem`}
                  amount={fmt(diaPico[1])}
                  cor="#504E76"
                />
              )}

              <InsightRow
                icon={<IconTrendingUp size={16} stroke={2} color="#3A8580" />}
                label="Custo anualizado"
                value="12 meses corridos"
                hint="se nada mudar"
                amount={fmt(totalAnualizado)}
                cor="#3A8580"
              />
            </div>
          </div>

          {/* ─── RIGHT: Lista agrupada ─────────────────────── */}
          <div style={{ overflowY: 'auto', padding: '20px 28px 32px' }}>
            {selectedDay !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '10px 14px', background: '#FFF5E5', border: '1px solid #F0D8A8', borderRadius: 12 }}>
                <IconCalendarDue size={16} color="#D4A017" stroke={2} />
                <span style={{ ...TEXT, fontSize: 13, fontWeight: 600, color: '#7A5C4F' }}>
                  Filtrando dia <strong style={{ color: '#2C1A0F' }}>{selectedDay}</strong> · {contasFixas.filter(cf => cf.diaVencimento === selectedDay).length} {contasFixas.filter(cf => cf.diaVencimento === selectedDay).length === 1 ? 'conta' : 'contas'}
                </span>
                <button onClick={() => setSelectedDay(null)} style={{ marginLeft: 'auto', background: 'rgba(212,160,23,0.15)', border: 'none', borderRadius: 8, padding: '4px 10px', ...TEXT, fontSize: 11, fontWeight: 700, color: '#A8730F', cursor: 'pointer' }}>
                  Limpar filtro
                </button>
              </div>
            )}

            {groupedByCat.map(grupo => {
              const itemsFiltered = selectedDay === null
                ? grupo.items
                : grupo.items.filter(cf => cf.diaVencimento === selectedDay)
              if (itemsFiltered.length === 0) return null

              return (
                <div key={grupo.categoria.id} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', marginBottom: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, background: `${grupo.categoria.cor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: grupo.categoria.cor }} />
                    </div>
                    <span style={{ ...LABEL as object, fontSize: 11, color: '#2C1A0F' }}>{grupo.categoria.nome}</span>
                    <div style={{ flex: 1, height: 1, background: '#EDE6DC' }} />
                    <span style={{ ...NUM as object, fontSize: 12, color: '#7A5C4F' }}>{itemsFiltered.length}/{grupo.items.length}</span>
                    <span style={{ ...NUM as object, fontSize: 13, color: '#2C1A0F' }}>{fmt(grupo.total)}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {itemsFiltered.map(cf => {
                      const pgto = pgtoMap.get(cf.id!)
                      const pago = pgto?.status === 'pago'
                      const contaVinc = contas.find(c => c.id === cf.contaId)
                      const cartaoVinc = cartoes.find(c => c.id === cf.cartaoId)
                      const dias = isCurrentMonth ? cf.diaVencimento - today.getDate() : null
                      const vencida = !pago && isCurrentMonth && (dias ?? 0) < 0
                      const urgente = !pago && isCurrentMonth && (dias ?? 99) >= 0 && (dias ?? 99) <= 3

                      return (
                        <CompactRow
                          key={cf.id}
                          refSetter={el => { itemRefs.current[String(cf.id!)] = el }}
                          cf={cf}
                          categoria={grupo.categoria}
                          conta={contaVinc}
                          cartao={cartaoVinc}
                          pago={pago}
                          valorPago={pgto?.valor}
                          vencida={vencida}
                          urgente={urgente}
                          dias={dias}
                          isCurrentMonth={isCurrentMonth}
                          highlighted={selectedDay === cf.diaVencimento}
                          onPagar={() => {
                            if (vencida) {
                              setFeeForm({ juros: '', multa: '' })
                              setPayingWithFee(cf)
                            } else {
                              marcarPago(cf.id!, view.mes, view.ano, cf.valor)
                            }
                          }}
                          onPagarComJuros={() => {
                            setFeeForm({ juros: '', multa: '' })
                            setPayingWithFee(cf)
                          }}
                          onDesfazer={() => marcarPendente(cf.id!, view.mes, view.ano)}
                          onEdit={() => openEdit(cf)}
                          onDelete={() => setConfirmDelete(cf.id!)}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {selectedDay !== null && groupedByCat.every(g => g.items.filter(cf => cf.diaVencimento === selectedDay).length === 0) && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ ...DISPLAY as object, fontSize: 18, color: '#2C1A0F' }}>Nenhuma conta vence no dia {selectedDay}</p>
                <p style={{ ...SUB as object, fontSize: 13, marginTop: 6 }}>Tente outro dia ou limpe o filtro.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: Add/Edit ─────────────────────────────────────── */}
      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAdding(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 560, background: '#FFFDF9', borderRadius: 24, padding: '24px 26px 28px', maxHeight: '90dvh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(13,6,4,0.4)' }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ ...DISPLAY as object, fontSize: 22, color: '#2C1A0F' }}>{editingId ? 'Editar conta fixa' : 'Nova conta fixa'}</h3>
                <button onClick={() => setAdding(false)} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconX size={16} color="#9B7B6A" />
                </button>
              </div>

              <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 6 }}>Nome</p>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Aluguel, Internet, Spotify..."
                style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 14, padding: '13px 16px', ...TEXT, fontSize: 14, outline: 'none', marginBottom: 14, boxSizing: 'border-box', color: '#2C1A0F' }} />

              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 6 }}>Valor</p>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 14, padding: '12px 14px', gap: 6 }}>
                    <span style={{ ...NUM as object, fontSize: 18, color: '#C4553B' }}>R$</span>
                    <input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" type="tel"
                      style={{ border: 'none', background: 'transparent', ...TEXT, fontSize: 22, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none', width: '100%' }} />
                  </div>
                </div>
                <div style={{ width: 100 }}>
                  <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 6 }}>Dia Vence</p>
                  <input value={form.diaVencimento} onChange={e => setForm(f => ({ ...f, diaVencimento: parseInt(e.target.value) || 1 }))} type="number" min="1" max="31"
                    style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 14, padding: '12px 0', ...TEXT, fontSize: 22, fontWeight: 700, color: '#2C1A0F', outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} />
                </div>
              </div>

              <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 10 }}>Categoria</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8, marginBottom: 16 }}>
                {categorias.map(c => (
                  <motion.button key={c.id} onClick={() => setForm(f => ({ ...f, categoriaId: c.id! }))} whileTap={{ scale: 0.92 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 4px', borderRadius: 14, border: form.categoriaId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', background: form.categoriaId === c.id ? `${c.cor}12` : 'white', cursor: 'pointer', transition: 'all .15s' }}>
                    <CategoryIcon nome={c.nome} cor={c.cor} size={38} radius={11} />
                    <span style={{ ...TEXT, fontSize: 10, fontWeight: 600, color: form.categoriaId === c.id ? c.cor : '#7A5C4F', textAlign: 'center', lineHeight: 1.2 }}>{c.nome}</span>
                  </motion.button>
                ))}
              </div>

              {(contas.length > 0 || cartoes.length > 0) && (
                <>
                  <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 8 }}>Forma de pagamento <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></p>

                  {/* Toggle Débito / Crédito */}
                  <div style={{ display: 'flex', gap: 6, background: '#F5F0E8', padding: 4, borderRadius: 12, marginBottom: 10 }}>
                    <button
                      onClick={() => { setPaymentMethod('conta'); setForm(f => ({ ...f, cartaoId: null })) }}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 9,
                        background: paymentMethod === 'conta' ? '#FFFFFF' : 'transparent',
                        boxShadow: paymentMethod === 'conta' ? '0 1px 3px rgba(44,26,15,0.08)' : 'none',
                        border: 'none', cursor: 'pointer',
                        ...TEXT, fontSize: 12, fontWeight: 700,
                        color: paymentMethod === 'conta' ? '#2C1A0F' : '#9B7B6A',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        transition: 'all .15s',
                      }}>
                      <IconBuildingBank size={14} stroke={2} /> Débito em conta
                    </button>
                    <button
                      onClick={() => { setPaymentMethod('cartao'); setForm(f => ({ ...f, contaId: null })) }}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 9,
                        background: paymentMethod === 'cartao' ? '#FFFFFF' : 'transparent',
                        boxShadow: paymentMethod === 'cartao' ? '0 1px 3px rgba(44,26,15,0.08)' : 'none',
                        border: 'none', cursor: 'pointer',
                        ...TEXT, fontSize: 12, fontWeight: 700,
                        color: paymentMethod === 'cartao' ? '#2C1A0F' : '#9B7B6A',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        transition: 'all .15s',
                      }}>
                      <IconCreditCard size={14} stroke={2} /> Cartão de crédito
                    </button>
                  </div>

                  {/* Chips: contas OU cartões */}
                  {paymentMethod === 'conta' ? (
                    contas.length > 0 ? (
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 18 }}>
                        {contas.map(c => (
                          <button key={c.id} onClick={() => setForm(f => ({ ...f, contaId: f.contaId === c.id ? null : c.id! }))}
                            style={{ padding: '7px 14px', borderRadius: 20, border: form.contaId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', cursor: 'pointer', background: form.contaId === c.id ? `${c.cor}18` : 'white', ...TEXT, fontSize: 12, fontWeight: 600, color: form.contaId === c.id ? c.cor : '#7A5C4F', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.cor }} />{c.nome}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p style={{ ...SUB as object, fontSize: 12, marginBottom: 18, padding: '10px 14px', background: '#FAF6F0', borderRadius: 10, border: '1px dashed #E8E0D5' }}>
                        Nenhuma conta cadastrada. Vá em <strong>Contas</strong> para adicionar.
                      </p>
                    )
                  ) : (
                    cartoes.length > 0 ? (
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 18 }}>
                        {cartoes.map(card => (
                          <button key={card.id} onClick={() => setForm(f => ({ ...f, cartaoId: f.cartaoId === card.id ? null : card.id! }))}
                            style={{ padding: '7px 12px 7px 8px', borderRadius: 20, border: form.cartaoId === card.id ? `2px solid ${card.cor}` : '1.5px solid #E8E0D5', cursor: 'pointer', background: form.cartaoId === card.id ? `${card.cor}18` : 'white', ...TEXT, fontSize: 12, fontWeight: 600, color: form.cartaoId === card.id ? card.cor : '#7A5C4F', transition: 'all .15s', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                              width: 22, height: 16, borderRadius: 4,
                              background: `linear-gradient(135deg, ${card.cor}, ${card.cor}cc)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              <BandeiraLogo bandeira={card.bandeira} size={11} variant="light" />
                            </div>
                            {card.nome}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p style={{ ...SUB as object, fontSize: 12, marginBottom: 18, padding: '10px 14px', background: '#FAF6F0', borderRadius: 10, border: '1px dashed #E8E0D5' }}>
                        Nenhum cartão cadastrado. Vá em <strong>Cartões</strong> para adicionar.
                      </p>
                    )
                  )}

                  {paymentMethod === 'cartao' && form.cartaoId && (
                    <div style={{ background: 'rgba(80,78,118,0.08)', border: '1px solid rgba(80,78,118,0.18)', borderRadius: 10, padding: '8px 12px', marginBottom: 18, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <IconCreditCard size={14} color="#504E76" stroke={2} style={{ marginTop: 2, flexShrink: 0 }} />
                      <p style={{ ...TEXT, fontSize: 11, color: '#504E76', lineHeight: 1.4, margin: 0 }}>
                        Ao marcar como pago, será criado um lançamento na fatura do cartão automaticamente.
                      </p>
                    </div>
                  )}
                </>
              )}

              <motion.button onClick={handleSave} whileTap={{ scale: 0.97 }} disabled={!form.nome || !form.valor || !form.categoriaId}
                style={{ width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', cursor: form.nome && form.valor && form.categoriaId ? 'pointer' : 'default', background: form.nome && form.valor && form.categoriaId ? 'linear-gradient(135deg, #D4643A, #C4553B)' : '#E8E0D5', color: form.nome && form.valor && form.categoriaId ? 'white' : '#9B7B6A', ...TEXT, fontSize: 15, fontWeight: 700, transition: 'all .2s', boxShadow: form.nome && form.valor && form.categoriaId ? '0 4px 20px rgba(196,85,59,0.35)' : 'none' }}>
                {editingId ? 'Salvar alterações' : 'Adicionar conta fixa'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {/* Modal: Pagar com juros/multa */}
        {payingWithFee && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPayingWithFee(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.55)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 440, background: '#FFFDF9', borderRadius: 22, padding: '24px 26px', boxShadow: '0 24px 64px rgba(13,6,4,0.4)' }}>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(196,85,59,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconAlertTriangle size={22} stroke={2} color="#C4553B" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ ...DISPLAY as object, fontSize: 18, color: '#2C1A0F', margin: 0 }}>Pagar com juros/multa</h3>
                  <p style={{ ...SUB as object, fontSize: 12, marginTop: 3 }}>{payingWithFee.nome} · venceu dia {payingWithFee.diaVencimento}</p>
                </div>
                <button onClick={() => setPayingWithFee(null)} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconX size={14} color="#9B7B6A" />
                </button>
              </div>

              {/* Valor original (readonly) */}
              <div style={{ background: '#FAF6F0', border: '1px solid #EDE6DC', borderRadius: 12, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ ...LABEL as object, color: '#9B7B6A' }}>Valor original</span>
                <span style={{ ...NUM as object, fontSize: 16, color: '#2C1A0F' }}>{fmt(payingWithFee.valor)}</span>
              </div>

              {/* Juros + Multa lado a lado */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 6 }}>Juros</p>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 12px', gap: 6 }}>
                    <span style={{ ...NUM as object, fontSize: 13, color: '#C4553B' }}>R$</span>
                    <input
                      autoFocus
                      value={feeForm.juros}
                      onChange={e => setFeeForm(f => ({ ...f, juros: e.target.value.replace(/[^0-9.,]/g, '') }))}
                      placeholder="0,00"
                      inputMode="decimal"
                      style={{ border: 'none', background: 'transparent', ...TEXT, fontSize: 18, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none', width: '100%' }} />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 6 }}>Multa</p>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 12px', gap: 6 }}>
                    <span style={{ ...NUM as object, fontSize: 13, color: '#C4553B' }}>R$</span>
                    <input
                      value={feeForm.multa}
                      onChange={e => setFeeForm(f => ({ ...f, multa: e.target.value.replace(/[^0-9.,]/g, '') }))}
                      placeholder="0,00"
                      inputMode="decimal"
                      style={{ border: 'none', background: 'transparent', ...TEXT, fontSize: 18, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none', width: '100%' }} />
                  </div>
                </div>
              </div>

              {/* Total a pagar */}
              {(() => {
                const juros = parseFloat(feeForm.juros.replace(',', '.')) || 0
                const multa = parseFloat(feeForm.multa.replace(',', '.')) || 0
                const total = payingWithFee.valor + juros + multa
                const acrescimo = juros + multa
                return (
                  <div style={{ background: 'linear-gradient(135deg, #FAF0EE, #FFEEDC)', border: '1px solid rgba(196,85,59,0.2)', borderRadius: 12, padding: '12px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ ...LABEL as object, color: '#C4553B', marginBottom: 2 }}>Total a pagar</p>
                      {acrescimo > 0 && (
                        <p style={{ ...SUB as object, fontSize: 10, color: '#A8730F', margin: 0 }}>
                          {fmt(payingWithFee.valor)} + {fmt(acrescimo)} acréscimo
                        </p>
                      )}
                    </div>
                    <span style={{ ...NUM as object, fontSize: 22, color: '#C4553B' }}>{fmt(total)}</span>
                  </div>
                )
              })()}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setPayingWithFee(null)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid #E8E0D5', background: 'white', ...TEXT, fontSize: 13, fontWeight: 700, color: '#7A5C4F', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    const juros = parseFloat(feeForm.juros.replace(',', '.')) || 0
                    const multa = parseFloat(feeForm.multa.replace(',', '.')) || 0
                    const total = payingWithFee.valor + juros + multa
                    await marcarPago(payingWithFee.id!, view.mes, view.ano, total)
                    setPayingWithFee(null)
                    setFeeForm({ juros: '', multa: '' })
                  }}
                  style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #D4643A, #C4553B)', ...TEXT, fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: '0 4px 16px rgba(196,85,59,0.35)' }}>
                  Confirmar pagamento
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Confirm delete */}
        {confirmDelete !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}
              style={{ background: '#FFFDF9', borderRadius: 24, padding: '28px 24px', maxWidth: 320, width: '100%', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#FAF0EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <IconTrash size={24} color="#C4553B" stroke={1.8} />
              </div>
              <p style={{ ...DISPLAY as object, fontSize: 20, color: '#2C1A0F', marginBottom: 8 }}>Excluir conta fixa?</p>
              <p style={{ ...SUB as object, fontSize: 14, marginBottom: 24 }}>Histórico de pagamentos será removido.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid #E8E0D5', background: 'white', ...TEXT, fontSize: 14, fontWeight: 600, color: '#7A5C4F', cursor: 'pointer' }}>Cancelar</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={async () => { await deleteContaFixa(confirmDelete); setConfirmDelete(null) }}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: '#C4553B', ...TEXT, fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer' }}>Excluir</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────

function Kpi({ label, value, sub, cor, bg, border, progress }: { label: string; value: string; sub: string; cor: string; bg: string; border: string; progress?: number }) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: '12px 14px', border: `1px solid ${border}`, position: 'relative', overflow: 'hidden' }}>
      <p style={{ ...LABEL as object, color: cor, marginBottom: 4 }}>{label}</p>
      <p style={{ ...NUM as object, fontSize: 19, color: cor }}>{value}</p>
      <p style={{ ...SUB as object, fontSize: 10, marginTop: 3 }}>{sub}</p>
      {progress !== undefined && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(212,160,23,0.18)' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ type: 'spring', stiffness: 140, damping: 22 }}
            style={{ height: '100%', background: cor }} />
        </div>
      )}
    </div>
  )
}

function InsightRow({ icon, label, value, hint, amount, cor }: { icon: React.ReactNode; label: string; value: string; hint?: string; amount: string; cor: string }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: `${cor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ ...LABEL as object, fontSize: 9, color: '#9B7B6A', marginBottom: 2 }}>{label}</p>
        <p style={{ ...TEXT, fontSize: 12, fontWeight: 700, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{value}</p>
        {hint && <p style={{ ...SUB as object, fontSize: 10, marginTop: 1 }}>{hint}</p>}
      </div>
      <span style={{ ...NUM as object, fontSize: 13, color: cor, flexShrink: 0 }}>{amount}</span>
    </div>
  )
}

interface CompactRowProps {
  cf: ContaFixa
  categoria: Categoria
  conta: Conta | undefined
  cartao: Cartao | undefined
  pago: boolean
  valorPago?: number
  vencida: boolean
  urgente: boolean
  dias: number | null
  isCurrentMonth: boolean
  highlighted: boolean
  onPagar: () => void
  onPagarComJuros: () => void
  onDesfazer: () => void
  onEdit: () => void
  onDelete: () => void
  refSetter: (el: HTMLDivElement | null) => void
}
function CompactRow({ cf, categoria, conta, cartao, pago, valorPago, vencida, urgente, dias, isCurrentMonth, highlighted, onPagar, onPagarComJuros, onDesfazer, onEdit, onDelete, refSetter }: CompactRowProps) {
  const jurosPagos = pago && valorPago != null && valorPago > cf.valor ? valorPago - cf.valor : 0
  const [hover, setHover] = useState(false)
  const [justPaid, setJustPaid] = useState(false)

  const statusBadge = (() => {
    if (pago) return { icon: <IconCircleCheck size={10} stroke={2.5} />, text: 'Pago', cor: '#3A8580', bg: 'rgba(58,133,128,0.12)' }
    if (vencida) return { icon: <IconAlertTriangle size={10} stroke={2.5} />, text: `Venceu dia ${cf.diaVencimento}`, cor: '#C4553B', bg: 'rgba(196,85,59,0.12)' }
    if (urgente) return { icon: <IconCalendarDue size={10} stroke={2.4} />, text: dias === 0 ? 'Vence hoje' : dias === 1 ? 'Vence amanhã' : `Vence em ${dias}d`, cor: '#A8730F', bg: 'rgba(212,160,23,0.14)' }
    return { icon: <IconCalendarDue size={10} stroke={2} />, text: isCurrentMonth ? `Dia ${cf.diaVencimento}` : `Dia ${cf.diaVencimento}`, cor: '#9B7B6A', bg: '#F5F0E8' }
  })()

  return (
    <motion.div
      ref={refSetter}
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: pago ? 0.72 : 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: highlighted ? `${categoria.cor}10` : hover ? '#FBF8F3' : '#FFFFFF',
        border: highlighted ? `1.5px solid ${categoria.cor}` : '1px solid #EDE6DC',
        borderLeft: vencida ? '3px solid #C4553B' : urgente && !pago ? '3px solid #D4A017' : highlighted ? `3px solid ${categoria.cor}` : '1px solid #EDE6DC',
        borderRadius: 12,
        padding: '10px 14px',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto auto',
        gap: 12,
        alignItems: 'center',
        transition: 'background .12s',
      }}>
      {/* Ícone categoria */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <CategoryIcon nome={categoria.nome} cor={pago ? '#B0C8B0' : categoria.cor} size={34} radius={10} />
        {pago && (
          <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: '#3A8580', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FFFFFF' }}>
            <IconCheck size={8} color="white" stroke={3.5} />
          </div>
        )}
      </div>

      {/* Texto */}
      <div style={{ minWidth: 0 }}>
        <p style={{ ...TEXT, fontSize: 13, fontWeight: 700, color: pago ? '#9B7B6A' : '#2C1A0F', textDecoration: pago ? 'line-through' : 'none', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cf.nome}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span style={{ ...LABEL as object, fontSize: 9, color: statusBadge.cor, background: statusBadge.bg, padding: '2px 7px', borderRadius: 5, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            {statusBadge.icon} {statusBadge.text}
          </span>
          {conta && (
            <>
              <span style={{ color: '#D4C8BC', fontSize: 9 }}>·</span>
              <span style={{ ...TEXT, fontSize: 10, fontWeight: 600, color: '#9B7B6A', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <IconBuildingBank size={9} stroke={2} color="#9B7B6A" />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: conta.cor }} />
                {conta.nome}
              </span>
            </>
          )}
          {cartao && (
            <>
              <span style={{ color: '#D4C8BC', fontSize: 9 }}>·</span>
              <span style={{ ...TEXT, fontSize: 10, fontWeight: 600, color: cartao.cor, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <IconCreditCard size={9} stroke={2} color={cartao.cor} />
                {cartao.nome}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Valor */}
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <span style={{ ...NUM as object, fontSize: 14, color: pago ? '#9B7B6A' : '#2C1A0F' }}>
          {pago && valorPago != null ? fmt(valorPago) : fmt(cf.valor)}
        </span>
        {jurosPagos > 0 && (
          <span style={{ ...TEXT, fontSize: 9, fontWeight: 700, color: '#C4553B', background: 'rgba(196,85,59,0.1)', padding: '1px 6px', borderRadius: 4, letterSpacing: '.02em' }}>
            +{fmt(jurosPagos)} juros
          </span>
        )}
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <motion.button whileTap={{ scale: 0.92 }} animate={justPaid ? { scale: [1, 1.15, 1] } : {}} transition={{ duration: 0.3 }}
          onClick={() => {
            if (pago) {
              onDesfazer()
            } else {
              onPagar()
              if (!vencida) {
                setJustPaid(true)
                setTimeout(() => setJustPaid(false), 1200)
              }
            }
          }}
          style={{
            background: pago ? 'rgba(58,133,128,0.12)' : justPaid ? '#3A8580' : vencida ? '#C4553B' : 'linear-gradient(135deg, #D4643A, #C4553B)',
            color: pago ? '#3A8580' : 'white',
            border: 'none', borderRadius: 8, padding: '6px 12px',
            ...TEXT, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            transition: 'all .15s',
          }}>
          {justPaid && <IconCheck size={11} stroke={3} color="white" />}
          {justPaid ? 'Pago!' : pago ? 'Desfazer' : vencida ? 'Pagar c/ juros' : 'Pagar'}
        </motion.button>
        {!pago && !vencida && (
          <button onClick={onPagarComJuros} title="Pagar com juros/multa"
            style={{ background: '#FAF0EE', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconAlertTriangle size={12} color="#C4553B" stroke={2} />
          </button>
        )}
        <AnimatePresence>
          {hover && (
            <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} style={{ display: 'flex', gap: 4, overflow: 'hidden' }}>
              <button onClick={onEdit} style={{ background: '#F5F0E8', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconEdit size={12} color="#7A5C4F" stroke={2} />
              </button>
              <button onClick={onDelete} style={{ background: '#FAF0EE', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconTrash size={12} color="#C4553B" stroke={2} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ─── Mini Calendar ─────────────────────────────────────────────────────
interface MiniCalProps {
  mes: number
  ano: number
  contasFixas: ContaFixa[]
  catMap: Map<number, Categoria>
  pgtoMap: Map<number, { status: string }>
  selectedDay: number | null
  onSelectDay: (d: number) => void
  isCurrentMonth: boolean
  todayDate: number
}
function MiniCalendar({ mes, ano, contasFixas, catMap, pgtoMap, selectedDay, onSelectDay, isCurrentMonth, todayDate }: MiniCalProps) {
  const total = daysInMonth(mes, ano)
  const offset = firstWeekdayOfMonth(mes, ano) // 0=Dom

  // Map dia -> contas
  const dayMap = useMemo(() => {
    const m = new Map<number, ContaFixa[]>()
    contasFixas.forEach(cf => {
      const d = Math.min(cf.diaVencimento, total)
      if (!m.has(d)) m.set(d, [])
      m.get(d)!.push(cf)
    })
    return m
  }, [contasFixas, total])

  const cells: (number | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 16, padding: '16px 16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ ...LABEL as object, color: '#9B7B6A' }}>{MESES_FULL[mes - 1]} {ano}</span>
        <span style={{ ...SUB as object, fontSize: 10 }}>{contasFixas.length} {contasFixas.length === 1 ? 'conta' : 'contas'}</span>
      </div>

      {/* Header dias da semana */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} style={{ ...LABEL as object, fontSize: 9, color: '#C4B4A8', textAlign: 'center', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Grid dias */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} style={{ aspectRatio: '1', minHeight: 38 }} />
          const items = dayMap.get(d) ?? []
          const hasItems = items.length > 0
          const allPaid = hasItems && items.every(cf => pgtoMap.get(cf.id!)?.status === 'pago')
          const anyOverdue = hasItems && !allPaid && isCurrentMonth && d < todayDate
          const isToday = isCurrentMonth && d === todayDate
          const isSelected = selectedDay === d

          // Top categoria (cor do primeiro dot ou maior)
          const topItem = items[0]
          const topCat = topItem ? catMap.get(topItem.categoriaId) : null
          const dotColor = allPaid ? '#3A8580' : anyOverdue ? '#C4553B' : (topCat?.cor ?? '#9B7B6A')

          return (
            <motion.button
              key={i}
              whileTap={hasItems ? { scale: 0.92 } : {}}
              onClick={() => hasItems && onSelectDay(d)}
              disabled={!hasItems}
              style={{
                aspectRatio: '1', minHeight: 38,
                border: isSelected ? `1.5px solid ${dotColor}` : isToday ? '1.5px solid #2C1A0F' : '1px solid transparent',
                background: isSelected ? `${dotColor}15` : isToday ? '#FAF0EE' : hasItems ? '#FBF8F3' : 'transparent',
                borderRadius: 9,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                cursor: hasItems ? 'pointer' : 'default',
                padding: 0,
                transition: 'all .15s',
              }}>
              <span style={{ ...NUM as object, fontSize: 11, color: isToday ? '#2C1A0F' : hasItems ? '#2C1A0F' : '#C4B4A8', fontWeight: hasItems ? 700 : 500 }}>{d}</span>
              {hasItems && (
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  {items.slice(0, 3).map((cf, idx) => {
                    const cat = catMap.get(cf.categoriaId)
                    const isPaid = pgtoMap.get(cf.id!)?.status === 'pago'
                    return (
                      <div key={idx} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: isPaid ? '#3A8580' : (cat?.cor ?? '#9B7B6A'),
                        opacity: isPaid ? 0.5 : 1,
                      }} />
                    )
                  })}
                  {items.length > 3 && (
                    <div style={{ ...TEXT, fontSize: 8, fontWeight: 700, color: '#7A5C4F', lineHeight: 1 }}>+{items.length - 3}</div>
                  )}
                </div>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid #F5F0E8' }}>
        <LegendDot color="#9B7B6A" label="Pendente" />
        <LegendDot color="#3A8580" label="Paga" />
        <LegendDot color="#C4553B" label="Vencida" />
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      <span style={{ ...TEXT, fontSize: 10, color: '#7A5C4F' }}>{label}</span>
    </span>
  )
}
