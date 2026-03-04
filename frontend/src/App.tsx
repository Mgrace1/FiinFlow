import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import CompanySetup from './pages/CompanySetup';
import UserSetup from './pages/UserSetup';
import SetPassword from './pages/SetPassword';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Expenses from './pages/Expenses';
import ExpenseDetail from './pages/ExpenseDetail';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import TeamMembers from './pages/TeamMembers';
import SearchPage from './pages/Search';
import Starfield from './components/common/Starfield';
import Landing from './pages/Landing';
import FeatureDetail from './pages/FeatureDetail';
import NotFound from './pages/NotFound';
import ResearchConsent from './pages/ResearchConsent';
import { ToastContainer } from 'react-toastify';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // You can render a loading spinner here if you want
    return null; 
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/setup/company" element={<CompanySetup />} />
      <Route path="/setup/user" element={<UserSetup />} />
      <Route path="/consent" element={<ResearchConsent />} />
      <Route path="/features/:slug" element={<FeatureDetail />} />

      {/* Publicly accessible invoice detail */}
      <Route path="/invoices/:invoiceId" element={<InvoiceDetail />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:clientId" element={<ClientDetail />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="expenses/:expenseId" element={<ExpenseDetail />} />
        <Route path="reports" element={<Reports />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="branding" element={<Navigate to="/settings" replace />} />
        <Route path="team" element={<TeamMembers />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function RouteAwareStarfield() {
  const location = useLocation();
  const authPaths = new Set([
    '/login',
    '/setup/company',
    '/setup/user',
    '/forgot-password',
    '/reset-password',
    '/set-password',
  ]);

  return authPaths.has(location.pathname) ? <Starfield /> : null;
}

function App() {
  return (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
      <RouteAwareStarfield />
      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
      />
    </AuthProvider>
  </BrowserRouter>
  );
}

export default App;
