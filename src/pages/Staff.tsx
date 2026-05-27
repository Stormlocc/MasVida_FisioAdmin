import React, { useState, useEffect } from 'react';
import { usersAPI } from '../lib/api';
import { Plus, Edit, CheckCircle, X, AlertCircle, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { GenderAvatar } from '../components/GenderAvatar';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

const PAGE_SIZE = 10;
const ROLES = [
  { value: '', label: 'Todos' },
  { value: 'MEDICO', label: 'Médico' },
  { value: 'FISIOTERAPEUTA', label: 'Fisioterapeuta' },
  { value: 'ADMISION', label: 'Admisión' },
];

export default function Staff() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', dni: '', password: '', role: 'FISIOTERAPEUTA', gender: 'MASCULINO' });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successAlert, setSuccessAlert] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { currentUser } = useAuth();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchUsers = async (p: number, role: string) => {
    setLoading(true);
    const result = await usersAPI.list(p, PAGE_SIZE, undefined, role || undefined);
    if (result.data) {
      setUsers(result.data.items);
      setTotal(result.data.total);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(1, ''); }, []);

  const applyFilter = (role: string) => {
    setRoleFilter(role);
    setPage(1);
    fetchUsers(1, role);
  };

  const goToPage = (p: number) => {
    setPage(p);
    fetchUsers(p, roleFilter);
  };

  useEffect(() => {
    if (successAlert) {
      const timer = setTimeout(() => setSuccessAlert(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successAlert]);

  const toTitleCase = (str: string) =>
    str.replace(/\b\w[\w]*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== 'MEDICO') {
      setError('Solo un usuario con rol Médico tiene autorización para esta acción.');
      return;
    }
    setSaving(true);
    setError('');

    if (editingUserId) {
      const updateData: any = { fullName: formData.fullName, gender: formData.gender };
      if (formData.password) updateData.password = formData.password;
      const result = await usersAPI.update(editingUserId, updateData);
      setSaving(false);
      if (result.error) { setError(result.error); return; }
      setSuccessAlert(`Cambios guardados para ${formData.fullName}`);
    } else {
      const result = await usersAPI.create({
        fullName: formData.fullName, dni: formData.dni,
        password: formData.password, role: formData.role, gender: formData.gender,
      });
      setSaving(false);
      if (result.error) {
        setError(
          result.error.includes('409') || result.error.toLowerCase().includes('dni')
            ? 'Ya existe un miembro del personal registrado con el mismo DNI.'
            : result.error,
        );
        return;
      }
      setSuccessAlert(`${formData.fullName} registrado con éxito`);
    }

    await fetchUsers(page, roleFilter);
    setShowModal(false);
    setEditingUserId(null);
    setFormData({ fullName: '', dni: '', password: '', role: 'FISIOTERAPEUTA', gender: 'MASCULINO' });
  };

  const openEdit = (u: any) => {
    setEditingUserId(u.id);
    setFormData({ fullName: u.fullName, dni: u.dni, password: '', role: u.role, gender: u.gender || 'MASCULINO' });
    setError('');
    setShowModal(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Personal Técnico</h1>
          <p className="text-[var(--muted-foreground)]">Gestión de médicos, fisioterapeutas y admisión.</p>
        </div>
        {currentUser?.role === 'MEDICO' && (
          <button
            onClick={() => {
              setEditingUserId(null);
              setFormData({ fullName: '', dni: '', password: '', role: 'FISIOTERAPEUTA', gender: 'MASCULINO' });
              setError('');
              setShowModal(true);
            }}
            className="bg-primary-500 text-white px-4 py-2 border border-primary-600/20 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-primary-600 transition-colors shadow-sm font-bold text-sm shrink-0"
          >
            <Plus size={18} /> Nuevo Profesional
          </button>
        )}
      </div>

      {/* Filtros por rol */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={16} className="text-[var(--muted-foreground)]" />
        {ROLES.map(r => (
          <button
            key={r.value}
            onClick={() => applyFilter(r.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              roleFilter === r.value
                ? 'bg-primary-500 text-white border-primary-500'
                : 'bg-transparent border-[var(--border)] text-[var(--muted-foreground)] hover:border-primary-300 hover:text-[var(--foreground)]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Alerta de éxito */}
      <AnimatePresence>
        {successAlert && (
          <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }}
            className="bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/10 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-4 py-3.5 rounded-xl flex items-center justify-between text-xs sm:text-sm font-semibold shadow-inner overflow-hidden">
            <div className="flex items-center gap-2.5">
              <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successAlert}</span>
            </div>
            <button onClick={() => setSuccessAlert(null)} className="text-emerald-500/60 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-1 rounded-lg hover:bg-emerald-500/5 cursor-pointer ml-3">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabla */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-6 py-3 font-medium">Nombre Completo</th>
              <th className="px-6 py-3 font-medium">DNI / Usuario</th>
              <th className="px-6 py-3 font-medium">Rol</th>
              {currentUser?.role === 'MEDICO' && (
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-[var(--muted-foreground)] text-sm">Cargando...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-[var(--muted-foreground)] text-sm">{roleFilter ? 'No hay personal con este rol.' : 'No hay personal registrado.'}</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id} onClick={() => { if (currentUser?.role === 'MEDICO') openEdit(u); }} className={`hover:bg-[var(--muted)]/50 transition-colors ${currentUser?.role === 'MEDICO' ? 'cursor-pointer' : ''}`}>
                  <td className="px-6 py-4 font-medium">
                    <div className="flex items-center gap-3">
                      <GenderAvatar gender={u.gender} className="w-8 h-8" />
                      {u.fullName}
                    </div>
                  </td>
                  <td className="px-6 py-4">{u.dni}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      u.role === 'MEDICO'
                        ? 'bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-350 border border-primary-200/50 dark:border-primary-900/40'
                        : u.role === 'ADMISION'
                        ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-350 border border-amber-200/50 dark:border-amber-900/40'
                        : 'bg-secondary-100 dark:bg-secondary-950/40 text-secondary-700 dark:text-secondary-350 border border-secondary-200/50 dark:border-secondary-900/40'
                    }`}>{u.role}</span>
                  </td>
                  {currentUser?.role === 'MEDICO' && (
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(u); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary-500/20 bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold hover:bg-primary-600 hover:text-white transition-all text-xs cursor-pointer shadow-sm"
                      >
                        <Edit size={12} /> Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--border)] bg-[var(--muted)]/30">
            <p className="text-xs text-[var(--muted-foreground)]">
              {total} resultado{total !== 1 ? 's' : ''} · Página {page} de {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => goToPage(page - 1)}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => goToPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${p === page ? 'bg-primary-500 text-white' : 'hover:bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>
                  {p}
                </button>
              ))}
              <button disabled={page >= totalPages} onClick={() => goToPage(page + 1)}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <Modal onClose={() => { setShowModal(false); setEditingUserId(null); setError(''); }} className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 pr-8">
              {editingUserId ? 'Editar Personal Técnico' : 'Registrar Personal'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div role="alert" className="flex items-start gap-2 bg-red-500/10 dark:bg-red-950/20 border border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-semibold leading-relaxed">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />{error}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Nombre Completo</label>
                <input required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: toTitleCase(e.target.value) })} className="w-full px-4 py-2 border border-[var(--border)] rounded-xl bg-transparent text-[var(--foreground)] outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">DNI (Usuario)</label>
                  <input required={!editingUserId} disabled={!!editingUserId} value={formData.dni} onChange={e => setFormData({ ...formData, dni: e.target.value })} className="w-full px-4 py-2 border border-[var(--border)] rounded-xl bg-transparent text-[var(--foreground)] outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">{editingUserId ? 'Nueva Contraseña (opcional)' : 'Contraseña'}</label>
                  <input required={!editingUserId} type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-2 border border-[var(--border)] rounded-xl bg-transparent text-[var(--foreground)] outline-none focus:ring-2 focus:ring-primary-500" />
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-1">Mín. 4 caracteres.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Rol</label>
                  <select disabled={!!editingUserId} value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 border border-[var(--border)] rounded-xl bg-transparent text-[var(--foreground)] outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="FISIOTERAPEUTA">Fisioterapeuta</option>
                    <option value="MEDICO">Médico</option>
                    <option value="ADMISION">Admisión</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Sexo</label>
                  <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full px-4 py-2 border border-[var(--border)] rounded-xl bg-transparent text-[var(--foreground)] outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMENINO">Femenino</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2.5">
                <button type="button" onClick={() => { setShowModal(false); setEditingUserId(null); setError(''); }} className="px-4 py-2 border border-[var(--border)] rounded-xl text-sm font-medium hover:bg-[var(--muted)] transition-colors cursor-pointer">Cancelar</button>
                <button type="submit" disabled={saving} className="bg-primary-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-600 transition-colors cursor-pointer shadow-md shadow-primary-500/10 disabled:opacity-60">
                  {saving ? 'Guardando...' : editingUserId ? 'Guardar Cambios' : 'Guardar'}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
