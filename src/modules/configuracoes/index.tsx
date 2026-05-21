import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { db, seedCategories } from '@/db/schema'
import { Dobrao } from '@/components/mascot/Dobrao'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { IconLock, IconDeviceFloppy, IconBrandChrome, IconDeviceMobile, IconBrandApple, IconRefresh, IconChevronRight, IconCheck } from '@tabler/icons-react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 20, padding: '18px 20px', marginBottom: 14 }}>
      <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 17, fontWeight: 700, color: '#2C1A0F', marginBottom: 14 }}>{title}</h2>
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

      <Section title="🔒 Acesso">
        <PinSection />
        <Row icon={<IconLock size={18} color="#9B7B6A" stroke={1.8} />} label="Bloquear agora" sub="Requer PIN na próxima abertura" onClick={() => lock()} danger right={<span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A' }}>→</span>} />
      </Section>

      <Section title="📱 Instalação PWA">
        <PWASection />
      </Section>

      <Section title="💾 Dados">
        <Row icon={<IconDeviceFloppy size={18} color="#C4553B" stroke={1.8} />} label="Exportar backup JSON" sub="Todos os dados do app" onClick={handleExport} />
        <Row icon={<IconDeviceFloppy size={18} color="#3A8580" stroke={1.8} />} label="Exportar transações CSV" sub="Compatível com Excel" onClick={handleCSV} />
        <Row icon={<IconRefresh size={18} color="#9B7B6A" stroke={1.8} />} label="Recriar categorias padrão" sub="Restaura as 14 categorias originais" onClick={() => seedCategories()} />
      </Section>

      <Section title="ℹ️ Sobre">
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
