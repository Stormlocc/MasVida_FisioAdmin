import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientNew from './pages/PatientNew';
import PatientProfile from './pages/PatientProfile';
import Staff from './pages/Staff';

function RequireMedico({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  if (!currentUser || currentUser.role !== 'MEDICO') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="patients/new" element={<PatientNew />} />
              <Route path="patients/:id" element={<PatientProfile />} />
              <Route path="staff" element={<RequireMedico><Staff /></RequireMedico>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
