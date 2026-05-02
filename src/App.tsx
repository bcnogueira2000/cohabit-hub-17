import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Inbox, CalendarRange, PartyPopper, Sparkles, Bell, BookOpen, HelpCircle, User } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ResidentShell } from "@/components/layout/ResidentShell";
import { ComingSoon } from "@/components/resident/ComingSoon";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PendingApproval from "./pages/PendingApproval";
import Dashboard from "./pages/Dashboard";
import Requests from "./pages/Requests";
import RequestDetail from "./pages/RequestDetail";
import NewRequest from "./pages/NewRequest";
import PublicRequest from "./pages/PublicRequest";
import Cleaning from "./pages/Cleaning";
import Tasks from "./pages/Tasks";
import Residents from "./pages/Residents";
import ResidentDetail from "./pages/ResidentDetail";
import Rooms from "./pages/Rooms";
import RoomDetail from "./pages/RoomDetail";
import Bookings from "./pages/Bookings";
import Insights from "./pages/Insights";
import Settings from "./pages/Settings";
import MyDay from "./pages/MyDay";
import Stays from "./pages/Stays";
import Approvals from "./pages/Approvals";
import Users from "./pages/Users";
import ResidentHome from "./pages/resident/Home";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/submit" element={<PublicRequest />} />

            {/* Pending approval — accessible to authenticated users without role */}
            <Route path="/app/pending-approval" element={<ProtectedRoute><PendingApproval /></ProtectedRoute>} />

            {/* Resident Portal */}
            <Route element={<ProtectedRoute requireRole={["resident"]}><ResidentShell /></ProtectedRoute>}>
              <Route path="/app" element={<ResidentHome />} />
              <Route path="/app/home" element={<ResidentHome />} />
              <Route path="/app/requests" element={<ComingSoon icon={Inbox} title="Pedidos" description="Acompanha os teus pedidos." />} />
              <Route path="/app/requests/new" element={<ComingSoon icon={Inbox} title="Novo pedido" description="Cria um novo pedido." />} />
              <Route path="/app/requests/:id" element={<ComingSoon icon={Inbox} title="Detalhe do pedido" description="Estado e timeline." />} />
              <Route path="/app/bookings" element={<ComingSoon icon={CalendarRange} title="Reservas" description="As tuas reservas de espaços comuns." />} />
              <Route path="/app/bookings/new" element={<ComingSoon icon={CalendarRange} title="Nova reserva" description="Reservar um espaço." />} />
              <Route path="/app/events" element={<ComingSoon icon={PartyPopper} title="Eventos" description="Eventos da comunidade." />} />
              <Route path="/app/events/:id" element={<ComingSoon icon={PartyPopper} title="Evento" description="Detalhes do evento." />} />
              <Route path="/app/services" element={<ComingSoon icon={Sparkles} title="Serviços" description="Limpezas e extras." />} />
              <Route path="/app/notifications" element={<ComingSoon icon={Bell} title="Notificações" description="Atualizações da equipa." />} />
              <Route path="/app/onboarding" element={<ComingSoon icon={BookOpen} title="Onboarding" description="Como funciona o Living Colours." />} />
              <Route path="/app/faqs" element={<ComingSoon icon={HelpCircle} title="FAQs" description="Perguntas frequentes." />} />
              <Route path="/app/profile" element={<ComingSoon icon={User} title="Perfil" description="Os teus dados." />} />
            </Route>

            {/* Admin / Staff Portal */}
            <Route element={<ProtectedRoute requireRole={["staff", "manager", "admin"]}><AppShell /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/my-day" element={<MyDay />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/requests/new" element={<NewRequest />} />
              <Route path="/requests/:id" element={<RequestDetail />} />
              <Route path="/cleaning" element={<Cleaning />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/residents" element={<Residents />} />
              <Route path="/residents/:id" element={<ResidentDetail />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/rooms/:id" element={<RoomDetail />} />
              <Route path="/stays" element={<Stays />} />
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/users" element={<ProtectedRoute requireRole={["admin"]}><Users /></ProtectedRoute>} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
