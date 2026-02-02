import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Bookings from "./pages/Bookings";
import Rooms from "./pages/Rooms";
import Guests from "./pages/Guests";
import Housekeeping from "./pages/Housekeeping";
import Staff from "./pages/Staff";
import Billing from "./pages/Billing";
import Automations from "./pages/Automations";
import Expenses from "./pages/Expenses";
import Messages from "./pages/Messages";
import Alerts from "./pages/Alerts";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected routes */}
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/bookings" element={
                <ProtectedRoute allowedRoles={['owner', 'manager', 'super_admin']}>
                  <Bookings />
                </ProtectedRoute>
              } />
              <Route path="/rooms" element={
                <ProtectedRoute allowedRoles={['owner', 'manager', 'super_admin']}>
                  <Rooms />
                </ProtectedRoute>
              } />
              <Route path="/guests" element={
                <ProtectedRoute allowedRoles={['owner', 'manager', 'super_admin']}>
                  <Guests />
                </ProtectedRoute>
              } />
              <Route path="/housekeeping" element={<ProtectedRoute><Housekeeping /></ProtectedRoute>} />
              <Route path="/staff" element={
                <ProtectedRoute allowedRoles={['owner', 'manager', 'super_admin']}>
                  <Staff />
                </ProtectedRoute>
              } />

              <Route path="/expenses" element={
                <ProtectedRoute allowedRoles={['owner', 'super_admin']}>
                  <Expenses />
                </ProtectedRoute>
              } />

              <Route path="/billing" element={
                <ProtectedRoute allowedRoles={['owner', 'manager', 'super_admin']}>
                  <Billing />
                </ProtectedRoute>
              } />

              <Route path="/automations" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <Automations />
                </ProtectedRoute>
              } />

              <Route path="/messages" element={
                <ProtectedRoute allowedRoles={['owner', 'manager', 'super_admin']}>
                  <Messages />
                </ProtectedRoute>
              } />
              <Route path="/alerts" element={
                <ProtectedRoute allowedRoles={['owner', 'manager', 'super_admin']}>
                  <Alerts />
                </ProtectedRoute>
              } />

              <Route path="/logs" element={
                <ProtectedRoute allowedRoles={['owner', 'manager', 'super_admin']}>
                  <Logs />
                </ProtectedRoute>
              } />

              <Route path="/settings" element={
                <ProtectedRoute allowedRoles={['owner', 'manager', 'super_admin']}>
                  <Settings />
                </ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
