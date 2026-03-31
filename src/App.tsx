import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AnalistaDashboard from './pages/Analista/Dashboard';
import PatientDetails from './pages/Analista/PatientDetails';
import CoordenacaoDashboard from './pages/Coordenacao/Dashboard';
import SupervisorDashboard from './pages/Supervisor/Dashboard';

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: string }) => {
  const { user, userData, loading } = useAuth();

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Carregando...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (role && userData?.role !== role) {
    if (userData?.role === 'coordenacao') return <Navigate to="/coordenacao" />;
    if (userData?.role === 'supervisor') return <Navigate to="/supervisor" />;
    return <Navigate to="/analista" />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route 
            path="/analista" 
            element={
              <ProtectedRoute role="analista">
                <AnalistaDashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/paciente/:id" 
            element={
              <ProtectedRoute>
                <PatientDetails />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/coordenacao" 
            element={
              <ProtectedRoute role="coordenacao">
                <CoordenacaoDashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/supervisor" 
            element={
              <ProtectedRoute role="supervisor">
                <SupervisorDashboard />
              </ProtectedRoute>
            } 
          />

          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
