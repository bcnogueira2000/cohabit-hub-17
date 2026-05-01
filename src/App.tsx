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
import Cleaning from "./pages/Cleaning";
import Tasks from "./pages/Tasks";
import Residents from "./pages/Residents";
import ResidentDetail from "./pages/ResidentDetail";
import Rooms from "./pages/Rooms";
import RoomDetail from "./pages/RoomDetail";
import Bookings from "./pages/Bookings";
import Insights from "./pages/Insights";
import Settings from "./pages/Settings";
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
            <Route path="/cleaning" element={<Cleaning />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/residents" element={<Residents />} />
            <Route path="/residents/:id" element={<ResidentDetail />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/rooms/:id" element={<RoomDetail />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
