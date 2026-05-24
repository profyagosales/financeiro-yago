// ─── ErrorBoundary ──────────────────────────────────────────────────
// Captura erros de render React em toda a árvore abaixo. Sem isso, um
// único erro de componente (cálculo inválido, ref null, propriedade
// faltando vindo do sync) derruba o app inteiro em tela branca.
//
// Mostra fallback com:
//   - Mensagem amigável
//   - Botão "Recarregar" (force reload com cache busting)
//   - Botão "Limpar cache" (zera SW + caches + reload — opção nuclear)
//   - Detalhes técnicos colapsáveis
//
// Usado no root do App, envolvendo AppShell.

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { IconAlertTriangle, IconRefresh, IconTrash } from '@tabler/icons-react'

interface Props {
  children: ReactNode
  /** Fallback custom (default: tela full de erro) */
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null, showDetails: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log local + console pra debug (no Sentry/etc no futuro)
    console.error('[ErrorBoundary]', error, errorInfo)
    this.setState({ errorInfo })
    // Tenta gravar último erro no localStorage pra forensics
    try {
      localStorage.setItem('fy:last-error', JSON.stringify({
        message: error.message,
        stack: error.stack?.slice(0, 2000),
        componentStack: errorInfo.componentStack?.slice(0, 2000),
        time: new Date().toISOString(),
        href: window.location.href,
      }))
    } catch { /* localStorage cheio: noop */ }
  }

  handleReset = () => {
    this.setState({ error: null, errorInfo: null, showDetails: false })
  }

  handleReload = () => {
    // Reload limpo
    window.location.reload()
  }

  handleClearCache = async () => {
    // Opção nuclear: unregistra SW + apaga TODOS os caches + reload.
    // NÃO apaga IndexedDB (dados financeiros do user ficam preservados).
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map(r => r.unregister()))
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
      }
    } catch (e) {
      console.warn('[ErrorBoundary] cache clear failed:', e)
    }
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    if (this.props.fallback) {
      return this.props.fallback(this.state.error, this.handleReset)
    }

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'linear-gradient(135deg, #FBF8F3 0%, #F5EEE3 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        fontFamily: "'Plus Jakarta Sans',sans-serif",
      }}>
        <div style={{
          maxWidth: 460, width: '100%',
          background: '#FFFFFF', borderRadius: 20,
          padding: '32px 28px',
          boxShadow: '0 20px 60px rgba(80,40,20,0.16)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: '0 auto 18px',
            background: 'rgba(196,85,59,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconAlertTriangle size={32} stroke={2} color="#A8442B" />
          </div>
          <h1 style={{
            fontFamily: "'Fraunces',Georgia,serif",
            fontSize: 24, fontWeight: 700, color: '#2C1A0F',
            margin: '0 0 10px', letterSpacing: '-0.4px',
          }}>Algo travou no app</h1>
          <p style={{
            fontSize: 14, color: '#7A5C4F', lineHeight: 1.55,
            margin: '0 0 22px',
          }}>
            Encontramos um erro inesperado. Seus dados financeiros estão seguros — nada foi perdido.
            Recarregue a página pra continuar.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <button onClick={this.handleReload}
              style={{
                padding: '13px 0', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #504E76, #3D3B5F)',
                color: '#FFFFFF', cursor: 'pointer',
                fontSize: 14, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 6px 18px rgba(80,78,118,0.35)',
              }}>
              <IconRefresh size={16} stroke={2.4} /> Recarregar
            </button>
            <button onClick={this.handleClearCache}
              style={{
                padding: '11px 0', borderRadius: 12,
                border: '1.5px solid #EDE6DC', background: '#FBF8F3',
                color: '#7A5C4F', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <IconTrash size={13} stroke={2.2} /> Limpar cache do app
            </button>
          </div>

          <button onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700, color: '#9B7B6A',
              textTransform: 'uppercase', letterSpacing: '.1em',
              padding: '6px 12px',
            }}>
            {this.state.showDetails ? 'Ocultar detalhes' : 'Ver detalhes técnicos'}
          </button>

          {this.state.showDetails && (
            <div style={{
              marginTop: 14, padding: '12px 14px',
              background: '#FBF8F3', borderRadius: 10,
              border: '1px solid #EDE6DC',
              textAlign: 'left',
              fontSize: 10.5, color: '#7A5C4F',
              maxHeight: 200, overflowY: 'auto',
              fontFamily: "'SF Mono', Menlo, monospace",
            }}>
              <p style={{ margin: 0, fontWeight: 700, color: '#A8442B' }}>{this.state.error.message}</p>
              {this.state.error.stack && (
                <pre style={{
                  margin: '8px 0 0', fontSize: 10, lineHeight: 1.4,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>{this.state.error.stack.slice(0, 800)}</pre>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
}
