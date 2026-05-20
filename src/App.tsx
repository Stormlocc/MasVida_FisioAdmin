import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientNew from './pages/PatientNew';
import PatientProfile from './pages/PatientProfile';
import Staff from './pages/Staff';

function ProtectedRoute({ children, role }: { children: React.ReactNode, role?: string }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (role && currentUser.role !== role) return <Navigate to="/" replace />;
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
              <Route path="patients/new" element={<ProtectedRoute role="MEDICO"><PatientNew /></ProtectedRoute>} />
              <Route path="patients/:id" element={<PatientProfile />} />
              <Route path="staff" element={<ProtectedRoute role="MEDICO"><Staff /></ProtectedRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
