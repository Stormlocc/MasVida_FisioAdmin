import React, { useState, useEffect } from 'react';
import { apiService } from '../lib/api';
import { Patient, ClinicalHistory } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { Search, AlertTriangle, ArrowRight, Activity, Plus, CheckCircle2, BellRing } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { GenderAvatar } from '../components/GenderAvatar';

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<{patient: Patient, history: ClinicalHistory, remaining: number}[]>([]);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const allP = await apiService.getPatients();
        setPatients(allP);

        // Calculate alerts for patients nearing end of treatment
        const alertList: {patient: Patient, history: ClinicalHistory, remaining: number}[] = [];
        for (const p of allP) {
          if (p.status !== 'SUSPENDIDO' && p.status !== 'FINALIZADO') {
            const history = await apiService.getCurrentHistory(p.id);
            if (history) {
              const sessions = await apiService.getSessionsByHistoryId(history.id);
              const remaining = history.prescribedSessions - sessions.length;
              if (remaining >= 0 && remaining <= 2) {
                alertList.push({ patient: p, history, remaining });
              }
            }
          }
        }
        setAlerts(alertList);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };
    loadData();
  }, []);

  const filteredPatients = patients.filter(p => 
    p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.dni.includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Panel Principal</h1>
        {(currentUser?.role === 'MEDICO' || currentUser?.role === 'ADMISION') && (
          <button 
            onClick={() => navigate('/patients/new')}
            className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus size={20} />
            Nuevo Paciente
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Buscador */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Search className="text-primary-500" />
              <h2 className="text-xl font-semibold">Buscar Paciente</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={20} />
              <input
                type="text"
                placeholder="Buscar por DNI o Nombre..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border)] bg-transparent text-[var(--foreground)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
            </div>
            
            {searchTerm && (
              <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-4 max-h-[300px] overflow-y-auto">
                {filteredPatients.length === 0 ? (
                  <p className="text-[var(--muted-foreground)] text-sm text-center py-4">No se encontraron resultados.</p>
                ) : (
                  filteredPatients.map(p => (
                     <button
                        key={p.id}
                        onClick={() => navigate(`/patients/${p.id}`)}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--muted)]/50 transition-colors text-left"
                      >
                        <div>
                          <p className="font-medium text-[var(--foreground)]">{p.firstName} {p.lastName}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">DNI: {p.dni}</p>
                        </div>
                        <ArrowRight size={16} className="text-[var(--muted-foreground)]" />
                      </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Agregados Recientemente */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="text-primary-500" />
              <h2 className="text-xl font-semibold">Agregados Recientemente</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...patients].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4).map(p => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className="bg-transparent border border-[var(--border)] rounded-2xl p-4 hover:border-primary-300 hover:bg-[var(--muted)]/30 transition-colors cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <GenderAvatar gender={p.gender} className="w-10 h-10" />
                      <span className={`text-[10px] px-2 py-1 rounded-md font-medium border uppercase ${p.status === 'ACTIVO' ? 'bg-secondary-50 text-secondary-600 border-secondary-200 dark:bg-secondary-500/10 dark:border-secondary-500/20' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>
                        {p.status}
                      </span>
                    </div>
                    <h3 className="font-semibold text-[var(--foreground)] group-hover:text-primary-500 transition-colors">
                      {p.firstName} {p.lastName}
                    </h3>
                    <p className="text-sm text-[var(--muted-foreground)] mt-0.5">DNI: {p.dni}</p>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                    <span>{format(new Date(p.createdAt), 'dd MMM yyyy')}</span>
                    <ArrowRight size={16} className="text-[var(--muted-foreground)] group-hover:text-primary-500" />
                  </div>
                </motion.div>
              ))}
              {patients.length === 0 && (
                <div className="col-span-full text-center py-6 text-[var(--muted-foreground)] text-sm">
                  Aún no hay pacientes registrados.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="lg:col-span-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col h-fit">
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[var(--border)]">
            <div className="relative">
              <motion.div 
                animate={{ 
                  rotate: [0, -10, 10, -10, 10, 0],
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  repeatDelay: 3 
                }}
                className="w-12 h-12 rounded-2xl bg-transparent text-orange-500 flex items-center justify-center"
              >
                <BellRing size={24} />
              </motion.div>
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[var(--card)] shadow-sm">
                  {alerts.length}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Alertas Activas</h2>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">Seguimiento de sesiones</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {alerts.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center py-10"
              >
                <div className="w-16 h-16 rounded-full bg-secondary-50 dark:bg-secondary-900/20 text-secondary-500 flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <p className="text-base font-bold text-[var(--foreground)]">Todo al día</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1 max-w-[200px]">No hay pacientes próximos a finalizar tratamiento.</p>
              </motion.div>
            ) : (
              alerts.map((a, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.05, duration: 0.3, ease: "easeOut" }}
                  key={i} 
                  className={`p-4 bg-[var(--card)] border rounded-2xl relative overflow-hidden flex flex-col gap-3 shadow-sm ${
                    a.remaining === 0 
                    ? 'border-red-200 dark:border-red-900/50 hover:border-red-300 dark:hover:border-red-800/80 shadow-red-100/50 dark:shadow-none' 
                    : 'border-amber-200 dark:border-amber-900/50 hover:border-amber-300 dark:hover:border-amber-800/80 shadow-amber-100/50 dark:shadow-none'
                  } transition-all duration-300`}
                >
                  <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${a.remaining === 0 ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                  <div className="pl-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-[var(--foreground)] text-sm line-clamp-1">{a.patient.firstName} {a.patient.lastName}</p>
                      <p className="text-xs font-medium text-[var(--muted-foreground)] mt-0.5 line-clamp-1" title={a.history.cie10Description}>{a.history.cie10Description}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-rose-900 dark:text-rose-400">
                      {a.remaining === 0 ? '¡Termina Hoy!' : `${a.remaining} extra`}
                    </span>
                  </div>
                  <div className="pl-2 mt-1">
                    <button 
                      onClick={() => navigate(`/patients/${a.patient.id}`)}
                      className="bg-transparent hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-900 dark:text-rose-400 border border-rose-200 dark:border-rose-800/30 text-xs font-bold w-full rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Ver Expediente</span>
                      <ArrowRight size={14} className="opacity-80" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
