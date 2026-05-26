import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Patient } from '../lib/types';
import { apiService } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PatientNew() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState<Partial<Patient>>({
    firstName: '',
    lastName: '',
    dni: '',
    phone: '',
    email: '',
    address: '',
    birthDate: '',
    gender: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  React.useEffect(() => {
    if (currentUser && currentUser.role !== 'MEDICO' && currentUser.role !== 'ADMISION') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    try {
      // Validate DNI uniqueness
      const existingPatients = await apiService.getPatients();
      if (existingPatients.some(p => p.dni === formData.dni)) {
        setErrorMsg('¡Un paciente con este DNI ya está registrado!');
        return;
      }

      const newPatient: Patient = {
        ...(formData as any),
        id: `p-${Date.now()}`,
        status: 'ACTIVO',
        createdAt: Date.now(),
      };
      await apiService.savePatient(newPatient);
      
      setShowSuccess(true);
      setTimeout(() => {
        navigate(`/patients/${newPatient.id}`);
      }, 2000);
    } catch (error) {
      setErrorMsg('Error al registrar el paciente. Por favor intente de nuevo.');
      console.error('Error saving patient:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-[var(--card)] border border-[var(--border)] rounded-full hover:bg-[var(--muted)] transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Registrar Nuevo Paciente</h1>
          <p className="text-[var(--muted-foreground)]">Complete los datos demográficos iniciales.</p>
        </div>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 relative">
        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={20} />
              <p className="text-sm font-medium text-red-800 dark:text-red-300">{errorMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nombres</label>
              <input required type="text" value={formData.firstName} onChange={e=>setFormData({...formData, firstName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-transparent focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Apellidos</label>
              <input required type="text" value={formData.lastName} onChange={e=>setFormData({...formData, lastName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-transparent focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">DNI</label>
              <input required type="text" value={formData.dni} onChange={e=>setFormData({...formData, dni: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-transparent focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Teléfono</label>
              <input required type="text" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-transparent focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Correo Electrónico (Opcional)</label>
              <input type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-transparent focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Fecha de Nacimiento</label>
              <input required type="date" value={formData.birthDate || ''} onChange={e=>setFormData({...formData, birthDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-transparent focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Sexo</label>
              <select required value={formData.gender || ''} onChange={e=>setFormData({...formData, gender: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-transparent focus:ring-2 focus:ring-primary-500 outline-none">
                <option value="" disabled>Seleccione...</option>
                <option value="MASCULINO">Masculino</option>
                <option value="FEMENINO">Femenino</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Dirección</label>
            <input required type="text" placeholder="Departamento, Provincia, Distrito" value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-transparent focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-6 rounded-xl flex items-center gap-2">
              <Save size={18} />
              Guardar y Continuar a Historia Clínica
            </button>
          </div>
        </form>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="bg-[var(--card)] p-8 rounded-3xl w-full max-w-sm shadow-2xl border border-[var(--border)] text-center flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-secondary-100 dark:bg-secondary-900/30 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={40} className="text-secondary-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">¡Registro Exitoso!</h2>
              <p className="text-[var(--muted-foreground)]">Redirigiendo al perfil del paciente...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
