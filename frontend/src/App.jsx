import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SecurityHealth from './pages/SecurityHealth.jsx';
import TOTPChallenge from './pages/TOTPChallenge.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated, masterKey } = useAuth();
  // Require both token AND master key (master key = vault is unlocked)
  if (!isAuthenticated || !masterKey) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, masterKey } = useAuth();
  if (isAuthenticated && masterKey) return <Navigate to="/dashboard" replace />;
  return children;
}

function TOTPRoute({ children }) {
  const { requiresTOTP } = useAuth();
  if (!requiresTOTP) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/totp-challenge"
        element={
          <TOTPRoute>
            <TOTPChallenge />
          </TOTPRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/security"
        element={
          <ProtectedRoute>
            <SecurityHealth />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
