import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  IconX, IconFileTypePdf, IconBuildingBank, IconCreditCard, IconChartLine,
  IconCash, IconArrowsExchange, IconDownload, IconEye, IconCheck,
  IconCalendar, IconLoader2,
} from '@tabler/icons-react'
import { useContas } from '@/db/hooks/useContas'
import { useCartoes } from '@/db/hooks/useCartoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { fmt } from '@/lib/format'
import {
  gerarRelatorioPatrimonio,
  gerarRelatorioContas,
  gerarRelatorioFatura,
  gerarRelatorioInvestimentos,
  gerarRelatorioDividas,
  gerarRelatorioTransacoes,
  baixarBlob,
  visualizarBlob,
  type PDFOptions,
} from '@/lib/pdfReports'

type RelatorioTipo = 'patrimonio' | 'contas' | 'fatura' | 'investimentos' | 'dividas' | 'transacoes'

interface Props {
  onClose: () => void
}

const TIPOS: { value: RelatorioTipo; label: string; icon: typeof IconBuildingBank; cor: string; desc: string }[] = [
  { value: 'patrimonio',    label: 'Patrimônio (visão geral)', icon: IconChartLine,      cor: '#1E5E5A', desc: 'Snapshot consolidado: ativos, passivos, patrimônio líquido.' },
  { value: 'transacoes',    label: 'Transações',               icon: IconArrowsExchange, cor: '#C4553B', desc: 'Extrato livre com filtros de período, conta e categoria.' },
  { value: 'contas',        label: 'Extrato por conta',        icon: IconBuildingBank,   cor: '#3D7EB5', desc: 'Movimentações agrupadas por conta bancária.' },
  { value: 'fatura',        label: 'Fatura de cartão',         icon: IconCreditCard,     cor: '#504E76', desc: 'Lançamentos de um cartão num mês específico.' },
  { value: 'investimentos', label: 'Carteira de investimentos', icon: IconChartLine,     cor: '#3A8580', desc: 'Posição completa agrupada por tipo de ativo.' },
  { value: 'dividas',       label: 'Dívidas',                  icon: IconCash,           cor: '#A8442B', desc: 'Saldos, parcelas e movimentações (amortizações, descontos).' },
]

export function PDFExportModal({ onClose }: Props) {
  useBodyScrollLock(true)
  const contas = useContas()
  const cartoes = useCartoes()
  const categorias = useCategorias()
  const today = new Date()
  const inicioMes = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
  const hoje = today.toISOString().split('T')[0]

  const [tipo, setTipo] = useState<RelatorioTipo>('patrimonio')
  const [opts, setOpts] = useState<PDFOptions>({})
  const [periodoInicio, setPeriodoInicio] = useState(inicioMes)
  const [periodoFim, setPeriodoFim] = useState(hoje)
  const [usarPeriodo, setUsarPeriodo] = useState(true)
  const [cartaoSel, setCartaoSel] = useState<number | null>(cartoes[0]?.id ?? null)
  const [faturaMes, setFaturaMes] = useState(today.getMonth() + 1)
  const [faturaAno, setFaturaAno] = useState(today.getFullYear())
  const [gerando, setGerando] = useState(false)

  const tipoSel = TIPOS.find(t => t.value === tipo)!

  const handleGerar = async (acao: 'baixar' | 'visualizar') => {
    setGerando(true)
    try {
      const merged: PDFOptions = {
        ...opts,
        periodoInicio: usarPeriodo ? periodoInicio : undefined,
        periodoFim: usarPeriodo ? periodoFim : undefined,
      }
      let blob: Blob
      let nome: string
      const stamp = new Date().toISOString().split('T')[0]
      switch (tipo) {
        case 'patrimonio':
          blob = await gerarRelatorioPatrimonio()
          nome = `fy-patrimonio-${stamp}.pdf`
          break
        case 'transacoes':
          blob = await gerarRelatorioTransacoes(merged)
          nome = `fy-transacoes-${stamp}.pdf`
          break
        case 'contas':
          blob = await gerarRelatorioContas(merged)
          nome = `fy-contas-${stamp}.pdf`
          break
        case 'fatura':
          if (!cartaoSel) { setGerando(false); return }
          blob = await gerarRelatorioFatura(cartaoSel, faturaMes, faturaAno)
          nome = `fy-fatura-${faturaMes}-${faturaAno}.pdf`
          break
        case 'investimentos':
          blob = await gerarRelatorioInvestimentos()
          nome = `fy-investimentos-${stamp}.pdf`
          break
        case 'dividas':
          blob = await gerarRelatorioDividas()
          nome = `fy-dividas-${stamp}.pdf`
          break
      }
      if (acao === 'baixar') baixarBlob(blob, nome)
      else visualizarBlob(blob)
    } finally {
      setGerando(false)
    }
  }

  const aceitaPeriodo = tipo === 'transacoes' || tipo === 'contas'
  const aceitaContas = tipo === 'transacoes' || tipo === 'contas'
  const aceitaCategorias = tipo === 'transacoes'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(28,10,5,0.55)',
        backdropFilter: 'blur(8px)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: 24,
          width: '100%', maxWidth: 720, maxHeight: '90vh',
          overflowY: 'auto', boxShadow: '0 24px 64px rgba(28,10,5,0.4)',
        }}>
        {/* Header */}
        <div style={{
          padding: '22px 26px', borderBottom: '1px solid #EDE6DC',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 2,
        }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(196,85,59,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconFileTypePdf size={22} stroke={1.8} color="#C4553B" />
            </div>
            <div>
              <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.5px' }}>Exportar PDF</h2>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 2 }}>Escolha o tipo de relatório e os filtros</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#F5F0E8', border: 'none', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconX size={16} stroke={2} color="#7A5C4F" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Tipo de relatório */}
          <Field label="Tipo de relatório">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {TIPOS.map(t => {
                const Icon = t.icon
                const active = tipo === t.value
                return (
                  <button key={t.value} onClick={() => setTipo(t.value)}
                    style={{
                      background: active ? `${t.cor}10` : '#FBF8F3',
                      border: active ? `1.5px solid ${t.cor}` : '1.5px solid #EDE6DC',
                      borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left',
                      transition: 'all .15s',
                    }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: active ? t.cor : `${t.cor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} stroke={1.8} color={active ? '#FFFFFF' : t.cor} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#2C1A0F', margin: 0 }}>{t.label}</p>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#7A5C4F', margin: '3px 0 0', lineHeight: 1.3 }}>{t.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Filtros condicionais */}
          {aceitaPeriodo && (
            <Field label="Período">
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <button onClick={() => setUsarPeriodo(false)}
                  style={{ ...CHIP, ...(usarPeriodo ? {} : CHIP_ACTIVE) }}>Tudo</button>
                <button onClick={() => { setUsarPeriodo(true); setPeriodoInicio(inicioMes); setPeriodoFim(hoje) }}
                  style={{ ...CHIP, ...(usarPeriodo && periodoInicio === inicioMes ? CHIP_ACTIVE : {}) }}>Este mês</button>
                <button onClick={() => {
                    setUsarPeriodo(true)
                    const d = new Date(); d.setMonth(d.getMonth() - 3); d.setDate(1)
                    setPeriodoInicio(d.toISOString().split('T')[0])
                    setPeriodoFim(hoje)
                  }}
                  style={CHIP}>Últimos 3 meses</button>
                <button onClick={() => {
                    setUsarPeriodo(true)
                    const d = new Date(today.getFullYear(), 0, 1)
                    setPeriodoInicio(d.toISOString().split('T')[0])
                    setPeriodoFim(hoje)
                  }}
                  style={CHIP}>Ano atual</button>
              </div>
              {usarPeriodo && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} style={INPUT} />
                  <input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} style={INPUT} />
                </div>
              )}
            </Field>
          )}

          {aceitaContas && contas.length > 0 && (
            <Field label="Contas (deixe vazio = todas)">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {contas.map(c => {
                  const sel = opts.contasIds?.includes(c.id!) ?? false
                  return (
                    <button key={c.id} onClick={() => setOpts(o => ({ ...o, contasIds: sel ? (o.contasIds ?? []).filter(id => id !== c.id) : [...(o.contasIds ?? []), c.id!] }))}
                      style={{
                        padding: '6px 12px', borderRadius: 18,
                        border: sel ? `2px solid ${c.cor}` : '1.5px solid #EDE6DC',
                        background: sel ? `${c.cor}18` : 'white',
                        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600,
                        color: sel ? c.cor : '#7A5C4F',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.cor }} />{c.nome}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          {aceitaCategorias && categorias.length > 0 && (
            <Field label="Categorias (vazio = todas)">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {categorias.map(c => {
                  const sel = opts.categoriasIds?.includes(c.id!) ?? false
                  return (
                    <button key={c.id} onClick={() => setOpts(o => ({ ...o, categoriasIds: sel ? (o.categoriasIds ?? []).filter(id => id !== c.id) : [...(o.categoriasIds ?? []), c.id!] }))}
                      style={{
                        padding: '5px 10px', borderRadius: 18,
                        border: sel ? `2px solid ${c.cor}` : '1.5px solid #EDE6DC',
                        background: sel ? `${c.cor}18` : 'white',
                        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600,
                        color: sel ? c.cor : '#7A5C4F',
                        cursor: 'pointer',
                      }}>
                      {c.nome}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          {tipo === 'fatura' && (
            <>
              <Field label="Cartão">
                {cartoes.length === 0 ? (
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#C4553B' }}>Nenhum cartão cadastrado.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {cartoes.map(c => (
                      <button key={c.id} onClick={() => setCartaoSel(c.id!)}
                        style={{
                          padding: '6px 12px', borderRadius: 18,
                          border: cartaoSel === c.id ? `2px solid ${c.cor}` : '1.5px solid #EDE6DC',
                          background: cartaoSel === c.id ? `${c.cor}18` : 'white',
                          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600,
                          color: cartaoSel === c.id ? c.cor : '#7A5C4F', cursor: 'pointer',
                        }}>
                        {c.nome}
                      </button>
                    ))}
                  </div>
                )}
              </Field>
              <Field label="Mês de referência">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <select value={faturaMes} onChange={e => setFaturaMes(parseInt(e.target.value))} style={INPUT}>
                    {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <input type="number" value={faturaAno} onChange={e => setFaturaAno(parseInt(e.target.value) || today.getFullYear())} style={INPUT} />
                </div>
              </Field>
            </>
          )}

          {/* Preview info */}
          <div style={{
            background: `${tipoSel.cor}08`, border: `1px solid ${tipoSel.cor}22`, borderRadius: 12,
            padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <IconCalendar size={14} color={tipoSel.cor} stroke={2} style={{ flexShrink: 0, marginTop: 2 }}/>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', margin: 0, lineHeight: 1.5 }}>
              O PDF é gerado <strong>no seu dispositivo</strong> (offline, sem servidor). Nenhum dado é enviado pra fora.
              {usarPeriodo && aceitaPeriodo && ` Período: ${new Date(periodoInicio + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(periodoFim + 'T00:00:00').toLocaleDateString('pt-BR')}.`}
            </p>
          </div>
        </div>

        {/* Footer com botões */}
        <div style={{
          padding: '16px 26px', borderTop: '1px solid #EDE6DC',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          position: 'sticky', bottom: 0, background: '#FFFFFF',
        }}>
          <button onClick={onClose} disabled={gerando}
            style={{ background: 'transparent', color: '#7A5C4F', border: '1.5px solid #EDE6DC', borderRadius: 12, padding: '11px 18px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700 }}>
            Cancelar
          </button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleGerar('visualizar')} disabled={gerando}
            style={{ background: '#FBF8F3', color: tipoSel.cor, border: `1.5px solid ${tipoSel.cor}40`, borderRadius: 12, padding: '11px 18px', cursor: gerando ? 'default' : 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IconEye size={14} stroke={2.4} /> Visualizar
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleGerar('baixar')} disabled={gerando}
            style={{ background: gerando ? '#E8E0D5' : `linear-gradient(135deg, ${tipoSel.cor}, ${tipoSel.cor}cc)`, color: gerando ? '#9B7B6A' : 'white', border: 'none', borderRadius: 12, padding: '11px 20px', cursor: gerando ? 'default' : 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: gerando ? 'none' : `0 4px 14px ${tipoSel.cor}50` }}>
            {gerando ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} style={{ display: 'inline-flex' }}><IconLoader2 size={14} stroke={2.4} /></motion.span> Gerando…</> : <><IconDownload size={14} stroke={2.4} /> Baixar PDF</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>{label}</span>
      {children}
    </label>
  )
}

const INPUT: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#FBF8F3', border: '1.5px solid #EDE6DC', borderRadius: 10,
  padding: '9px 12px', fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 13, fontWeight: 600, color: '#2C1A0F', outline: 'none',
}

const CHIP: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 18,
  border: '1.5px solid #EDE6DC', background: '#FBF8F3',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
  color: '#7A5C4F', cursor: 'pointer',
}

const CHIP_ACTIVE: React.CSSProperties = {
  background: '#C4553B', color: '#FFFFFF', border: '1.5px solid #C4553B',
}
