import React, { useState, useEffect } from 'react';
import { db, User } from '../lib/mockDb';
import { Plus, Edit, CheckCircle, X } from 'lucide-react';
import { GenderAvatar } from '../components/GenderAvatar';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export default function Staff() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', dni: '', passwordHash: '', role: 'FISIOTERAPEUTA' as any, gender: 'MASCULINO' });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successAlert, setSuccessAlert] = useState<string | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    setUsers(db.getUsers());
  }, []);

  useEffect(() => {
    if (successAlert) {
      const timer = setTimeout(() => {
        setSuccessAlert(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successAlert]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Solo el medico puede crear o editar al personal técnico
    if (currentUser?.role !== 'MEDICO') {
      setError('Solo un usuario con rol Médico tiene autorización para editar o registrar personal técnico.');
      return;
    }

    // No puede haber dos personal técnico con el mismo DNI
    const isDniDuplicate = db.getUsers().some(u => 
      u.dni.trim().toLowerCase() === formData.dni.trim().toLowerCase() && 
      u.id !== editingUserId
    );

    if (isDniDuplicate) {
      setError('Ya existe un miembro del personal técnico registrado con el mismo DNI.');
      return;
    }

    let isEdit = false;
    if (editingUserId) {
      const existingUser = db.getUserById(editingUserId);
      if (existingUser) {
        isEdit = true;
        const updatedUser: User = {
          ...existingUser,
          fullName: formData.fullName,
          dni: formData.dni,
          passwordHash: formData.passwordHash,
          role: formData.role,
          gender: formData.gender,
        };
        db.saveUser(updatedUser);
      }
    } else {
      const newUser: User = { 
        ...formData, 
        id: `u-${Date.now()}`, 
        active: true 
      };
      db.saveUser(newUser);
    }

    setSuccessAlert(
      isEdit 
        ? `¡Cambios guardados con éxito para ${formData.fullName}!` 
        : `¡Personal técnico ${formData.fullName} registrado con éxito!`
    );

    setUsers(db.getUsers());
    setShowModal(false);
    setEditingUserId(null);
    setError('');
    setFormData({ fullName: '', dni: '', passwordHash: '', role: 'FISIOTERAPEUTA', gender: 'MASCULINO' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Personal Técnico</h1>
          <p className="text-[var(--muted-foreground)]">Gestión de médicos, fisioterapeutas y personal administrativo.</p>
        </div>
        {currentUser?.role === 'MEDICO' && (
          <button 
            onClick={() => {
              setEditingUserId(null);
              setFormData({ fullName: '', dni: '', passwordHash: '', role: 'FISIOTERAPEUTA', gender: 'MASCULINO' });
              setError('');
              setShowModal(true);
            }} 
            className="bg-primary-500 text-white px-4 py-2 border border-primary-600/20 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-primary-600 transition-colors shadow-sm font-bold text-sm"
          >
            <Plus size={18} /> Nuevo Profesional
          </button>
        )}
      </div>

      <AnimatePresence>
        {successAlert && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/10 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-4 py-3.5 rounded-xl flex items-center justify-between text-xs sm:text-sm font-semibold shadow-inner overflow-hidden"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successAlert}</span>
            </div>
            <button
              onClick={() => setSuccessAlert(null)}
              className="text-emerald-500/60 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-1 rounded-lg hover:bg-emerald-500/5 cursor-pointer ml-3"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-6 py-3 font-medium">Nombre Completo</th>
              <th className="px-6 py-3 font-medium">DNI / Usuario</th>
              <th className="px-6 py-3 font-medium">Rol</th>
              <th className="px-6 py-3 font-medium">Estado</th>
              {currentUser?.role === 'MEDICO' && (
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-[var(--muted)]/50 transition-colors">
                <td className="px-6 py-4 font-medium flex items-center gap-3">
                  <GenderAvatar gender={u.gender} className="w-8 h-8" />
                  {u.fullName}
                </td>
                <td className="px-6 py-4">{u.dni}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${u.role === 'MEDICO' ? 'bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-350 border border-primary-200/50 dark:border-primary-900/40' : 'bg-secondary-100 dark:bg-secondary-950/40 text-secondary-700 dark:text-secondary-350 border border-secondary-200/50 dark:border-secondary-900/40'}`}>{u.role}</span>
                </td>
                <td className="px-6 py-4">
                   <span className="text-secondary-500 bg-secondary-50 dark:bg-secondary-950/30 px-2 py-1 flex w-fit rounded items-center gap-1 text-xs border border-secondary-200/30 dark:border-secondary-900/20"><div className="w-1.5 h-1.5 rounded-full bg-secondary-500" /> Activo</span>
                </td>
                {currentUser?.role === 'MEDICO' && (
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setEditingUserId(u.id);
                        setFormData({
                          fullName: u.fullName,
                          dni: u.dni,
                          passwordHash: u.passwordHash,
                          role: u.role,
                          gender: u.gender || 'MASCULINO'
                        });
                        setError('');
                        setShowModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary-500/20 bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold hover:bg-primary-600 hover:text-white transition-all text-xs cursor-pointer shadow-sm"
                      title="Editar personal técnico"
                    >
                      <Edit size={12} />
                      <span>Editar</span>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--card)] p-6 rounded-2xl w-full max-w-md shadow-xl border border-[var(--border)] overflow-hidden">
            <h2 className="text-xl font-bold mb-4">
              {editingUserId ? 'Editar Personal Técnico' : 'Registrar Personal'}
            </h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div role="alert" className="bg-red-500/10 dark:bg-red-950/20 border border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-semibold leading-relaxed">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Nombre Completo</label>
                <input required value={formData.fullName} onChange={e=>setFormData({...formData, fullName:e.target.value})} className="w-full px-4 py-2 border border-[var(--border)] rounded-xl bg-transparent text-[var(--foreground)] outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">DNI (Usuario)</label>
                  <input required value={formData.dni} onChange={e=>setFormData({...formData, dni:e.target.value})} className="w-full px-4 py-2 border border-[var(--border)] rounded-xl bg-transparent text-[var(--foreground)] outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Contraseña</label>
                  <input required type="password" value={formData.passwordHash} onChange={e=>setFormData({...formData, passwordHash:e.target.value})} className="w-full px-4 py-2 border border-[var(--border)] rounded-xl bg-transparent text-[var(--foreground)] outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Rol</label>
                  <select value={formData.role} onChange={e=>setFormData({...formData, role:e.target.value})} className="w-full px-4 py-2 border border-[var(--border)] rounded-xl bg-transparent text-[var(--foreground)] outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="FISIOTERAPEUTA" className="bg-[var(--card)] text-[var(--foreground)]">Fisioterapeuta</option>
                    <option value="MEDICO" className="bg-[var(--card)] text-[var(--foreground)]">Médico</option>
                    <option value="ADMISION" className="bg-[var(--card)] text-[var(--foreground)]">Admisión</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Sexo</label>
                  <select value={formData.gender} onChange={e=>setFormData({...formData, gender:e.target.value})} className="w-full px-4 py-2 border border-[var(--border)] rounded-xl bg-transparent text-[var(--foreground)] outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="MASCULINO" className="bg-[var(--card)] text-[var(--foreground)]">Masculino</option>
                    <option value="FEMENINO" className="bg-[var(--card)] text-[var(--foreground)]">Femenino</option>
                    <option value="OTRO" className="bg-[var(--card)] text-[var(--foreground)]">Otro</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2.5">
                <button type="button" onClick={() => { setShowModal(false); setEditingUserId(null); setError(''); }} className="px-4 py-2 border border-[var(--border)] rounded-xl text-sm font-medium hover:bg-[var(--muted)] transition-colors cursor-pointer">Cancelar</button>
                <button type="submit" className="bg-primary-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-600 transition-colors cursor-pointer shadow-md shadow-primary-500/10">
                  {editingUserId ? 'Guardar Cambios' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
