import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/AuthContext";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import Ofertas from "@/pages/Ofertas";
import CreacionOfertas from "@/pages/CreacionOfertas";
import Flota from "@/pages/Flota";
import VehiculosAsignados from "@/pages/VehiculosAsignados";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>Cargando...</div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/" element={loading ? null : (user ? <Navigate to="/dashboard" replace /> : <LoginPage />)} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/ofertas" element={<ProtectedRoute><Ofertas /></ProtectedRoute>} />
      <Route path="/ofertas/:id/vehiculos-asignados" element={<ProtectedRoute><VehiculosAsignados /></ProtectedRoute>} />
      <Route path="/creacion-ofertas" element={<ProtectedRoute><CreacionOfertas /></ProtectedRoute>} />
      <Route path="/flota" element={<ProtectedRoute><Flota /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
