import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { MobilidadeProvider } from "@/contexts/MobilidadeContext";
import { DetailPanelProvider } from "@/contexts/DetailPanelContext";
import { ExecucoesProvider } from "@/contexts/ExecucoesContext";
import { AlocacoesAtividadeProvider } from "@/contexts/AlocacoesAtividadeContext";
import { AppLayout } from "@/components/AppLayout";
import HomePage from "@/pages/HomePage";
import ContratosPage from "@/pages/ContratosPage";
import ContratoDetailPage from "@/pages/ContratoDetailPage";
import ParametrizacaoPage from "@/pages/ParametrizacaoPage";
import EntregasPage from "@/pages/EntregasPage";
import CargosPage from "@/pages/CargosPage";
import RecursosPage from "@/pages/RecursosPage";

import ExecucaoPage from "@/pages/ExecucaoPage";
import IndisponibilidadesPage from "@/pages/IndisponibilidadesPage";
import AtividadeDetailPage from "@/pages/AtividadeDetailPage";
import MobilidadePage from "@/pages/MobilidadePage";
import TerceirosPage from "@/pages/TerceirosPage";
import ComentariosPage from "@/pages/ComentariosPage";
import RelatoriosPage from "@/pages/RelatoriosPage";
import DashboardPage from "@/pages/DashboardPage";
import AdminPage from "@/pages/AdminPage";
import IndisponibilidadesCorporativasPage from "@/pages/IndisponibilidadesCorporativasPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ProfileProvider>
        <MobilidadeProvider>
        <ExecucoesProvider>
        <AlocacoesAtividadeProvider>
        <DetailPanelProvider>
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/contratos" element={<ContratosPage />} />
                <Route path="/contratos/:id" element={<ContratoDetailPage />} />
                <Route path="/parametrizacao" element={<ParametrizacaoPage />} />
                <Route path="/entregas" element={<EntregasPage />} />
                <Route path="/cargos" element={<CargosPage />} />
                <Route path="/recursos" element={<RecursosPage />} />
                <Route path="/alocacao" element={<ContratosPage />} />
                <Route path="/execucao" element={<ExecucaoPage />} />
                <Route path="/execucao/:id" element={<AtividadeDetailPage />} />
                <Route path="/indisponibilidades" element={<IndisponibilidadesPage />} />
                <Route path="/indisponibilidades-corporativas" element={<IndisponibilidadesCorporativasPage />} />
                <Route path="/mobilidade" element={<MobilidadePage />} />
                <Route path="/terceiros" element={<TerceirosPage />} />
                <Route path="/comentarios" element={<ComentariosPage />} />
                <Route path="/relatorios" element={<RelatoriosPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </DetailPanelProvider>
        </AlocacoesAtividadeProvider>
        </ExecucoesProvider>
        </MobilidadeProvider>
      </ProfileProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
