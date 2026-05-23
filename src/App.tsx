import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { PinGate } from '@/screens/PinGate'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/modules/dashboard/DashboardPage'
import { Page as TransacoesPage } from '@/modules/transacoes'
import { Page as CartoesPage } from '@/modules/cartoes'
import { Page as MaisPage } from '@/modules/mais'
import { Page as ContasPage } from '@/modules/contas'
import { Page as ContasFixasPage } from '@/modules/contas-fixas'
import { Page as ParcelamentosPage } from '@/modules/parcelamentos'
import { Page as MetasPage } from '@/modules/metas'
import { Page as PatrimonioPage } from '@/modules/patrimonio'
import { Page as InvestimentosPage } from '@/modules/investimentos'
import { Page as DividasPage } from '@/modules/dividas'
import { Page as DesejosPage } from '@/modules/desejos'
import { Page as RelatoriosPage } from '@/modules/relatorios'
import { Page as ConfiguracoesPage } from '@/modules/configuracoes'
import { seedCategories, deduplicateCategories } from '@/db/schema'

export default function App() {
  const { isUnlocked, checkSession } = useAuthStore()

  useEffect(() => {
    checkSession()
    seedCategories().then(deduplicateCategories)
  }, [])

  return (
    <AnimatePresence mode="wait">
      {!isUnlocked ? (
        <PinGate key="pin" />
      ) : (
        <BrowserRouter key="app">
          <Routes>
            <Route path="/" element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="transacoes" element={<TransacoesPage />} />
              <Route path="cartoes" element={<CartoesPage />} />
              <Route path="mais" element={<MaisPage />} />
              <Route path="contas" element={<ContasPage />} />
              <Route path="contas-fixas" element={<ContasFixasPage />} />
              <Route path="parcelamentos" element={<ParcelamentosPage />} />
              <Route path="metas" element={<MetasPage />} />
              <Route path="patrimonio" element={<PatrimonioPage />} />
              <Route path="investimentos" element={<InvestimentosPage />} />
              <Route path="dividas" element={<DividasPage />} />
              <Route path="desejos" element={<DesejosPage />} />
              <Route path="relatorios" element={<RelatoriosPage />} />
              <Route path="configuracoes" element={<ConfiguracoesPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      )}
    </AnimatePresence>
  )
}
