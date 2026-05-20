import React, { useState, useEffect } from 'react';
import { db, User } from '../lib/mockDb';
import { Plus, Edit } from 'lucide-react';
import { GenderAvatar } from '../components/GenderAvatar';

export default function Staff() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', dni: '', passwordHash: '', role: 'FISIOTERAPEUTA' as any, gender: 'MASCULINO' });

  useEffect(() => {
    setUsers(db.getUsers());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = { ...formData, id: `u-${Date.now()}`, active: true };
    db.saveUser(newUser);
    setUsers(db.getUsers());
    setShowModal(false);
    setFormData({ fullName: '', dni: '', passwordHash: '', role: 'FISIOTERAPEUTA', gender: 'MASCULINO' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Personal Técnico</h1>
          <p className="text-[var(--muted-foreground)]">Gestión de médicos y fisioterapeutas.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-primary-500 text-white px-4 py-2 rounded-xl flex items-center gap-2">
          <Plus size={20} /> Nuevo Profesional
        </button>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-6 py-3 font-medium">Nombre Completo</th>
              <th className="px-6 py-3 font-medium">DNI / Usuario</th>
              <th className="px-6 py-3 font-medium">Rol</th>
              <th className="px-6 py-3 font-medium">Estado</th>
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
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${u.role === 'MEDICO' ? 'bg-primary-100 text-primary-700' : 'bg-secondary-100 text-secondary-700'}`}>{u.role}</span>
                </td>
                <td className="px-6 py-4">
                   <span className="text-secondary-500 bg-secondary-50 px-2 py-1 flex w-fit rounded items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-secondary-500" /> Activo</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--card)] p-6 rounded-2xl w-full max-w-md shadow-xl border border-[var(--border)]">
            <h2 className="text-xl font-bold mb-4">Registrar Personal</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Nombre Completo</label>
                <input required value={formData.fullName} onChange={e=>setFormData({...formData, fullName:e.target.value})} className="w-full px-4 py-2 border rounded-xl bg-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">DNI (Usuario)</label>
                  <input required value={formData.dni} onChange={e=>setFormData({...formData, dni:e.target.value})} className="w-full px-4 py-2 border rounded-xl bg-transparent" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Contraseña</label>
                  <input required type="password" value={formData.passwordHash} onChange={e=>setFormData({...formData, passwordHash:e.target.value})} className="w-full px-4 py-2 border rounded-xl bg-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Rol</label>
                  <select value={formData.role} onChange={e=>setFormData({...formData, role:e.target.value})} className="w-full px-4 py-2 border border-[var(--border)] rounded-xl bg-transparent text-[var(--foreground)] outline-none">
                    <option value="FISIOTERAPEUTA" className="bg-[var(--card)] text-[var(--foreground)]">Fisioterapeuta</option>
                    <option value="MEDICO" className="bg-[var(--card)] text-[var(--foreground)]">Médico</option>
                    <option value="ADMISION" className="bg-[var(--card)] text-[var(--foreground)]">Admisión</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Sexo</label>
                  <select value={formData.gender} onChange={e=>setFormData({...formData, gender:e.target.value})} className="w-full px-4 py-2 border border-[var(--border)] rounded-xl bg-transparent text-[var(--foreground)] outline-none">
                    <option value="MASCULINO" className="bg-[var(--card)]">Masculino</option>
                    <option value="FEMENINO" className="bg-[var(--card)]">Femenino</option>
                    <option value="OTRO" className="bg-[var(--card)]">Otro</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-xl">Cancelar</button>
                <button type="submit" className="bg-primary-500 text-white px-4 py-2 rounded-xl">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
