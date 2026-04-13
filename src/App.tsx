import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InputsPage from './pages/InputsPage';
import PLPage from './pages/PLPage';
import SalesPage from './pages/SalesPage';
import AnalogPage from './pages/AnalogPage';
import PortfolioPage from './pages/PortfolioPage';
import AppShell from './components/layout/AppShell';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  if (!state.isAuthenticated) return <Navigate to="/" replace />;
  return <AppShell>{children}</AppShell>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  if (state.isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/inputs" element={<ProtectedRoute><InputsPage /></ProtectedRoute>} />
      <Route path="/pl" element={<ProtectedRoute><PLPage /></ProtectedRoute>} />
      <Route path="/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
      <Route path="/analog" element={<ProtectedRoute><AnalogPage /></ProtectedRoute>} />
      <Route path="/portfolio" element={<ProtectedRoute><PortfolioPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <TooltipProvider>
          <AppRoutes />
        </TooltipProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
