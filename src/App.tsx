import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import AcompanhamentoLista from "./pages/AcompanhamentoLista";
import AcompanhamentoDetalhe from "./pages/AcompanhamentoDetalhe";
import ParametrizacaoServicos from "./pages/ParametrizacaoServicos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<AcompanhamentoLista />} />
            <Route path="/acompanhamento/:id" element={<AcompanhamentoDetalhe />} />
            <Route path="/servicos" element={<ParametrizacaoServicos />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
