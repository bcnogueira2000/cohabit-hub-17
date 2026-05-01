import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import Requests from "./pages/Requests";
import RequestDetail from "./pages/RequestDetail";
import NewRequest from "./pages/NewRequest";
import PublicRequest from "./pages/PublicRequest";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/submit" element={<PublicRequest />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/requests/new" element={<NewRequest />} />
            <Route path="/requests/:id" element={<RequestDetail />} />
            <Route path="/cleaning" element={<Placeholder title="Cleaning" description="Planeamento de limpezas e checklists" />} />
            <Route path="/tasks" element={<Placeholder title="Tasks" description="Tarefas operacionais atribuídas à equipa" />} />
            <Route path="/residents" element={<Placeholder title="Residents" description="Base de dados de residentes" />} />
            <Route path="/rooms" element={<Placeholder title="Rooms" description="Quartos, tipologias e estado" />} />
            <Route path="/bookings" element={<Placeholder title="Bookings" description="Reservas de salas e espaços" />} />
            <Route path="/insights" element={<Placeholder title="Insights" description="Métricas operacionais" />} />
            <Route path="/settings" element={<Placeholder title="Settings" description="Configurações da operação" />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
