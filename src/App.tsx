import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthFlow } from '@/screens/AuthFlow'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

// ─── Lazy-loaded routes ──────────────────────────────────────────────
// Cada rota vira um chunk próprio. Bundle inicial cai de ~1.9MB pra ~600kb,
// first-paint mais rápido especialmente em 4G e em PWA cold start.
// Dashboard é eager (rota inicial — usuário sempre carrega) pra evitar
// flash de loading no boot. As outras carregam sob demanda.
import { Page as DashboardPage } from '@/modules/dashboard'

const TransacoesPage   = lazy(() => import('@/modules/transacoes').then(m => ({ default: m.Page })))
const CartoesPage      = lazy(() => import('@/modules/cartoes').then(m => ({ default: m.Page })))
const MaisPage         = lazy(() => import('@/modules/mais').then(m => ({ default: m.Page })))
const ContasPage       = lazy(() => import('@/modules/contas').then(m => ({ default: m.Page })))
const ContasFixasPage  = lazy(() => import('@/modules/contas-fixas').then(m => ({ default: m.Page })))
const MetasPage        = lazy(() => import('@/modules/metas').then(m => ({ default: m.Page })))
const InvestimentosPage = lazy(() => import('@/modules/investimentos').then(m => ({ default: m.Page })))
const DividasPage      = lazy(() => import('@/modules/dividas').then(m => ({ default: m.Page })))
const DesejosPage      = lazy(() => import('@/modules/desejos').then(m => ({ default: m.Page })))
const RelatoriosPage   = lazy(() => import('@/modules/relatorios').then(m => ({ default: m.Page })))
const ConfiguracoesPage = lazy(() => import('@/modules/configuracoes').then(m => ({ default: m.Page })))

// Fallback de loading entre rotas — discreto, não distrai.
function RouteLoading() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '40vh', opacity: 0.6,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '2.5px solid rgba(80,78,118,0.18)',
        borderTopColor: '#504E76',
        animation: 'spin 1s linear infinite',
      }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}

// R12h: REMOVIDO seedCategories + deduplicateCategories do App.tsx.
// Bug: rodavam ANTES do PIN unlock, bloqueando main thread com Dexie
// transaction pesada (dedupe de 60+ categorias × reassign FKs em 5
// tabelas com centenas de transações). PWA Mac ficava com tela branca
// 5-10s, congelando até o sistema.
//
// Agora rodam no AppShell APÓS o unlock — tela de PIN é instantânea,
// boot tasks rodam quando o user já está vendo o Dashboard (skeleton
// loaders escondem qualquer delay).
export default function App() {
  return (
    <ErrorBoundary>
      <AuthFlow>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="transacoes" element={<Suspense fallback={<RouteLoading />}><TransacoesPage /></Suspense>} />
              <Route path="cartoes" element={<Suspense fallback={<RouteLoading />}><CartoesPage /></Suspense>} />
              <Route path="mais" element={<Suspense fallback={<RouteLoading />}><MaisPage /></Suspense>} />
              <Route path="contas" element={<Suspense fallback={<RouteLoading />}><ContasPage /></Suspense>} />
              <Route path="contas-fixas" element={<Suspense fallback={<RouteLoading />}><ContasFixasPage /></Suspense>} />
              <Route path="metas" element={<Suspense fallback={<RouteLoading />}><MetasPage /></Suspense>} />
              <Route path="investimentos" element={<Suspense fallback={<RouteLoading />}><InvestimentosPage /></Suspense>} />
              <Route path="dividas" element={<Suspense fallback={<RouteLoading />}><DividasPage /></Suspense>} />
              <Route path="desejos" element={<Suspense fallback={<RouteLoading />}><DesejosPage /></Suspense>} />
              <Route path="relatorios" element={<Suspense fallback={<RouteLoading />}><RelatoriosPage /></Suspense>} />
              <Route path="configuracoes" element={<Suspense fallback={<RouteLoading />}><ConfiguracoesPage /></Suspense>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthFlow>
    </ErrorBoundary>
  )
}
