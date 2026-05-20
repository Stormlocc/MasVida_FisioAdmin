import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const user = await login(dni, password);
      if (user) {
        if (user.role !== 'MEDICO' && user.role !== 'ADMISION') {
          await logout();
          setError('Acceso restringido: Solo el personal médico o administrativo puede ingresar.');
          return;
        }
        navigate('/');
      } else {
        setError('Credenciales inválidas');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration to make it feel more "floating" */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-100 dark:bg-primary-900/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary-100 dark:bg-secondary-900/10 rounded-full blur-3xl opacity-50" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-[var(--card)]/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl shadow-primary-500/10 border border-[var(--border)] relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <Logo className="scale-125 mb-4" />
          <p className="text-[var(--muted-foreground)] mt-2 text-sm font-medium">Software de Gestión Clínica</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-2xl text-sm border border-red-200 dark:border-red-900/50 flex items-start gap-3"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5" />
              {error}
            </motion.div>
          )}
          
          <div>
            <label className="block text-sm font-bold text-[var(--foreground)] mb-2 ml-1">
              Usuario (DNI)
            </label>
            <input
              required
              type="text"
              value={dni}
              onChange={e => setDni(e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl border border-[var(--border)] bg-white dark:bg-[var(--card)] text-[var(--foreground)] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all shadow-sm"
              placeholder="Ingrese su DNI"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--foreground)] mb-2 ml-1">
              Contraseña
            </label>
            <input
              required
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl border border-[var(--border)] bg-white dark:bg-[var(--card)] text-[var(--foreground)] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all shadow-sm"
              placeholder="••••••••"
            />
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary-500/25"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : 'Iniciar Sesión'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 text-[var(--foreground)] font-bold py-4 rounded-2xl transition-all border border-[var(--border)] shadow-sm"
            >
              Regresar al inicio
            </button>
          </div>
        </form>
        
        <div className="mt-8 pt-6 border-t border-[var(--border)] text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--muted)]/50 rounded-full text-[10px] uppercase font-bold tracking-widest text-[var(--muted-foreground)] mb-4">
            Credenciales de Prueba
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs text-[var(--muted-foreground)]">
            <div className="bg-[var(--muted)]/30 rounded-xl p-2 border border-[var(--border)]/50">
              <span className="font-bold text-primary-500 uppercase">Médico:</span> admin / admin
            </div>
            <div className="bg-[var(--muted)]/30 rounded-xl p-2 border border-[var(--border)]/50">
              <span className="font-bold text-secondary-500 uppercase">Admisión:</span> admision / admision
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
