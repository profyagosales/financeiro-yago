import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { db, seedCategories } from '@/db/schema'
import { Dobrao } from '@/components/mascot/Dobrao'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { addTransacao } from '@/db/hooks/useTransacoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useContas } from '@/db/hooks/useContas'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { IconLock, IconDeviceFloppy, IconBrandChrome, IconDeviceMobile, IconBrandApple, IconRefresh, IconChevronRight, IconCheck, IconTableImport, IconShieldLock, IconDeviceMobileMessage, IconDatabase, IconInfoCircle, IconFile, IconTrendingUp } from '@tabler/icons-react'
import { useTaxasBenchmark, setTaxasBenchmark, useBrapiToken, setBrapiToken } from '@/db/hooks/useAppConfig'

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 20, padding: '18px 20px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        {icon && <div style={{ width: 32, height: 32, borderRadius: 10, background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>}
        <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 17, fontWeight: 700, color: '#2C1A0F' }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Row({ icon, label, sub, onClick, danger, right }: { icon: React.ReactNode; label: string; sub?: string; onClick?: () => void; danger?: boolean; right?: React.ReactNode }) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.98 }} whileHover={{ x: 2 }}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', border: 'none', background: 'none', cursor: onClick ? 'pointer' : 'default', textAlign: 'left', borderBottom: '0.5px solid #F5F0E8' }}>
      <div style={{ width: 36, height: 36, borderRadius: 11, background: danger ? '#FAF0EE' : '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: danger ? '#C4553B' : '#2C1A0F' }}>{label}</p>
        {sub && <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', marginTop: 1 }}>{sub}</p>}
      </div>
      {right ?? <IconChevronRight size={16} color="#C4B4A8" />}
    </motion.button>
  )
}

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
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', lineHeight: 1.6 }}>
                Formato esperado: <strong>data, descrição, valor</strong><br/>
                Datas: DD/MM/AAAA ou AAAA-MM-DD · Valores negativos = despesa
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
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#3A8580' }}>{rows.length} linhas detectadas</p>
                  </div>
                  <div style={{ maxHeight: 140, overflowY: 'auto', border: '0.5px solid #E8E0D5', borderRadius: 10 }}>
                    {rows.slice(0, 8).map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 10px', borderBottom: i < 7 ? '0.5px solid #F5F0E8' : 'none', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#9B7B6A', flexShrink: 0 }}>{r.data}</span>
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#2C1A0F', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descricao}</span>
                        <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 12, fontWeight: 700, color: r.tipo === 'receita' ? '#3A8580' : '#C4553B', flexShrink: 0 }}>
                          {r.tipo === 'receita' ? '+' : '−'}R$ {r.valor.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {rows.length > 8 && <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#9B7B6A', padding: '6px 10px', textAlign: 'center' }}>... e mais {rows.length - 8}</p>}
                  </div>

                  <div>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#9B7B6A', marginBottom: 5 }}>CATEGORIA</p>
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
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#9B7B6A', marginBottom: 5 }}>CONTA</p>
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

function PinSection() {
  const { setPin } = useAuthStore()
  const [pinAtual, setPinAtual] = useState(''); const [pinNovo, setPinNovo] = useState(''); const [pinConf, setPinConf] = useState('')
  const [msg, setMsg] = useState(''); const [open, setOpen] = useState(false)
  const handleChange = async () => {
    if (pinNovo !== pinConf) { setMsg('PINs não coincidem'); return }
    if (pinNovo.length < 4) { setMsg('Mínimo 4 dígitos'); return }
    const ok = await setPin(pinAtual, pinNovo)
    setMsg(ok ? '✓ PIN alterado!' : 'PIN atual incorreto')
    if (ok) { setPinAtual(''); setPinNovo(''); setPinConf('') }
    setTimeout(() => setMsg(''), 3000)
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
                  style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '11px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none' }} />
              ))}
              {msg && <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: msg.includes('✓') ? '#3A8580' : '#C4553B', fontWeight: 600 }}>{msg}</p>}
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

function PWASection() {
  const { canInstall, install } = usePWAInstall()
  const [showGuide, setShowGuide] = useState(false)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isMac = /Macintosh/.test(navigator.userAgent)

  return (
    <>
      {canInstall && (
        <Row icon={<IconDeviceMobile size={18} color="#3D7EB5" stroke={1.8} />} label="Instalar como app" sub="Adicionar à tela inicial" onClick={install}
          right={<div style={{ background: '#C4553B', color: 'white', padding: '5px 12px', borderRadius: 20, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700 }}>Instalar</div>} />
      )}
      <Row icon={isIOS ? <IconBrandApple size={18} color="#2C1A0F" stroke={1.8} /> : <IconBrandChrome size={18} color="#E89527" stroke={1.8} />}
        label="Como instalar o PWA" sub="Guia passo a passo" onClick={() => setShowGuide(o => !o)} />
      <AnimatePresence>
        {showGuide && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isIOS ? (
                <>
                  <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F', marginBottom: 4 }}>No iPhone / iPad (Safari):</p>
                  {['Abra este site no Safari', 'Toque no ícone de compartilhar ↑ (barra inferior)', 'Toque em "Adicionar à Tela de Início"', 'Toque em "Adicionar" — pronto!'].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#C4553B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: 'white' }}>{i+1}</span>
                      </div>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#2C1A0F' }}>{s}</p>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F', marginBottom: 4 }}>No Chrome (Android / Desktop):</p>
                  {['Abra no Chrome', 'Toque no menu ⋮ (3 pontos)', 'Toque em "Instalar app" ou "Adicionar à tela inicial"', 'Confirme — o app aparece na tela inicial!'].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#C4553B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: 'white' }}>{i+1}</span>
                      </div>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#2C1A0F' }}>{s}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function BrapiTokenSection() {
  const tokenAtual = useBrapiToken()
  const [token, setToken] = useState(tokenAtual)
  const [saved, setSaved] = useState(false)
  const [show, setShow] = useState(false)

  // Sincroniza quando carrega
  // (não use useEffect aqui pra não conflitar com digitação)

  const handleSave = async () => {
    await setBrapiToken(token)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#7A5C4F', lineHeight: 1.5, marginBottom: 14 }}>
        <strong>Brapi.dev</strong> é a API gratuita usada pra buscar cotações de ações, FIIs, ETFs e câmbio USD/BRL.
        Desde 2024 exige token de autenticação (free: 1.000 requisições/dia).
      </p>

      <div style={{
        background: '#FAF6F0', border: '1px solid #EDE6DC', borderRadius: 10,
        padding: '10px 12px', marginBottom: 14,
      }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', margin: 0, lineHeight: 1.5 }}>
          <strong>1.</strong> Acesse <a href="https://brapi.dev" target="_blank" rel="noreferrer" style={{ color: '#3D7EB5', textDecoration: 'underline' }}>brapi.dev</a> e crie conta gratuita<br/>
          <strong>2.</strong> Copie o token no dashboard (começa com letras + números)<br/>
          <strong>3.</strong> Cole aqui embaixo e salve
        </p>
      </div>

      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>Token Brapi</p>
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
            : <><IconInfoCircle size={12} stroke={2} /> Sem token: cotações de B3 desativadas (cripto continua funcionando)</>}
        </p>
        <motion.button onClick={handleSave} whileTap={{ scale: 0.97 }}
          style={{
            background: saved ? '#3A8580' : 'linear-gradient(135deg, #D4643A, #C4553B)',
            color: 'white', border: 'none', borderRadius: 12,
            padding: '10px 18px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 12px rgba(196,85,59,0.3)',
            transition: 'background .2s',
            flexShrink: 0,
          }}>
          {saved ? <><IconCheck size={14} stroke={2.5} /> Salvo!</> : 'Salvar token'}
        </motion.button>
      </div>
    </div>
  )
}

function TaxasMercadoSection() {
  const taxas = useTaxasBenchmark()
  const [form, setForm] = useState({
    cdi: (taxas.cdi * 100).toFixed(2),
    selic: (taxas.selic * 100).toFixed(2),
    ipca: (taxas.ipca * 100).toFixed(2),
  })
  const [saved, setSaved] = useState(false)

  // Sincroniza quando taxas mudam (ex: hot reload, sync)
  // Não usamos useEffect pra evitar conflito enquanto digita

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
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#7A5C4F', lineHeight: 1.5, marginBottom: 14 }}>
        Usado para calcular o rendimento de investimentos pós-fixados (% CDI, % Selic) e híbridos (IPCA+X%).
        Atualize aqui sempre que o COPOM ou o IBGE divulgar novos valores.
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
        <motion.button onClick={handleSave} whileTap={{ scale: 0.97 }}
          style={{
            background: saved ? '#3A8580' : 'linear-gradient(135deg, #D4643A, #C4553B)',
            color: 'white', border: 'none', borderRadius: 12,
            padding: '10px 18px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 12px rgba(196,85,59,0.3)',
            transition: 'background .2s',
          }}>
          {saved ? <><IconCheck size={14} stroke={2.5} /> Salvo!</> : 'Salvar taxas'}
        </motion.button>
      </div>
    </div>
  )
}

function TaxaInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FBF8F3', border: '1.5px solid #EDE6DC', borderRadius: 10, padding: '8px 12px' }}>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="10,65"
          inputMode="decimal"
          style={{ border: 'none', background: 'transparent', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none', width: '100%', minWidth: 0, letterSpacing: '-0.3px' }}
        />
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#9B7B6A' }}>% a.a.</span>
      </div>
    </div>
  )
}

export function Page() {
  const { lock } = useAuthStore()
  const [msg, setMsg] = useState('')

  const handleExport = async () => {
    const [contas, cats, txs, cartoes, fixas, metas] = await Promise.all([
      db.contas.toArray(), db.categorias.toArray(), db.transacoes.toArray(),
      db.cartoes.toArray(), db.contasFixas.toArray(), db.metas.toArray(),
    ])
    const data = { exportedAt: new Date().toISOString(), contas, categorias: cats, transacoes: txs, cartoes, contasFixas: fixas, metas }
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
    <div style={{ padding: '24px 28px', width: '100%', maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Dobrao mood="waving" size={72} />
        <div>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F' }}>Configurações</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 2 }}>Financeiro do Yago · v1.0</p>
        </div>
      </div>

      {msg && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{ background: '#EBF5F0', border: '1px solid #D0E8D8', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconCheck size={16} color="#3A8580" />
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#3A8580' }}>{msg}</p>
        </motion.div>
      )}

      <Section title="Acesso" icon={<IconShieldLock size={18} color="#C4553B" stroke={1.8} />}>
        <PinSection />
        <Row icon={<IconLock size={18} color="#9B7B6A" stroke={1.8} />} label="Bloquear agora" sub="Requer PIN na próxima abertura" onClick={() => lock()} danger right={<span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A' }}>→</span>} />
      </Section>

      <Section title="Instalação PWA" icon={<IconDeviceMobileMessage size={18} color="#3D7EB5" stroke={1.8} />}>
        <PWASection />
      </Section>

      <Section title="Integrações (APIs de cotação)" icon={<IconTrendingUp size={18} color="#504E76" stroke={1.8} />}>
        <BrapiTokenSection />
      </Section>

      <Section title="Taxas de mercado" icon={<IconTrendingUp size={18} color="#3A8580" stroke={1.8} />}>
        <TaxasMercadoSection />
      </Section>

      <Section title="Dados" icon={<IconDatabase size={18} color="#9B7B6A" stroke={1.8} />}>
        <Row icon={<IconDeviceFloppy size={18} color="#C4553B" stroke={1.8} />} label="Exportar backup JSON" sub="Todos os dados do app" onClick={handleExport} />
        <Row icon={<IconDeviceFloppy size={18} color="#3A8580" stroke={1.8} />} label="Exportar transações CSV" sub="Compatível com Excel" onClick={handleCSV} />
        <ImportCSVSection />
        <Row icon={<IconRefresh size={18} color="#9B7B6A" stroke={1.8} />} label="Recriar categorias padrão" sub="Restaura as 14 categorias originais" onClick={() => seedCategories()} />
      </Section>

      <Section title="Sobre" icon={<IconInfoCircle size={18} color="#9B7B6A" stroke={1.8} />}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', lineHeight: 1.7 }}>
          Dados armazenados localmente (IndexedDB/Dexie.js).<br/>
          Sync em nuvem via Supabase — São Paulo.<br/>
          Stack: React · TypeScript · Vite · Framer Motion · Recharts<br/>
          Repositório: github.com/Interlinha/financeiro-yago
        </p>
      </Section>
    </div>
  )
}
