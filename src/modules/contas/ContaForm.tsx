import { useState, useEffect } from 'react'
import { IconCheck, IconBuildingBank, IconPlus, IconHistory, IconTrash } from '@tabler/icons-react'
import type { Conta } from '@/db/schema'
import { Modal } from '@/components/ui/Modal'
import { BankLogo } from '@/components/ui/BankLogo'
import { LogoUploader } from '@/components/ui/LogoUploader'
import { fmt } from '@/lib/format'
import { BANK_PRESETS, TIPOS_CONTA, CORES_CONTA } from './constants'

interface Props {
  open: boolean
  conta?: Conta | null
  onClose: () => void
  onSave: (data: Omit<Conta, 'id' | 'syncId' | 'updatedAt'>) => Promise<void> | void
  /** Quando definida + modo edit, exibe botão "Excluir conta" no rodapé.
   *  Desktop usa botão próprio no AccountDetail e não passa essa prop. */
  onDelete?: () => void
}

export function ContaForm({ open, conta, onClose, onSave, onDelete }: Props) {
  const isEditing = !!conta

  // Encontra preset do banco baseado no nome (pra modo edit)
  const matchPreset = (nome: string) => {
    const lower = nome.toLowerCase()
    return BANK_PRESETS.find(b => lower.includes(b.key) || lower === b.nome.toLowerCase())
  }

  const [form, setForm] = useState({
    nome: conta?.nome ?? '',
    tipo: conta?.tipo ?? 'corrente',
    saldoInicial: conta?.saldoInicial !== undefined ? String(conta.saldoInicial) : '',
    cor: conta?.cor ?? '#C4553B',
    logo: conta?.logo,
    bankKey: '' as string,
    customNome: false,  // quando true, não auto-sobrescreve o nome com o preset
  })

  // Inicialização do form no edit / abrir
  useEffect(() => {
    if (!open) return
    if (conta) {
      const preset = matchPreset(conta.nome)
      setForm({
        nome: conta.nome,
        tipo: conta.tipo,
        saldoInicial: String(conta.saldoInicial),
        cor: conta.cor,
        logo: conta.logo,
        bankKey: preset?.key ?? 'outro',
        customNome: !preset || preset.nome.toLowerCase() !== conta.nome.toLowerCase(),
      })
    } else {
      setForm({
        nome: '', tipo: 'corrente', saldoInicial: '', cor: '#C4553B', logo: undefined,
        bankKey: '', customNome: false,
      })
    }
  }, [open, conta])

  const parseValor = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0
  const saldoNum = parseValor(form.saldoInicial)

  const handleBankSelect = (preset: typeof BANK_PRESETS[number]) => {
    setForm(f => ({
      ...f,
      bankKey: preset.key,
      nome: f.customNome ? f.nome : preset.nome,
      cor: preset.cor,
      tipo: f.tipo || preset.tipoSugerido || 'corrente',
    }))
  }

  const handleSave = async () => {
    if (!form.nome) return
    await onSave({
      nome: form.nome,
      tipo: form.tipo,
      saldoInicial: saldoNum,
      saldoAtual: isEditing ? (conta?.saldoAtual ?? saldoNum) : saldoNum,
      cor: form.cor,
      icone: '',
      logo: form.logo,
      ativo: true,
    })
    onClose()
  }

  const previewNome = form.nome || 'Sua conta'

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      title={isEditing ? 'Editar conta' : 'Nova conta'}
      subtitle={isEditing ? 'Atualize os dados desta conta' : 'Cadastre uma conta bancária ou carteira'}
      icon={<IconBuildingBank size={22} stroke={1.8} color="#7A5C4F" />}
    >
      {/* Body com grid 1.4fr | 1fr (form esquerda, preview direita).
          Em mobile, esconde a coluna do preview e form ocupa tudo. */}
      <div className="cf-body" style={{
        flex: 1,
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: 0,
      }}>
        <style>{`
          @media (max-width: 767px) {
            .cf-body { grid-template-columns: 1fr !important; }
            .cf-form { border-right: none !important; padding: 18px 16px !important; }
            .cf-preview { display: none !important; }
          }
        `}</style>
        {/* ── LEFT: Form ── */}
        <div className="cf-form" style={{ padding: '24px 28px', borderRight: '1px solid #EDE6DC', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Banco */}
          <Field label="Banco / Instituição">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
              {BANK_PRESETS.slice(0, 16).map(b => {
                const active = form.bankKey === b.key
                return (
                  <button key={b.key}
                    onClick={() => handleBankSelect(b)}
                    style={{
                      background: active ? `${b.cor}14` : '#FBF8F3',
                      border: `1.5px solid ${active ? b.cor : '#EDE6DC'}`,
                      borderRadius: 12, padding: '10px 8px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      transition: 'all .15s',
                    }}>
                    <BankLogo nome={b.nome} cor={b.cor} size={32} />
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
                      color: active ? b.cor : '#2C1A0F', letterSpacing: '.02em',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: '100%',
                    }}>{b.nome}</span>
                  </button>
                )
              })}
              {/* Outro */}
              {(() => {
                const b = BANK_PRESETS.find(x => x.key === 'outro')!
                const active = form.bankKey === b.key
                return (
                  <button key={b.key}
                    onClick={() => handleBankSelect(b)}
                    style={{
                      background: active ? `${b.cor}14` : '#FBF8F3',
                      border: `1.5px solid ${active ? b.cor : '#EDE6DC'}`,
                      borderRadius: 12, padding: '10px 8px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      transition: 'all .15s',
                    }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'rgba(122,92,79,0.1)',
                      border: '1.5px dashed #9B7B6A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <IconPlus size={16} stroke={2} color="#7A5C4F" />
                    </div>
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
                      color: active ? b.cor : '#2C1A0F', letterSpacing: '.02em',
                    }}>Outro</span>
                  </button>
                )
              })()}
            </div>
          </Field>

          {/* Logo */}
          <Field label="Logo (opcional)">
            <LogoUploader
              logo={form.logo}
              nome={form.nome || 'NA'}
              cor={form.cor}
              onChange={logo => setForm(f => ({ ...f, logo }))}
            />
          </Field>

          {/* Nome da conta */}
          <Field label="Nome da conta">
            <input
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value, customNome: true }))}
              placeholder="Ex: Conta principal, Nubank PJ, Cripto Binance"
              style={INPUT_STYLE}
            />
          </Field>

          {/* Saldo + Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14 }}>
            <Field label={isEditing ? 'Saldo inicial (R$)' : 'Saldo atual (R$)'}>
              <input
                value={form.saldoInicial}
                onChange={e => setForm(f => ({ ...f, saldoInicial: e.target.value }))}
                placeholder="0,00" inputMode="decimal"
                style={INPUT_STYLE}
              />
            </Field>
            <Field label="Tipo de conta">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TIPOS_CONTA.map(t => {
                  const active = form.tipo === t.value
                  return (
                    <button key={t.value}
                      onClick={() => setForm(f => ({ ...f, tipo: t.value }))}
                      title={t.descricao}
                      style={{
                        background: active ? form.cor : '#FBF8F3',
                        color: active ? '#FFFFFF' : '#7A5C4F',
                        border: `1.5px solid ${active ? form.cor : '#EDE6DC'}`,
                        borderRadius: 22, padding: '6px 12px',
                        cursor: 'pointer',
                        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                        letterSpacing: '.02em', transition: 'all .15s',
                      }}>
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </Field>
          </div>

          {/* Cor */}
          <Field label="Cor do tema">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CORES_CONTA.map(c => (
                <button key={c}
                  onClick={() => setForm(f => ({ ...f, cor: c }))}
                  title={c}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: c,
                    border: form.cor === c ? '3px solid #2C1A0F' : '2px solid #FFFFFF',
                    boxShadow: form.cor === c ? '0 4px 12px rgba(44,26,15,0.18)' : '0 1px 4px rgba(44,26,15,0.12)',
                    cursor: 'pointer', transition: 'all .15s',
                  }}/>
              ))}
            </div>
          </Field>
        </div>

        {/* ── RIGHT: Preview ao vivo (escondido em mobile via .cf-preview) ── */}
        <div className="cf-preview" style={{
          padding: '24px 28px',
          background: 'linear-gradient(180deg, #FAF6F0 0%, #FFFFFF 100%)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
            color: '#9B7B6A', letterSpacing: '.16em', textTransform: 'uppercase', margin: 0,
          }}>Preview</p>

          {/* Live preview do card */}
          <div style={{
            position: 'relative',
            background: '#FFFFFF',
            border: '1px solid #EDE6DC',
            borderTop: `4px solid ${form.cor}`,
            borderRadius: 18,
            padding: '18px 20px',
            boxShadow: '0 4px 16px rgba(44,26,15,0.08)',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <BankLogo logo={form.logo} nome={previewNome} cor={form.cor} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700,
                  color: '#2C1A0F', margin: 0, letterSpacing: '-0.4px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{previewNome}</p>
                <span style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
                  color: form.cor, background: `${form.cor}18`,
                  padding: '2px 8px', borderRadius: 6,
                  letterSpacing: '.06em', textTransform: 'uppercase',
                  display: 'inline-block', marginTop: 4,
                }}>{form.tipo}</span>
              </div>
            </div>
            <div>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
                color: '#9B7B6A', letterSpacing: '.12em', textTransform: 'uppercase', margin: 0,
              }}>Saldo atual</p>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 26, fontWeight: 700,
                color: saldoNum < 0 ? '#C4553B' : '#2C1A0F', letterSpacing: '-0.3px', margin: '4px 0 0', lineHeight: 1,
              }}>{fmt(saldoNum)}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div style={{
                background: form.cor, color: '#FFFFFF',
                borderRadius: 10, padding: '8px 10px',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                boxShadow: `0 3px 10px ${form.cor}40`,
              }}>
                <IconPlus size={12} stroke={2.5}/> Lançar
              </div>
              <div style={{
                background: '#FBF8F3', color: '#2C1A0F', border: '1px solid #EDE6DC',
                borderRadius: 10, padding: '8px 10px',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                <IconHistory size={11} stroke={2}/> Histórico
              </div>
            </div>
          </div>

          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A',
            margin: 0, lineHeight: 1.5,
          }}>
            Esse é o cartão como ele aparece na página de contas. Edite os campos à esquerda e veja o resultado ao vivo aqui.
          </p>
        </div>
      </div>

      {/* Footer */}
      <Modal.Footer align={isEditing && onDelete ? 'between' : 'end'}>
        {isEditing && onDelete && (
          <button onClick={onDelete} style={DANGER_GHOST_BTN}>
            <IconTrash size={15} stroke={2.2} /> Excluir conta
          </button>
        )}
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
          <button onClick={onClose} style={SECONDARY_BTN}>Cancelar</button>
          <button onClick={handleSave}
            disabled={!form.nome}
            style={{ ...PRIMARY_BTN, opacity: !form.nome ? 0.5 : 1, cursor: !form.nome ? 'not-allowed' : 'pointer' }}>
            <IconCheck size={16} stroke={2.5} />
            {isEditing ? 'Salvar alterações' : 'Adicionar conta'}
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
        color: '#7A5C4F', letterSpacing: '.12em', textTransform: 'uppercase',
        display: 'block', marginBottom: 8,
      }}>{label}</span>
      {children}
    </label>
  )
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#FBF8F3', border: '1.5px solid #EDE6DC',
  borderRadius: 10, padding: '11px 14px',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 500,
  color: '#2C1A0F', outline: 'none',
}

const PRIMARY_BTN: React.CSSProperties = {
  background: 'linear-gradient(135deg, #D4643A, #C4553B)',
  color: '#FFFFFF', border: 'none', borderRadius: 12,
  padding: '11px 22px',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
  display: 'inline-flex', alignItems: 'center', gap: 7,
  boxShadow: '0 4px 16px rgba(196,85,59,0.35)',
}

const SECONDARY_BTN: React.CSSProperties = {
  background: 'transparent', color: '#7A5C4F', border: '1.5px solid #EDE6DC',
  borderRadius: 12, padding: '11px 20px', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
}

const DANGER_GHOST_BTN: React.CSSProperties = {
  background: 'rgba(196,85,59,0.08)', color: '#C4553B',
  border: '1.5px solid rgba(196,85,59,0.25)', borderRadius: 12,
  padding: '11px 16px', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
  display: 'inline-flex', alignItems: 'center', gap: 7,
}
