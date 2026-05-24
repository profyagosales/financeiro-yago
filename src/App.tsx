import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthFlow } from '@/screens/AuthFlow'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/modules/dashboard/DashboardPage'
import { Page as TransacoesPage } from '@/modules/transacoes'
import { Page as CartoesPage } from '@/modules/cartoes'
import { Page as MaisPage } from '@/modules/mais'
import { Page as ContasPage } from '@/modules/contas'
import { Page as ContasFixasPage } from '@/modules/contas-fixas'
import { Page as MetasPage } from '@/modules/metas'
import { Page as InvestimentosPage } from '@/modules/investimentos'
import { Page as DividasPage } from '@/modules/dividas'
import { Page as DesejosPage } from '@/modules/desejos'
import { Page as RelatoriosPage } from '@/modules/relatorios'
import { Page as ConfiguracoesPage } from '@/modules/configuracoes'
import { seedCategories, deduplicateCategories } from '@/db/schema'

export default function App() {
  useEffect(() => {
    seedCategories().then(deduplicateCategories)
  }, [])

  return (
    <AuthFlow>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="transacoes" element={<TransacoesPage />} />
            <Route path="cartoes" element={<CartoesPage />} />
            <Route path="mais" element={<MaisPage />} />
            <Route path="contas" element={<ContasPage />} />
            <Route path="contas-fixas" element={<ContasFixasPage />} />
            <Route path="metas" element={<MetasPage />} />
            <Route path="investimentos" element={<InvestimentosPage />} />
            <Route path="dividas" element={<DividasPage />} />
            <Route path="desejos" element={<DesejosPage />} />
            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthFlow>
  )
}
