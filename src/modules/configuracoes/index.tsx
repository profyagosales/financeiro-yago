import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { db, seedCategories, wipeAllData, wipeTransactionsOnly, wipeInvestmentsOnly } from '@/db/schema'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { addTransacao } from '@/db/hooks/useTransacoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useContas } from '@/db/hooks/useContas'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { fmt } from '@/lib/format'
import {
  IconLock, IconDeviceFloppy, IconBrandChrome, IconDeviceMobile, IconBrandApple,
  IconRefresh, IconChevronRight, IconCheck, IconTableImport, IconShieldLock,
  IconDeviceMobileMessage, IconDatabase, IconInfoCircle, IconFile, IconTrendingUp,
  IconUser, IconBrandGithub, IconTrash, IconAlertTriangle, IconSettings, IconClock,
  IconVolume, IconAccessible, IconCurrencyReal, IconTarget,
} from '@tabler/icons-react'
import {
  useTaxasBenchmark, setTaxasBenchmark,
  useBrapiToken, setBrapiToken,
  useUserProfile, setUserProfile,
  useAppPreferences, setAppPreferences,
} from '@/db/hooks/useAppConfig'

// ─── Componentes base ────────────────────────────────────────────────
function Section({ title, icon, children, danger }: { title: string; icon?: React.ReactNode; children: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: danger ? '1px solid rgba(196,85,59,0.25)' : '1px solid #EDE6DC',
      borderRadius: 20,
      padding: '20px 22px',
      marginBottom: 14,
      boxShadow: '0 1px 3px rgba(44,26,15,0.04), 0 2px 10px rgba(44,26,15,0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        {icon && (
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: danger ? 'rgba(196,85,59,0.12)' : '#F5F0E8',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
        <h2 style={{
          fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700,
          color: danger ? '#A8442B' : '#2C1A0F', letterSpacing: '-0.4px', margin: 0,
        }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Row({ icon, label, sub, onClick, danger, right }: { icon: React.ReactNode; label: string; sub?: string; onClick?: () => void; danger?: boolean; right?: React.ReactNode }) {
  return (
    <motion.button onClick={onClick} whileTap={onClick ? { scale: 0.98 } : {}} whileHover={onClick ? { x: 2 } : {}}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 0', border: 'none', background: 'none',
        cursor: onClick ? 'pointer' : 'default', textAlign: 'left',
        borderBottom: '0.5px solid #F5F0E8',
      }}>
      <div style={{
        width: 36, height: 36, borderRadius: 11,
        background: danger ? '#FAF0EE' : '#F5F0E8',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: danger ? '#C4553B' : '#2C1A0F', margin: 0 }}>{label}</p>
        {sub && <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', marginTop: 2 }}>{sub}</p>}
      </div>
      {right ?? (onClick && <IconChevronRight size={16} color="#C4B4A8" />)}
    </motion.button>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      style={{
        width: 42, height: 24, borderRadius: 12,
        background: checked ? '#3A8580' : '#E8E0D5',
        border: 'none', cursor: 'pointer',
        padding: 0, position: 'relative',
        transition: 'background .2s',
      }}>
      <motion.div
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{
          position: 'absolute', top: 2, left: 0,
          width: 20, height: 20, borderRadius: '50%',
          background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}/>
    </button>
  )
}

// ─── PERFIL FINANCEIRO ───────────────────────────────────────────────
function PerfilSection() {
  const profile = useUserProfile()
  const [form, setForm] = useState({
    renda: profile.rendaMensal ? String(profile.rendaMensal).replace('.', ',') : '',
    metaPct: profile.metaPoupancaPct ? String(profile.metaPoupancaPct * 100) : '',
  })
  const [saved, setSaved] = useState(false)

  const parse = (s: string) => parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0

  const handleSave = async () => {
    await setUserProfile({
      rendaMensal: parse(form.renda),
      metaPoupancaPct: parse(form.metaPct) / 100,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const renda = parse(form.renda)
  const metaPct = parse(form.metaPct) / 100
  const valorPoupar = renda * metaPct

  return (
    <div>
      <p style={{ ...HELP_STYLE, marginBottom: 14 }}>
        Sua renda é usada para calcular % comprometido com despesas/dívidas no Dashboard
        e dimensionar a reserva de emergência. A meta de poupança aparece como referência em Metas.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <p style={LABEL_STYLE}>Renda mensal (R$)</p>
          <div style={INPUT_GROUP}>
            <span style={{ ...CURRENCY_PREFIX }}>R$</span>
            <input value={form.renda} onChange={e => setForm(f => ({ ...f, renda: e.target.value }))}
              placeholder="0,00" inputMode="decimal" style={INPUT_BARE} />
          </div>
        </div>
        <div>
          <p style={LABEL_STYLE}>Meta poupança</p>
          <div style={INPUT_GROUP}>
            <input value={form.metaPct} onChange={e => setForm(f => ({ ...f, metaPct: e.target.value }))}
              placeholder="20" inputMode="decimal" style={{ ...INPUT_BARE, textAlign: 'right' }} />
            <span style={{ ...CURRENCY_PREFIX, marginRight: 8 }}>%</span>
          </div>
        </div>
      </div>

      {renda > 0 && metaPct > 0 && (
        <div style={{
          padding: '10px 14px', background: 'rgba(58,133,128,0.08)', border: '1px solid rgba(58,133,128,0.18)',
          borderRadius: 10, marginBottom: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#1E7D5A', fontWeight: 600 }}>
            Meta de poupança mensal
          </span>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: '#1E7D5A', letterSpacing: '-0.3px' }}>
            {fmt(valorPoupar)}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <SaveButton onClick={handleSave} saved={saved} label="Salvar perfil" />
      </div>
    </div>
  )
}

// ─── PREFERÊNCIAS ────────────────────────────────────────────────────
function PreferenciasSection() {
  const prefs = useAppPreferences()

  const opcoesLock: { v: number; label: string }[] = [
    { v: 0,  label: 'Nunca' },
    { v: 1,  label: '1 min' },
    { v: 5,  label: '5 min' },
    { v: 15, label: '15 min' },
    { v: 30, label: '30 min' },
  ]

  return (
    <div>
      {/* Auto-lock */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <IconClock size={16} color="#7A5C4F" stroke={2} />
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F', margin: 0 }}>Bloquear após inatividade</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {opcoesLock.map(o => {
            const active = (prefs.autoLockMin ?? 0) === o.v
            return (
              <button key={o.v} onClick={() => setAppPreferences({ autoLockMin: o.v })}
                style={{
                  padding: '6px 12px', borderRadius: 18,
                  border: active ? '1.5px solid #C4553B' : '1.5px solid #EDE6DC',
                  background: active ? 'rgba(196,85,59,0.1)' : '#FBF8F3',
                  color: active ? '#A8442B' : '#7A5C4F',
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', transition: 'all .15s',
                }}>
                {o.label}
              </button>
            )
          })}
        </div>
        <p style={{ ...HELP_STYLE, marginTop: 8, marginBottom: 0 }}>
          {prefs.autoLockMin === 0
            ? 'Não bloqueia automaticamente. Você decide quando bloquear.'
            : `App pede PIN se ficar ${prefs.autoLockMin} min sem interação.`}
        </p>
      </div>

      {/* Som */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '0.5px solid #F5F0E8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconVolume size={16} color="#7A5C4F" stroke={2} />
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F', margin: 0 }}>Sons do sistema</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', margin: 0 }}>Confirmação ao pagar, alerta de orçamento estourado, etc.</p>
          </div>
        </div>
        <Toggle checked={prefs.soundEnabled !== false} onChange={v => setAppPreferences({ soundEnabled: v })} />
      </div>

      {/* Animações */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '0.5px solid #F5F0E8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconAccessible size={16} color="#7A5C4F" stroke={2} />
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F', margin: 0 }}>Reduzir animações</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', margin: 0 }}>Útil pra acessibilidade ou se você prefere interface mais sóbria.</p>
          </div>
        </div>
        <Toggle checked={prefs.reducedMotion === true} onChange={v => setAppPreferences({ reducedMotion: v })} />
      </div>
    </div>
  )
}

// ─── ZONA DE PERIGO ──────────────────────────────────────────────────
type WipeAction = 'all' | 'transactions' | 'investments' | null

function ZonaPerigoSection() {
  const [confirm, setConfirm] = useState<WipeAction>(null)
  const [confirmText, setConfirmText] = useState('')
  const [executing, setExecuting] = useState(false)
  useBodyScrollLock(confirm !== null)

  const actions = {
    all: {
      label: 'Apagar TODOS os dados do app',
      sub: 'Contas, cartões, transações, investimentos, dívidas, metas, configs… tudo. Sem volta.',
      icon: <IconTrash size={18} color="#C4553B" stroke={1.8} />,
      run: wipeAllData,
      title: 'Apagar tudo',
      desc: 'Isso vai apagar permanentemente TUDO no app: contas, cartões, transações, investimentos, dívidas, metas, desejos, configurações. Faça backup antes (Dados → Exportar JSON).',
    },
    transactions: {
      label: 'Apagar apenas transações',
      sub: 'Mantém contas, cartões, investimentos, etc.',
      icon: <IconTrash size={18} color="#C4553B" stroke={1.8} />,
      run: wipeTransactionsOnly,
      title: 'Apagar transações',
      desc: 'Apaga todas as transações, lançamentos de cartão, pagamentos de contas fixas e anexos. Contas e cartões continuam.',
    },
    investments: {
      label: 'Apagar apenas investimentos',
      sub: 'Mantém demais dados.',
      icon: <IconTrash size={18} color="#C4553B" stroke={1.8} />,
      run: wipeInvestmentsOnly,
      title: 'Apagar investimentos',
      desc: 'Apaga todos os investimentos, aportes, proventos e movimentações. Demais dados continuam.',
    },
  }

  const handleConfirm = async () => {
    if (!confirm) return
    setExecuting(true)
    await actions[confirm].run()
    setExecuting(false)
    setConfirm(null)
    setConfirmText('')
    setTimeout(() => window.location.reload(), 300)
  }

  return (
    <>
      <p style={{ ...HELP_STYLE, marginBottom: 14, color: '#A8442B' }}>
        <IconAlertTriangle size={13} stroke={2} color="#A8442B" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
        Ações irreversíveis. Sempre faça backup antes em <strong>Dados → Exportar JSON</strong>.
      </p>
      <Row icon={actions.transactions.icon} label={actions.transactions.label} sub={actions.transactions.sub} onClick={() => setConfirm('transactions')} danger />
      <Row icon={actions.investments.icon} label={actions.investments.label} sub={actions.investments.sub} onClick={() => setConfirm('investments')} danger />
      <Row icon={actions.all.icon} label={actions.all.label} sub={actions.all.sub} onClick={() => setConfirm('all')} danger />

      <AnimatePresence>
        {confirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !executing && setConfirm(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(28,10,5,0.65)', backdropFilter: 'blur(8px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFFDF9', borderRadius: 22, padding: '28px 26px', maxWidth: 420, width: '100%', boxShadow: '0 24px 64px rgba(13,6,4,0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(196,85,59,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconAlertTriangle size={26} stroke={2} color="#C4553B" />
                </div>
                <div>
                  <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.5px' }}>{actions[confirm].title}?</h3>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 4 }}>Ação não pode ser desfeita.</p>
                </div>
              </div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', lineHeight: 1.5, marginBottom: 16 }}>
                {actions[confirm].desc}
              </p>

              <p style={{ ...LABEL_STYLE, color: '#C4553B' }}>Digite <strong>APAGAR</strong> para confirmar</p>
              <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
                placeholder="APAGAR"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#FAEAEA', border: '1.5px solid rgba(196,85,59,0.3)',
                  borderRadius: 10, padding: '10px 14px',
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700,
                  color: '#A8442B', outline: 'none', letterSpacing: '.08em',
                  marginBottom: 16,
                }} />

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setConfirm(null); setConfirmText('') }} disabled={executing}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid #E8E0D5', background: 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#7A5C4F', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleConfirm} disabled={confirmText !== 'APAGAR' || executing}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                    background: (confirmText === 'APAGAR' && !executing) ? '#C4553B' : '#E8E0D5',
                    color: (confirmText === 'APAGAR' && !executing) ? 'white' : '#9B7B6A',
                    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
                    cursor: (confirmText === 'APAGAR' && !executing) ? 'pointer' : 'not-allowed',
                    boxShadow: confirmText === 'APAGAR' ? '0 4px 12px rgba(196,85,59,0.3)' : 'none',
                  }}>
                  {executing ? 'Apagando…' : 'Apagar permanentemente'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── IMPORTAR CSV ────────────────────────────────────────────────────
type CSVRow = { data: string; descricao: string; valor: number; tipo: 'receita' | 'despesa' }

function parseCSVDate(s: string): string {
  s = s.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
  if (m) {
    const d = m[1].padStart(2,'0'), mo = m[2].padStart(2,'0')
    const a = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${a}-${mo}-${d}`
  }
  return new Date().toISOString().split('T')[0]
}

function ImportCSVSection() {
  const categorias = useCategorias('despesa')
  const contas = useContas()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<CSVRow[]>([])
  const [catId, setCatId] = useState<number | null>(null)
  const [contaId, setContaId] = useState<number | null>(null)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(0)
  const [open, setOpen] = useState(false)

  const parseFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const lines = text.trim().split('\n').filter(Boolean)
      const start = lines[0].toLowerCase().includes('data') ? 1 : 0
      const parsed: CSVRow[] = []
      lines.slice(start).forEach(line => {
        const cols = line.split(/[,;]/).map(c => c.replace(/"/g,'').trim())
        if (cols.length < 3) return
        const data = parseCSVDate(cols[0])
        const descricao = cols[1] || 'Importado'
        const rawVal = parseFloat(cols[2].replace(/[R$\s]/g,'').replace(',','.'))
        if (isNaN(rawVal)) return
        const valor = Math.abs(rawVal)
        const tipo: 'receita' | 'despesa' = rawVal > 0 ? 'receita' : 'despesa'
        parsed.push({ data, descricao, valor, tipo })
      })
      setRows(parsed)
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleImport = async () => {
    if (!catId || !contaId || rows.length === 0) return
    setImporting(true)
    let count = 0
    for (const row of rows) {
      await addTransacao({ data: row.data, valor: row.valor, tipo: row.tipo, contaId: contaId!, categoriaId: catId!, descricao: row.descricao, status: 'confirmado', recorrencia: 'unica' })
      count++
      setDone(count)
    }
    setImporting(false)
    setRows([])
    setDone(0)
  }

  return (
    <>
      <Row icon={<IconTableImport size={18} color="#8B4BC8" stroke={1.8} />} label="Importar extrato CSV" sub="data, descrição, valor" onClick={() => setOpen(o => !o)} />
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ ...HELP_STYLE, marginBottom: 0 }}>
                Formato: <strong>data, descrição, valor</strong> · datas DD/MM/AAAA ou AAAA-MM-DD · valores negativos = despesa.
              </p>
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => fileRef.current?.click()}
                style={{ padding: '10px 0', borderRadius: 12, border: '1.5px dashed #E8E0D5', background: '#FAF6F0', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#7A5C4F', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <IconFile size={15} stroke={2} /> Escolher arquivo CSV
              </motion.button>
              <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f) }} />

              {rows.length > 0 && (
                <>
                  <div style={{ background: '#EBF5F0', border: '1px solid #D0E8D8', borderRadius: 10, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <IconCheck size={14} color="#3A8580" />
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#3A8580', margin: 0 }}>{rows.length} linhas detectadas</p>
                  </div>
                  <div style={{ maxHeight: 140, overflowY: 'auto', border: '0.5px solid #E8E0D5', borderRadius: 10 }}>
                    {rows.slice(0, 8).map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 10px', borderBottom: i < 7 ? '0.5px solid #F5F0E8' : 'none', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#9B7B6A', flexShrink: 0 }}>{r.data}</span>
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#2C1A0F', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descricao}</span>
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: r.tipo === 'receita' ? '#3A8580' : '#C4553B', flexShrink: 0, letterSpacing: '-0.3px' }}>
                          {r.tipo === 'receita' ? '+' : '−'}R$ {r.valor.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {rows.length > 8 && <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#9B7B6A', padding: '6px 10px', textAlign: 'center' }}>... e mais {rows.length - 8}</p>}
                  </div>

                  <div>
                    <p style={LABEL_STYLE}>Categoria</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {categorias.map(c => (
                        <button key={c.id} onClick={() => setCatId(c.id!)}
                          style={{ padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', background: catId === c.id ? c.cor : '#F5F0E8', color: catId === c.id ? 'white' : '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CategoryIcon nome={c.nome} cor={catId === c.id ? 'white' : c.cor} size={16} radius={4} /> {c.nome}
                        </button>
                      ))}
                    </div>
                  </div>

                  {contas.length > 0 && (
                    <div>
                      <p style={LABEL_STYLE}>Conta</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {contas.map(c => (
                          <button key={c.id} onClick={() => setContaId(c.id!)}
                            style={{ padding: '4px 10px', borderRadius: 20, border: contaId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', cursor: 'pointer', background: contaId === c.id ? `${c.cor}18` : 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: contaId === c.id ? c.cor : '#7A5C4F' }}>
                            {c.nome}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleImport} disabled={!catId || !contaId || importing}
                    style={{ padding: '12px 0', borderRadius: 12, border: 'none', background: catId && contaId ? '#8B4BC8' : '#E8E0D5', color: catId && contaId ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all .2s' }}>
                    {importing ? `Importando... ${done}/${rows.length}` : `Importar ${rows.length} transações`}
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── PIN ─────────────────────────────────────────────────────────────
function PinSection() {
  const { setPin } = useAuthStore()
  const [pinAtual, setPinAtual] = useState(''); const [pinNovo, setPinNovo] = useState(''); const [pinConf, setPinConf] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null); const [open, setOpen] = useState(false)
  const handleChange = async () => {
    if (pinNovo !== pinConf) { setMsg({ type: 'err', text: 'PINs não coincidem' }); return }
    if (pinNovo.length < 4) { setMsg({ type: 'err', text: 'Mínimo 4 dígitos' }); return }
    const ok = await setPin(pinAtual, pinNovo)
    setMsg(ok ? { type: 'ok', text: 'PIN alterado!' } : { type: 'err', text: 'PIN atual incorreto' })
    if (ok) { setPinAtual(''); setPinNovo(''); setPinConf('') }
    setTimeout(() => setMsg(null), 3000)
  }
  return (
    <>
      <Row icon={<IconLock size={18} color="#C4553B" stroke={1.8} />} label="Alterar PIN" sub="Proteja seu acesso" onClick={() => setOpen(o => !o)} />
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[{ v: pinAtual, s: setPinAtual, p: 'PIN atual' }, { v: pinNovo, s: setPinNovo, p: 'Novo PIN' }, { v: pinConf, s: setPinConf, p: 'Confirmar novo PIN' }].map((f, i) => (
                <input key={i} value={f.v} onChange={e => f.s(e.target.value)} placeholder={f.p} type="password" inputMode="numeric"
                  style={{ width: '100%', boxSizing: 'border-box', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '11px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none' }} />
              ))}
              {msg && (
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: msg.type === 'ok' ? '#3A8580' : '#C4553B', display: 'inline-flex', alignItems: 'center', gap: 5, margin: 0 }}>
                  {msg.type === 'ok' ? <IconCheck size={13} stroke={2.5} /> : <IconAlertTriangle size={13} stroke={2} />}
                  {msg.text}
                </p>
              )}
              <motion.button onClick={handleChange} whileTap={{ scale: 0.97 }}
                style={{ padding: '12px 0', borderRadius: 12, border: 'none', background: '#C4553B', color: 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Confirmar alteração
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── PWA ─────────────────────────────────────────────────────────────
function PWASection() {
  const { canInstall, install } = usePWAInstall()
  const [showGuide, setShowGuide] = useState(false)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  return (
    <>
      {canInstall && (
        <Row icon={<IconDeviceMobile size={18} color="#3D7EB5" stroke={1.8} />} label="Instalar como app" sub="Adicionar à tela inicial" onClick={install}
          right={<div style={{ background: '#C4553B', color: 'white', padding: '5px 12px', borderRadius: 20, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700 }}>Instalar</div>} />
      )}
      <Row icon={isIOS ? <IconBrandApple size={18} color="#2C1A0F" stroke={1.8} /> : <IconBrandChrome size={18} color="#E89527" stroke={1.8} />}
        label="Como instalar o PWA" sub="Guia passo a passo" onClick={() => setShowGuide(o => !o)} />
      <AnimatePresence>
        {showGuide && (() => {
          const guide = isIOS
            ? { title: 'No iPhone / iPad (Safari)', steps: ['Abra este site no Safari', 'Toque no ícone de compartilhar (barra inferior)', 'Toque em "Adicionar à Tela de Início"', 'Toque em "Adicionar" — pronto!'] }
            : { title: 'No Chrome (Android / Desktop)', steps: ['Abra no Chrome', 'Toque no menu (3 pontos)', 'Toque em "Instalar app" ou "Adicionar à tela inicial"', 'Confirme — o app aparece na tela inicial'] }
          return (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F', margin: '0 0 4px' }}>{guide.title}:</p>
                {guide.steps.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#C4553B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: 'white' }}>{i+1}</span>
                    </div>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#2C1A0F', margin: 0 }}>{s}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </>
  )
}

// ─── BRAPI TOKEN ─────────────────────────────────────────────────────
function BrapiTokenSection() {
  const tokenAtual = useBrapiToken()
  const [token, setToken] = useState(tokenAtual)
  const [saved, setSaved] = useState(false)
  const [show, setShow] = useState(false)

  const handleSave = async () => {
    await setBrapiToken(token)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <p style={{ ...HELP_STYLE, marginBottom: 14 }}>
        <strong>Brapi.dev</strong> é a API gratuita usada para buscar cotações de ações, FIIs e ETFs da B3.
        Desde 2024 exige token (free: 1.000 requisições/dia).
      </p>

      <div style={{
        background: '#FAF6F0', border: '1px solid #EDE6DC', borderRadius: 10,
        padding: '12px 14px', marginBottom: 14,
      }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', margin: 0, lineHeight: 1.6 }}>
          <strong>1.</strong> Acesse <a href="https://brapi.dev" target="_blank" rel="noreferrer" style={{ color: '#3D7EB5', textDecoration: 'underline', fontWeight: 700 }}>brapi.dev</a> e crie conta gratuita<br/>
          <strong>2.</strong> Copie o token no dashboard<br/>
          <strong>3.</strong> Cole aqui embaixo e salve
        </p>
      </div>

      <p style={LABEL_STYLE}>Token Brapi</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <input
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="abc123XYZ..."
          type="text"
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1, boxSizing: 'border-box',
            background: '#FBF8F3', border: '1.5px solid #EDE6DC',
            borderRadius: 10, padding: '10px 12px',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 500,
            color: '#2C1A0F', outline: 'none',
            WebkitTextSecurity: show ? 'none' : 'disc',
          } as React.CSSProperties}
        />
        <button onClick={() => setShow(s => !s)}
          style={{ background: '#F5F0E8', border: 'none', borderRadius: 10, padding: '0 14px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#7A5C4F' }}>
          {show ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: tokenAtual ? '#3A8580' : '#C4553B', margin: 0, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {tokenAtual
            ? <><IconCheck size={12} stroke={2.5} /> Token configurado</>
            : <><IconInfoCircle size={12} stroke={2} /> Sem token (cripto e câmbio continuam funcionando)</>}
        </p>
        <SaveButton onClick={handleSave} saved={saved} label="Salvar token" />
      </div>
    </div>
  )
}

// ─── TAXAS DE MERCADO ────────────────────────────────────────────────
function TaxasMercadoSection() {
  const taxas = useTaxasBenchmark()
  const [form, setForm] = useState({
    cdi: (taxas.cdi * 100).toFixed(2),
    selic: (taxas.selic * 100).toFixed(2),
    ipca: (taxas.ipca * 100).toFixed(2),
  })
  const [saved, setSaved] = useState(false)

  const parse = (s: string) => parseFloat(s.replace(',', '.')) || 0

  const handleSave = async () => {
    await setTaxasBenchmark({
      cdi: parse(form.cdi) / 100,
      selic: parse(form.selic) / 100,
      ipca: parse(form.ipca) / 100,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const dataAtual = new Date(taxas.atualizadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div>
      <p style={{ ...HELP_STYLE, marginBottom: 14 }}>
        Calcula rendimento de investimentos pós-fixados (% CDI, % Selic) e híbridos (IPCA+X%).
        Atualize sempre que o COPOM (CDI/Selic) ou o IBGE (IPCA) divulgar novos valores.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        <TaxaInput label="CDI" value={form.cdi} onChange={v => setForm(f => ({ ...f, cdi: v }))} />
        <TaxaInput label="Selic" value={form.selic} onChange={v => setForm(f => ({ ...f, selic: v }))} />
        <TaxaInput label="IPCA (12m)" value={form.ipca} onChange={v => setForm(f => ({ ...f, ipca: v }))} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', margin: 0 }}>
          Última atualização: <strong style={{ color: '#7A5C4F' }}>{dataAtual}</strong>
        </p>
        <SaveButton onClick={handleSave} saved={saved} label="Salvar taxas" />
      </div>
    </div>
  )
}

function TaxaInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p style={LABEL_STYLE}>{label}</p>
      <div style={INPUT_GROUP}>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="10,65"
          inputMode="decimal"
          style={{ ...INPUT_BARE, fontSize: 16, letterSpacing: '-0.3px' }}
        />
        <span style={{ ...CURRENCY_PREFIX, marginRight: 4 }}>% a.a.</span>
      </div>
    </div>
  )
}

// ─── Save button reusável ────────────────────────────────────────────
function SaveButton({ onClick, saved, label }: { onClick: () => void; saved: boolean; label: string }) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.97 }}
      style={{
        background: saved ? '#3A8580' : 'linear-gradient(135deg, #D4643A, #C4553B)',
        color: 'white', border: 'none', borderRadius: 12,
        padding: '10px 18px', cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        boxShadow: '0 4px 12px rgba(196,85,59,0.3)',
        transition: 'background .2s', flexShrink: 0,
      }}>
      {saved ? <><IconCheck size={14} stroke={2.5} /> Salvo!</> : label}
    </motion.button>
  )
}

// ─── Tokens estilísticos ─────────────────────────────────────────────
const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
  color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase',
  margin: '0 0 6px',
}
const HELP_STYLE: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A',
  lineHeight: 1.6, margin: 0,
}
const INPUT_GROUP: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4,
  background: '#FBF8F3', border: '1.5px solid #EDE6DC',
  borderRadius: 10, padding: '8px 12px',
}
const INPUT_BARE: React.CSSProperties = {
  border: 'none', background: 'transparent',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700,
  color: '#2C1A0F', flex: 1, outline: 'none', width: '100%', minWidth: 0,
}
const CURRENCY_PREFIX: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#9B7B6A',
}

// ═══ PAGE ═════════════════════════════════════════════════════════════
export function Page() {
  const { lock } = useAuthStore()
  const [msg, setMsg] = useState('')

  const handleExport = async () => {
    const [contas, cats, txs, cartoes, fixas, metas, invests, dividas, desejos, aportes, proventos, movsInv, movsDiv, configs] = await Promise.all([
      db.contas.toArray(), db.categorias.toArray(), db.transacoes.toArray(),
      db.cartoes.toArray(), db.contasFixas.toArray(), db.metas.toArray(),
      db.investimentos.toArray(), db.dividas.toArray(), db.desejos.toArray(),
      db.investimentosAportes.toArray(), db.investimentosProventos.toArray(),
      db.investimentosMovimentacoes.toArray(), db.dividasMovimentacoes.toArray(),
      db.appConfig.toArray(),
    ])
    const data = {
      exportedAt: new Date().toISOString(),
      version: 'v10',
      contas, categorias: cats, transacoes: txs, cartoes, contasFixas: fixas, metas,
      investimentos: invests, dividas, desejos,
      investimentosAportes: aportes, investimentosProventos: proventos,
      investimentosMovimentacoes: movsInv, dividasMovimentacoes: movsDiv,
      appConfig: configs,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `fy-backup-${new Date().toISOString().split('T')[0]}.json`; a.click()
    URL.revokeObjectURL(url); setMsg('Backup exportado!'); setTimeout(() => setMsg(''), 3000)
  }

  const handleCSV = async () => {
    const txs = await db.transacoes.toArray()
    const cats = await db.categorias.toArray()
    const catMap = new Map(cats.map(c => [c.id, c.nome]))
    const csv = 'Data,Descrição,Tipo,Categoria,Valor\n' + txs.map(t => `${t.data},"${t.descricao}",${t.tipo},"${catMap.get(t.categoriaId) ?? ''}",${t.valor}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `fy-transacoes-${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url); setMsg('CSV exportado!'); setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div style={{ padding: '32px', width: '100%', maxWidth: 880, margin: '0 auto' }}>

      {/* Header (mesmo padrão das outras páginas) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid #EDE6DC' }}>
        <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, fontSize: 38, color: '#2C1A0F', margin: 0, letterSpacing: '-1.5px' }}>Configurações</h1>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', margin: 0, letterSpacing: '.04em', textTransform: 'uppercase' }}>Financeiro do Yago · v1.0</p>
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ background: '#EBF5F0', border: '1px solid #D0E8D8', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconCheck size={16} color="#3A8580" />
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#3A8580', margin: 0 }}>{msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PERFIL */}
      <Section title="Perfil financeiro" icon={<IconUser size={18} color="#3A8580" stroke={1.8} />}>
        <PerfilSection />
      </Section>

      {/* ACESSO */}
      <Section title="Acesso e segurança" icon={<IconShieldLock size={18} color="#C4553B" stroke={1.8} />}>
        <PinSection />
        <Row icon={<IconLock size={18} color="#9B7B6A" stroke={1.8} />}
          label="Bloquear agora" sub="Requer PIN na próxima abertura"
          onClick={() => lock()} />
      </Section>

      {/* PREFERÊNCIAS */}
      <Section title="Preferências" icon={<IconSettings size={18} color="#504E76" stroke={1.8} />}>
        <PreferenciasSection />
      </Section>

      {/* PWA */}
      <Section title="Instalação no dispositivo" icon={<IconDeviceMobileMessage size={18} color="#3D7EB5" stroke={1.8} />}>
        <PWASection />
      </Section>

      {/* INTEGRAÇÕES */}
      <Section title="Integrações (APIs de cotação)" icon={<IconTrendingUp size={18} color="#504E76" stroke={1.8} />}>
        <BrapiTokenSection />
      </Section>

      {/* TAXAS */}
      <Section title="Taxas de mercado" icon={<IconTrendingUp size={18} color="#3A8580" stroke={1.8} />}>
        <TaxasMercadoSection />
      </Section>

      {/* DADOS */}
      <Section title="Dados" icon={<IconDatabase size={18} color="#9B7B6A" stroke={1.8} />}>
        <Row icon={<IconDeviceFloppy size={18} color="#C4553B" stroke={1.8} />} label="Exportar backup JSON" sub="Todos os dados do app (recomendado)" onClick={handleExport} />
        <Row icon={<IconDeviceFloppy size={18} color="#3A8580" stroke={1.8} />} label="Exportar transações CSV" sub="Compatível com Excel" onClick={handleCSV} />
        <ImportCSVSection />
        <Row icon={<IconRefresh size={18} color="#9B7B6A" stroke={1.8} />} label="Recriar categorias padrão" sub="Restaura as 14 categorias originais" onClick={() => seedCategories()} />
      </Section>

      {/* ZONA DE PERIGO */}
      <Section title="Zona de perigo" icon={<IconAlertTriangle size={18} color="#C4553B" stroke={1.8} />} danger>
        <ZonaPerigoSection />
      </Section>

      {/* SOBRE */}
      <Section title="Sobre" icon={<IconInfoCircle size={18} color="#9B7B6A" stroke={1.8} />}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', lineHeight: 1.7, margin: '0 0 14px' }}>
          Dados armazenados localmente no seu dispositivo (IndexedDB/Dexie.js).<br/>
          Stack: React · TypeScript · Vite · Framer Motion · Recharts · Tailwind v4
        </p>
        <a href="https://github.com/Interlinha/financeiro-yago" target="_blank" rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', background: '#F5F0E8', borderRadius: 10,
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
            color: '#2C1A0F', textDecoration: 'none',
          }}>
          <IconBrandGithub size={14} stroke={2} /> github.com/Interlinha/financeiro-yago
        </a>
      </Section>
    </div>
  )
}
