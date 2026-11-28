import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Code-splitting: every page is its own chunk, loaded on demand, so the
// first load is not one huge bundle (the old build warned about a chunk
// over 500 kB). All pages are default exports, which is what lazy() needs.
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Bookings = lazy(() => import("./pages/Bookings"));
const Rooms = lazy(() => import("./pages/Rooms"));
const Guests = lazy(() => import("./pages/Guests"));
const Housekeeping = lazy(() => import("./pages/Housekeeping"));
const Staff = lazy(() => import("./pages/Staff"));
const Billing = lazy(() => import("./pages/Billing"));
const Automations = lazy(() => import("./pages/Automations"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Messages = lazy(() => import("./pages/Messages"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Logs = lazy(() => import("./pages/Logs"));
const Settings = lazy(() => import("./pages/Settings"));
const MyTasks = lazy(() => import("./pages/MyTasks"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">Loading Hotel Autopilot ONE…</p>
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Separate admin dashboard (super_admin only) */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

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
              <Route path="/housekeeping" element={
                <ProtectedRoute allowedRoles={['owner', 'manager', 'super_admin', 'housekeeping']}>
                  <Housekeeping />
                </ProtectedRoute>
              } />
              {/* Staff-only task view, like housekeeping's */}
              <Route path="/my-tasks" element={
                <ProtectedRoute allowedRoles={['staff']}>
                  <MyTasks />
                </ProtectedRoute>
              } />
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
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
