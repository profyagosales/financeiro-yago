import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthFlow } from '@/screens/AuthFlow'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

// R12i: AppShell lazy + DashboardPage lazy. Antes carregavam ESTATICAMENTE
// no bundle index — forçando ~600KB de Dexie/Supabase/framer/Recharts a
// dar parse antes do AuthFlow nem montar. Em PWA Safari standalone (sem
// JIT desde iOS 16), parse de 935KB demorava 3-8s = tela branca.
// Agora: bundle inicial só tem AuthFlow + ErrorBoundary + React Router.
// AppShell + Dashboard só carregam DEPOIS do unlock.
const AppShell = lazy(() => import('@/components/layout/AppShell').then(m => ({ default: m.AppShell })))

// ─── Lazy-loaded routes ──────────────────────────────────────────────
// R12i: TUDO lazy (Dashboard também). Era eager pra evitar flash, mas
// trazia chunk de Recharts (325KB) pro bundle inicial — destruía boot.
// Skeleton no Suspense fallback resolve o flash visualmente.
const DashboardPage    = lazy(() => import('@/modules/dashboard').then(m => ({ default: m.Page })))
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
          <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<AppShell />}>
              <Route index element={<Suspense fallback={<RouteLoading />}><DashboardPage /></Suspense>} />
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
          </Suspense>
        </BrowserRouter>
      </AuthFlow>
    </ErrorBoundary>
  )
}
