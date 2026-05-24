import { useState, useEffect } from 'react'
import { IconCheck, IconCreditCard } from '@tabler/icons-react'
import type { Cartao } from '@/db/schema'
import { addCartao, editCartao } from '@/db/hooks/useCartoes'
import { Modal } from '@/components/ui/Modal'
import { LogoUploader } from '@/components/ui/LogoUploader'
import { RealCardVisual } from '@/components/ui/RealCardVisual'
import { BandeiraLogo, BANDEIRAS_DISPONIVEIS } from '@/components/ui/BandeiraLogo'
import { useIsMobile } from '@/hooks/useIsMobile'
import { CORES_CARTAO } from './constants'

interface Props {
  open: boolean
  cartao?: Cartao | null
  onClose: () => void
}

export function CartaoForm({ open, cartao, onClose }: Props) {
  const isEditing = !!cartao
  const isMobile = useIsMobile()

  const [form, setForm] = useState({
    nome: cartao?.nome ?? '',
    bandeira: cartao?.bandeira ?? 'visa',
    limite: cartao?.limite !== undefined ? String(cartao.limite) : '',
    diaFechamento: cartao?.diaFechamento ? String(cartao.diaFechamento) : '1',
    diaVencimento: cartao?.diaVencimento ? String(cartao.diaVencimento) : '10',
    cor: cartao?.cor ?? '#820AD1',
    logo: cartao?.logo,
    titular: cartao?.titular ?? 'Yago Salese',
    ultimosDigitos: cartao?.ultimosDigitos ?? '',
  })

  useEffect(() => {
    if (!open) return
    setForm({
      nome: cartao?.nome ?? '',
      bandeira: cartao?.bandeira ?? 'visa',
      limite: cartao?.limite !== undefined ? String(cartao.limite) : '',
      diaFechamento: cartao?.diaFechamento ? String(cartao.diaFechamento) : '1',
      diaVencimento: cartao?.diaVencimento ? String(cartao.diaVencimento) : '10',
      cor: cartao?.cor ?? '#820AD1',
      logo: cartao?.logo,
      titular: cartao?.titular ?? 'Yago Salese',
      ultimosDigitos: cartao?.ultimosDigitos ?? '',
    })
  }, [open, cartao])

  const parseValor = (v: string) => parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0

  const handleSave = async () => {
    if (!form.nome || !form.limite) return
    const data = {
      nome: form.nome,
      bandeira: form.bandeira,
      limite: parseValor(form.limite),
      diaFechamento: parseInt(form.diaFechamento) || 1,
      diaVencimento: parseInt(form.diaVencimento) || 10,
      cor: form.cor,
      logo: form.logo,
      titular: form.titular || undefined,
      ultimosDigitos: form.ultimosDigitos.length === 4 ? form.ultimosDigitos : undefined,
      ativo: true,
    }
    if (isEditing && cartao?.id) {
      await editCartao(cartao.id, data)
    } else {
      await addCartao(data)
    }
    onClose()
  }

  const previewNome = form.nome || 'Seu cartão'

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      title={isEditing ? 'Editar cartão' : 'Novo cartão'}
      subtitle={isEditing ? 'Atualize os dados do cartão' : 'Adicione seu cartão de crédito'}
      icon={<IconCreditCard size={22} stroke={1.8} color="#7A5C4F" />}
    >
      <div style={{
        flex: 1, overflowY: 'auto',
        display: 'grid',
        // Mobile: 1 coluna (preview vai pro topo, compacto).
        // Desktop: 2 colunas (form esquerda, preview direita).
        gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr',
        gap: 0,
      }}>
        {/* ── MOBILE: preview compacto no topo ── */}
        {isMobile && (
          <div style={{
            padding: '14px 18px 6px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            borderBottom: '1px solid rgba(44,26,15,0.06)',
          }}>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9.5, fontWeight: 700,
              color: '#9B7B6A', letterSpacing: '.14em', textTransform: 'uppercase', margin: 0,
            }}>Pré-visualização</p>
            <div style={{ transform: 'scale(0.78)', transformOrigin: 'center top', marginBottom: -40 }}>
              <RealCardVisual
                nome={previewNome}
                bandeira={form.bandeira}
                cor={form.cor}
                logo={form.logo}
                titular={form.titular}
                ultimosDigitos={form.ultimosDigitos.length === 4 ? form.ultimosDigitos : undefined}
                diaVencimento={parseInt(form.diaVencimento) || 12}
                cartaoId={cartao?.id ?? 99}
              />
            </div>
          </div>
        )}

        {/* ── LEFT (desktop) / TOPO (mobile): form ── */}
        <div style={{
          padding: isMobile ? '16px 18px' : '24px 28px',
          borderRight: isMobile ? 'none' : '1px solid #EDE6DC',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>

          {/* Bandeira */}
          <Field label="Bandeira do cartão">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
              {BANDEIRAS_DISPONIVEIS.map(b => {
                const active = form.bandeira === b.value
                return (
                  <button key={b.value}
                    onClick={() => setForm(f => ({ ...f, bandeira: b.value }))}
                    style={{
                      background: active ? '#2C1A0F' : '#FBF8F3',
                      border: `1.5px solid ${active ? '#2C1A0F' : '#EDE6DC'}`,
                      borderRadius: 10, padding: '10px 8px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      transition: 'all .15s',
                    }}>
                    <BandeiraLogo bandeira={b.value} size={38} variant={active ? 'light' : 'dark'} />
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
                      color: active ? '#FFFFFF' : '#7A5C4F', letterSpacing: '.04em',
                    }}>{b.label}</span>
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Logo upload */}
          <Field label="Logo do banco (opcional)">
            <LogoUploader
              logo={form.logo}
              nome={form.nome || 'NA'}
              cor={form.cor}
              onChange={logo => setForm(f => ({ ...f, logo }))}
            />
          </Field>

          {/* Nome do cartão */}
          <Field label="Apelido do cartão">
            <input
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Nubank Roxinho, Inter Mastercard"
              style={INPUT_STYLE}
            />
          </Field>

          {/* Titular + últimos dígitos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
            <Field label="Titular (no cartão)">
              <input
                value={form.titular}
                onChange={e => setForm(f => ({ ...f, titular: e.target.value }))}
                placeholder="Nome impresso"
                style={INPUT_STYLE}
              />
            </Field>
            <Field label="Últimos 4 dígitos (opc.)">
              <input
                value={form.ultimosDigitos}
                onChange={e => setForm(f => ({
                  ...f, ultimosDigitos: e.target.value.replace(/[^\d]/g, '').slice(0, 4),
                }))}
                placeholder="0000"
                inputMode="numeric"
                style={INPUT_STYLE}
              />
            </Field>
          </div>

          {/* Limite */}
          <Field label="Limite total (R$)">
            <input
              value={form.limite}
              onChange={e => setForm(f => ({ ...f, limite: e.target.value }))}
              placeholder="0,00" inputMode="decimal"
              style={INPUT_STYLE}
            />
          </Field>

          {/* Dias */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
            <Field label="Dia fechamento">
              <input
                value={form.diaFechamento}
                onChange={e => setForm(f => ({ ...f, diaFechamento: e.target.value.replace(/[^\d]/g, '').slice(0, 2) }))}
                placeholder="1" inputMode="numeric"
                style={INPUT_STYLE}
              />
            </Field>
            <Field label="Dia vencimento">
              <input
                value={form.diaVencimento}
                onChange={e => setForm(f => ({ ...f, diaVencimento: e.target.value.replace(/[^\d]/g, '').slice(0, 2) }))}
                placeholder="10" inputMode="numeric"
                style={INPUT_STYLE}
              />
            </Field>
          </div>

          {/* Cor */}
          <Field label="Cor do cartão">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CORES_CARTAO.map(c => (
                <button key={c}
                  onClick={() => setForm(f => ({ ...f, cor: c }))}
                  title={c}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: c,
                    border: form.cor === c ? '3px solid #2C1A0F' : '2px solid #FFFFFF',
                    boxShadow: form.cor === c ? '0 4px 12px rgba(44,26,15,0.2)' : '0 1px 4px rgba(44,26,15,0.12)',
                    cursor: 'pointer', transition: 'all .15s',
                  }}/>
              ))}
            </div>
          </Field>
        </div>

        {/* ── RIGHT (desktop only): preview do cartão ao vivo ── */}
        {!isMobile && (
          <div style={{
            padding: '28px',
            background: 'linear-gradient(180deg, #FAF6F0 0%, #FFFFFF 100%)',
            display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center',
          }}>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
              color: '#9B7B6A', letterSpacing: '.16em', textTransform: 'uppercase', margin: 0,
            }}>Pré-visualização</p>

            <RealCardVisual
              nome={previewNome}
              bandeira={form.bandeira}
              cor={form.cor}
              logo={form.logo}
              titular={form.titular}
              ultimosDigitos={form.ultimosDigitos.length === 4 ? form.ultimosDigitos : undefined}
              diaVencimento={parseInt(form.diaVencimento) || 12}
              cartaoId={cartao?.id ?? 99}
            />

            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A',
              margin: 0, lineHeight: 1.5,
            }}>
              Os últimos 4 dígitos podem ser personalizados — os demais números são gerados aleatoriamente apenas pra ilustração visual.
            </p>
          </div>
        )}
      </div>

      <Modal.Footer>
        <button onClick={onClose} style={SECONDARY_BTN}>Cancelar</button>
        <button onClick={handleSave}
          disabled={!form.nome || !form.limite}
          style={{ ...PRIMARY_BTN, opacity: (!form.nome || !form.limite) ? 0.5 : 1, cursor: (!form.nome || !form.limite) ? 'not-allowed' : 'pointer' }}>
          <IconCheck size={16} stroke={2.5} />
          {isEditing ? 'Salvar alterações' : 'Adicionar cartão'}
        </button>
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
