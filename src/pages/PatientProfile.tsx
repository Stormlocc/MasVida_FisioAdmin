import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientsAPI, historiesAPI, sessionsAPI, proceduresAPI, usersAPI, catalogAPI, authAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { format, differenceInYears } from 'date-fns';
import {
  ArrowLeft, User as UserIcon, FileText, Activity, Clock,
  Lock, Edit3, CheckCircle2, ShieldAlert, Plus, Check, ShieldCheck,
  Stethoscope, ClipboardList, Minus, Search, Sparkles,
  Phone, Mail, MapPin, CreditCard, Trash2, Syringe,
  Upload, Image as ImageIcon, ZoomIn, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MaleIcon, FemaleIcon } from '../components/GenderAvatar';
import Modal from '../components/Modal';

const calculateAge = (birthDate?: string) => {
  if (!birthDate) return 'Edad no registrada';
  const age = differenceInYears(new Date(), new Date(birthDate));
  return `${age} años`;
};


export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [patient, setPatient] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [allHistories, setAllHistories] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [invasiveProcedures, setInvasiveProcedures] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, any>>(new Map());
  const [pageLoading, setPageLoading] = useState(true);

  // Modals
  const [showInvasiveModal, setShowInvasiveModal] = useState(false);
  const [invasiveFormData, setInvasiveFormData] = useState({ procedureName: '', description: '' });
  const [isInvasiveSubmitting, setIsInvasiveSubmitting] = useState(false);
  const [showDeleteIpModal, setShowDeleteIpModal] = useState(false);
  const [ipToDelete, setIpToDelete] = useState<any>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeleteHistoryModal, setShowDeleteHistoryModal] = useState(false);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState('');
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureTarget, setSignatureTarget] = useState<'SESSION' | 'OVERRIDE'>('SESSION');
  const [pendingSession, setPendingSession] = useState<any>(null);
  const [pendingOverrideToken, setPendingOverrideToken] = useState<string | null>(null);

  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<'DATOS' | 'SESIONES'>('DATOS');
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);

  // History form
  const [historyModalStep, setHistoryModalStep] = useState<1 | 2>(1);
  const [historyFormData, setHistoryFormData] = useState<any>({});
  const [prescribedSessionsCount, setPrescribedSessionsCount] = useState(1);
  const [sessionTechniques, setSessionTechniques] = useState<string[][]>([]);
  const [sessionDescriptions, setSessionDescriptions] = useState<string[]>([]);
  const [sessionDates, setSessionDates] = useState<string[]>([]);
  const [showCie10Options, setShowCie10Options] = useState(false);
  const [cie10Search, setCie10Search] = useState('');
  const [cie10Error, setCie10Error] = useState('');
  const [isCie10Shaking, setIsCie10Shaking] = useState(false);
  const [isCreatingNewHistory, setIsCreatingNewHistory] = useState(false);
  const [isHistoryDragging, setIsHistoryDragging] = useState(false);
  const [cie10Results, setCie10Results] = useState<{ code: string; desc: string }[]>([]);
  const [techniquesOptions, setTechniquesOptions] = useState<string[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isDraggingZoom, setIsDraggingZoom] = useState(false);
  const [dragStartZoom, setDragStartZoom] = useState({ x: 0, y: 0 });
  const [selectedEvolutionTechniques, setSelectedEvolutionTechniques] = useState<string[]>([]);
  const sessionsContainerRef = useRef<HTMLDivElement>(null);

  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [successSignerName, setSuccessSignerName] = useState('');
  const [showDeleteSuccessOverlay, setShowDeleteSuccessOverlay] = useState(false);
  const [showHistorySuccess, setShowHistorySuccess] = useState(false);
  const [hideNextSession, setHideNextSession] = useState(false);
  const [historySaving, setHistorySaving] = useState(false);

  useEffect(() => {
    catalogAPI.techniques().then(r => {
      if (r.data) setTechniquesOptions(r.data);
    });
  }, []);

  useEffect(() => {
    if (id) {
      loadData(id);
      usersAPI.list().then(r => {
        if (r.data) setUsersMap(new Map(r.data.items.map((u: any) => [u.id, u])));
      });
    }
  }, [id]);

  useEffect(() => {
    if (showHistoryModal && historyModalStep === 2 && sessionsContainerRef.current) {
      const container = sessionsContainerRef.current;
      setTimeout(() => container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }), 100);
    }
  }, [prescribedSessionsCount, showHistoryModal, historyModalStep]);

  const loadData = async (patientId: string, keepHistory?: any) => {
    setPageLoading(true);
    const [pResult, hResult, ipResult] = await Promise.all([
      patientsAPI.get(patientId),
      historiesAPI.list(patientId),
      proceduresAPI.list(patientId),
    ]);

    if (pResult.data) setPatient(pResult.data);

    const allH: any[] = hResult.data || [];
    setAllHistories(allH);

    const selectedHist = keepHistory
      ? allH.find(h => h.id === keepHistory.id) || allH[0] || null
      : allH[0] || null;

    setHistory(selectedHist);

    if (selectedHist) {
      const sResult = await sessionsAPI.list(selectedHist.id);
      setSessions(sResult.data || []);
    } else {
      setSessions([]);
    }

    setInvasiveProcedures(ipResult.data || []);
    setPageLoading(false);
  };

  const handleSelectHistory = async (h: any) => {
    setHistory(h);
    const result = await sessionsAPI.list(h.id);
    setSessions(result.data || []);
  };

  const handleCreateInvasiveProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !currentUser) return;
    setIsInvasiveSubmitting(true);
    const result = await proceduresAPI.create(patient.id, {
      procedureName: invasiveFormData.procedureName,
      description: invasiveFormData.description,
      historyId: history?.id || null,
    });
    setIsInvasiveSubmitting(false);
    if (result.error) {
      setAuthError(result.error);
      return;
    }
    setInvasiveFormData({ procedureName: '', description: '' });
    setShowInvasiveModal(false);
    setShowHistorySuccess(true);
    setTimeout(() => setShowHistorySuccess(false), 3000);
    loadData(patient.id, history);
  };

  const openHistoryModal = () => {
    setIsCreatingNewHistory(false);
    const currentSessions = history?.prescribedSessions || 10;
    setHistoryModalStep(1);
    setHistoryFormData({
      cie10Code: history?.cie10Code || '',
      cie10Description: history?.cie10Description || '',
      anamnesis: history?.anamnesis || '',
      antecedentes: history?.antecedentes || '',
      physicalExam: history?.physicalExam || '',
      imageUrl: history?.imageUrl || ''
    });
    setPrescribedSessionsCount(currentSessions);
    if (history?.prescribedTechniques?.length === history?.prescribedSessions) {
      setSessionTechniques(history.prescribedTechniques.map((t: any) => Array.isArray(t) ? [...t] : [t]));
      setSessionDescriptions(history.prescribedDescriptions ? [...history.prescribedDescriptions] : Array(currentSessions).fill(''));
      setSessionDates(history.prescribedDates ? [...history.prescribedDates] : Array(currentSessions).fill(''));
    } else {
      setSessionTechniques(Array.from({ length: currentSessions }, () => []));
      setSessionDescriptions(Array(currentSessions).fill(''));
      setSessionDates(Array(currentSessions).fill(''));
    }
    historiesAPI.searchCie10('').then(r => {
      if (r.data?.results?.length) {
        setCie10Results(r.data.results.map(it => ({ code: it.code, desc: it.description })));
      }
    });
    setShowHistoryModal(true);
  };

  const openNewHistoryModal = () => {
    setIsCreatingNewHistory(true);
    setHistoryModalStep(1);
    setHistoryFormData({ cie10Code: '', cie10Description: '', anamnesis: '', antecedentes: '', physicalExam: '', imageUrl: '' });
    setPrescribedSessionsCount(1);
    setSessionTechniques([[]]);
    setSessionDescriptions(['']);
    setSessionDates(['']);
    historiesAPI.searchCie10('').then(r => {
      if (r.data?.results?.length) {
        setCie10Results(r.data.results.map(it => ({ code: it.code, desc: it.description })));
      }
    });
    setShowHistoryModal(true);
  };

  const remainingSessions = history
    ? Number(history.prescribedSessions) - sessions.length
    : 0;

  const handleSessionsChange = (val: number) => {
    if (val < 1 || val > 60) return;
    setPrescribedSessionsCount(val);
    setSessionTechniques(prev => { const n = [...prev]; while (n.length < val) n.push([]); return n.slice(0, val); });
    setSessionDescriptions(prev => { const n = [...prev]; while (n.length < val) n.push(''); return n.slice(0, val); });
    setSessionDates(prev => { const n = [...prev]; while (n.length < val) n.push(''); return n.slice(0, val); });
  };

  const removeSession = (index: number) => {
    if (prescribedSessionsCount <= 1) return;
    setPrescribedSessionsCount((p: number) => p - 1);
    setSessionTechniques((p: string[][]) => p.filter((_: string[], i: number) => i !== index));
    setSessionDescriptions((p: string[]) => p.filter((_: string, i: number) => i !== index));
    setSessionDates((p: string[]) => p.filter((_: string, i: number) => i !== index));
  };

  const handleNextStepHistory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!historyFormData.cie10Code) {
      setCie10Error('Seleccione un diagnóstico válido de las sugerencias');
      setIsCie10Shaking(true);
      setTimeout(() => setIsCie10Shaking(false), 500);
      return;
    }
    setCie10Error('');
    setHistoryModalStep(2);
  };

  const handleSaveHistory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (prescribedSessionsCount < 1 || !patient) return;
    setHistorySaving(true);

    const payload = {
      anamnesis: historyFormData.anamnesis,
      antecedentes: historyFormData.antecedentes,
      physicalExam: historyFormData.physicalExam,
      cie10Code: historyFormData.cie10Code,
      cie10Description: historyFormData.cie10Description,
      prescribedSessions: prescribedSessionsCount,
      prescribedTechniques: sessionTechniques,
      prescribedDescriptions: sessionDescriptions,
      prescribedDates: sessionDates,
      imageUrl: historyFormData.imageUrl || null,
    };

    let result;
    if (isCreatingNewHistory) {
      result = await historiesAPI.create(patient.id, payload);
    } else if (history) {
      result = await historiesAPI.update(history.id, payload);
    }

    setHistorySaving(false);
    if (result?.error) return;

    setShowHistoryModal(false);
    await loadData(patient.id, isCreatingNewHistory ? null : history);
    setShowHistorySuccess(true);
    setTimeout(() => setShowHistorySuccess(false), 3000);
  };

  const confirmDeleteHistory = async () => {
    if (!history || !patient) return;
    await historiesAPI.delete(history.id);
    setShowDeleteHistoryModal(false);
    setHistory(null);
    setSessions([]);
    setShowDeleteSuccessOverlay(true);
    setTimeout(() => setShowDeleteSuccessOverlay(false), 3000);
    loadData(patient.id);
  };

  const confirmDeleteInvasiveProcedure = async () => {
    if (!ipToDelete || !patient) return;
    await proceduresAPI.delete(ipToDelete.id);
    setShowDeleteIpModal(false);
    setIpToDelete(null);
    loadData(patient.id, history);
  };

  const handlePatientEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!patient) return;
    const fd = new FormData(e.currentTarget);
    await patientsAPI.update(patient.id, {
      firstName: fd.get('firstName'),
      lastName: fd.get('lastName'),
      phone: fd.get('phone'),
      email: fd.get('email'),
      address: fd.get('address'),
      gender: fd.get('gender'),
      status: patient.status,
    });
    setShowEditPatientModal(false);
    loadData(patient.id, history);
  };

  const handlePrepareSession = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const isEditing = Boolean(pendingSession?.id && pendingOverrideToken);

    if (isEditing) {
      const updatedData = {
        technique: selectedEvolutionTechniques,
        description: fd.get('description') as string,
        attentionDescription: fd.get('attentionDescription') as string,
        editReason: 'Corrección autorizada por médico',
      };
      setShowSessionModal(false);
      saveEditedSession(pendingSession.id, updatedData);
    } else {
      setPendingSession({
        patientId: patient!.id,
        historyId: history!.id,
        technique: selectedEvolutionTechniques,
        description: fd.get('description') as string,
        attentionDescription: fd.get('attentionDescription') as string,
      });
      setShowSessionModal(false);
      setSignatureTarget('SESSION');
      setShowSignatureModal(true);
    }
  };

  const saveEditedSession = async (sessionId: string, data: any) => {
    // pendingOverrideToken proviene de una autorización médica ya validada server-side.
    // Para la edición seguimos usando el token de override (el médico firmante),
    // pero ya no swappeamos el token del usuario actual: lo enviamos como Authorization
    // adicional vía un cliente puntual.
    const originalToken = localStorage.getItem('accessToken');
    try {
      if (pendingOverrideToken) localStorage.setItem('accessToken', pendingOverrideToken);
      await sessionsAPI.update(sessionId, data);
    } finally {
      if (originalToken) localStorage.setItem('accessToken', originalToken);
      else localStorage.removeItem('accessToken');
    }
    setPendingOverrideToken(null);
    setPendingSession(null);
    loadData(patient!.id, history);
  };

  const submitSignedSession = async (signerDni: string, signerPassword: string) => {
    if (!pendingSession || !patient) return { error: 'Estado inválido' as string | undefined };

    const scheduledDate = history?.prescribedDates?.[sessions.length] || undefined;

    const result = await sessionsAPI.createSigned(pendingSession.historyId, {
      signerDni,
      signerPassword,
      technique: pendingSession.technique,
      description: pendingSession.description,
      attentionDescription: pendingSession.attentionDescription,
      scheduledDate,
    });

    if (result.error) return { error: result.error };

    if (remainingSessions - 1 <= 0) {
      const upd = await patientsAPI.update(patient.id, { status: 'FINALIZADO' });
      if (upd.error) console.warn('No se pudo marcar paciente como FINALIZADO:', upd.error);
    }

    const signerName = result.data?.therapistName || signerDni;
    setPendingSession(null);
    await loadData(patient.id, history);
    setSuccessSignerName(signerName);
    setShowSuccessOverlay(true);
    setHideNextSession(true);
    setTimeout(() => {
      setShowSuccessOverlay(false);
      setTimeout(() => setHideNextSession(false), 2000);
    }, 4000);
    return { error: undefined };
  };

  const handleSignatureModalClose = () => {
    setShowSignatureModal(false);
    setAuthError('');
    if (signatureTarget === 'SESSION') {
      setShowSessionModal(true);
      setSelectedEvolutionTechniques(
        pendingSession?.technique
          ? Array.isArray(pendingSession.technique) ? [...pendingSession.technique] : [pendingSession.technique]
          : history?.prescribedTechniques?.[sessions.length] || []
      );
    }
  };

  const handleCie10Search = async (val: string) => {
    setCie10Search(val);
    const result = await historiesAPI.searchCie10(val);
    if (result.data?.results?.length) {
      setCie10Results(result.data.results.map(it => ({ code: it.code, desc: it.description })));
    } else {
      setCie10Results([]);
    }
  };

  if (pageLoading) return <div className="p-8 text-[var(--muted-foreground)]">Cargando...</div>;
  if (!patient) return <div className="p-8 text-[var(--muted-foreground)]">Paciente no encontrado.</div>;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <HistorySuccessToast show={showHistorySuccess} />

      {/* Header */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 mb-6 flex flex-col md:flex-row md:items-start justify-between gap-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 p-4 opacity-[0.03] pointer-events-none">
          {patient.gender === 'MASCULINO' ? <MaleIcon className="w-60 h-60" /> : patient.gender === 'FEMENINO' ? <FemaleIcon className="w-60 h-60" /> : <UserIcon size={240} />}
        </div>
        <div className="flex items-start gap-5 relative z-10">
          <button onClick={() => navigate(-1)} className="p-2 shrink-0 bg-[var(--background)] border border-[var(--border)] rounded-full hover:bg-[var(--muted)] transition-colors mt-1">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">Paciente: {patient.firstName} {patient.lastName}</h1>
              <span className={`text-[10px] uppercase font-black px-2.5 py-1.5 rounded-full tracking-wider border ${patient.status === 'ACTIVO' ? 'bg-secondary-50 text-secondary-600 border-secondary-200 dark:bg-secondary-500/10 dark:border-secondary-500/20' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>{patient.status}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3 mb-2 text-xs text-[var(--foreground)] font-bold">
              <div className="flex items-center gap-1.5 bg-[var(--muted)]/50 px-3 py-1.5 rounded-lg border border-[var(--border)]">
                <UserIcon size={14} className="text-primary-500" />
                <span>{calculateAge(patient.birthDate)} <span className="opacity-40 mx-1">•</span> {patient.gender || '-'}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[var(--muted)]/50 px-3 py-1.5 rounded-lg border border-[var(--border)]">
                <CreditCard size={14} className="text-primary-500" />
                <span>DNI: {patient.dni}</span>
              </div>
              {patient.phone && <div className="flex items-center gap-1.5 bg-[var(--muted)]/50 px-3 py-1.5 rounded-lg border border-[var(--border)]"><Phone size={14} className="text-primary-500" /><span>{patient.phone}</span></div>}
              {patient.email && <div className="flex items-center gap-1.5 bg-[var(--muted)]/50 px-3 py-1.5 rounded-lg border border-[var(--border)]"><Mail size={14} className="text-primary-500" /><span>{patient.email}</span></div>}
              {patient.address && <div className="flex items-center gap-1.5 bg-[var(--muted)]/50 px-3 py-1.5 rounded-lg border border-[var(--border)]"><MapPin size={14} className="text-primary-500" /><span className="max-w-[200px] truncate">{patient.address}</span></div>}
            </div>
          </div>
        </div>
        {(currentUser?.role === 'MEDICO' || currentUser?.role === 'ADMISION') && (
          <button onClick={() => setShowEditPatientModal(true)} className="flex items-center gap-2 text-sm font-bold text-primary-500 hover:text-primary-600 bg-[var(--card)] hover:bg-[var(--muted)] px-4 py-2.5 rounded-xl transition-colors shrink-0 relative z-10 border border-[var(--border)] shadow-sm">
            <Edit3 size={16} /> Editar Datos
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-[var(--border)] overflow-x-auto relative z-10">
        {(['DATOS', 'SESIONES'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === tab ? 'border-primary-500 text-primary-500' : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}>
            {tab === 'DATOS' ? 'Resumen Clínico' : <>Historial de Atención <span className="bg-[var(--muted)] text-[var(--foreground)] text-xs px-2 py-0.5 rounded-full font-bold">{sessions.length}</span></>}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* TAB: RESUMEN CLÍNICO */}
        {activeTab === 'DATOS' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
              {/* Lista de historiales */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 flex flex-col h-fit max-h-[400px] md:h-[550px] md:max-h-none">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-bold flex items-center gap-2"><ClipboardList size={18} className="text-primary-500" /> Historiales</h2>
                  {currentUser?.role === 'MEDICO' && (
                    <button onClick={openNewHistoryModal} className="bg-primary-500 hover:bg-primary-600 text-white p-2 rounded-lg transition-colors shadow-sm flex items-center gap-1.5">
                      <Plus size={16} /><span className="text-xs font-bold px-1">NUEVO</span>
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 p-1">
                  {allHistories.length === 0 ? (
                    <p className="text-sm text-[var(--muted-foreground)] text-center py-8 border border-dashed border-[var(--border)] rounded-xl">No hay historiales.</p>
                  ) : (
                    allHistories.map((h, i) => {
                      const isSelected = history?.id === h.id;
                      return (
                        <div key={h.id} onClick={() => handleSelectHistory(h)} className={`p-3 cursor-pointer rounded-xl border transition-all duration-300 ${isSelected ? 'bg-primary-50/40 dark:bg-primary-900/5 border-primary-200 dark:border-primary-800/30 shadow-sm ring-1 ring-primary-500/20 scale-[1.01]' : 'bg-transparent border-[var(--border)] hover:bg-[var(--muted)]/50'}`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-xs ${isSelected ? 'font-black text-primary-700 dark:text-primary-400' : 'font-bold text-[var(--muted-foreground)]'}`}>{format(new Date(h.createdAt), 'dd MMM yyyy')}</span>
                            {i === 0 && <span className="text-[9px] font-black bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full uppercase">Actual</span>}
                          </div>
                          <div className={`text-sm line-clamp-1 ${isSelected ? 'font-black text-[var(--foreground)]' : 'font-semibold text-[var(--muted-foreground)]'}`}>{h.cie10Description}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Detalle historial */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 flex flex-col min-h-[550px]">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-lg font-bold flex items-center gap-2"><FileText size={18} className="text-primary-500" /> Detalle de Evaluación Clínica</h2>
                  <div className="flex items-center gap-2">
                    {currentUser?.role === 'MEDICO' && history && (
                      <>
                        <button onClick={openHistoryModal} className="text-primary-500 hover:text-primary-600 bg-[var(--card)] hover:bg-[var(--muted)] shadow-sm border border-[var(--border)] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"><Edit3 size={14} /> Editar</button>
                        <button onClick={() => { setDeleteConfirmValue(''); setShowDeleteHistoryModal(true); }} className="text-red-500 hover:text-red-600 bg-[var(--card)] hover:bg-red-50 dark:hover:bg-red-950/20 shadow-sm border border-[var(--border)] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"><Trash2 size={14} /> Eliminar</button>
                      </>
                    )}
                  </div>
                </div>

                {!history ? (
                  <div className="text-center py-12 text-[var(--muted-foreground)] text-sm border border-dashed border-[var(--border)] rounded-2xl my-auto">
                    Seleccione un historial o cree uno nuevo.
                    {currentUser?.role === 'MEDICO' && (
                      <button onClick={openNewHistoryModal} className="mt-4 bg-primary-500 text-white px-4 py-2 rounded-xl font-medium block mx-auto hover:bg-primary-600 transition-colors">Crear Evaluación Inicial</button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 text-sm flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <p className="text-[var(--muted-foreground)] text-xs mb-1.5 font-semibold uppercase tracking-wider">Diagnóstico CIE-10</p>
                        <div className="flex items-center justify-center text-center gap-3 bg-[var(--muted)]/50 p-4 rounded-xl border border-[var(--border)] shadow-sm">
                          <span className="font-semibold text-[var(--foreground)] text-base">{history.cie10Description}</span>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-[var(--muted-foreground)] text-xs font-semibold mb-1.5 uppercase tracking-wider">Motivo de Consulta y Anamnesis</p>
                        <p className="bg-[var(--muted)]/50 p-4 rounded-xl border border-[var(--border)] text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">{history.anamnesis || 'No registrado'}</p>
                      </div>
                      <div>
                        <p className="text-[var(--muted-foreground)] text-xs font-semibold mb-1.5 uppercase tracking-wider">Examen Físico</p>
                        <p className="bg-[var(--muted)]/50 p-4 rounded-xl border border-[var(--border)] text-[var(--foreground)] leading-relaxed whitespace-pre-wrap h-full">{history.physicalExam || 'No registrado'}</p>
                      </div>
                      <div>
                        <p className="text-[var(--muted-foreground)] text-xs font-semibold mb-1.5 uppercase tracking-wider">Antecedentes</p>
                        <p className="bg-[var(--muted)]/50 p-4 rounded-xl border border-[var(--border)] text-[var(--foreground)] leading-relaxed whitespace-pre-wrap h-full">{history.antecedentes || 'No registrado'}</p>
                      </div>
                      {history.imageUrl && (
                        <div className="md:col-span-2 mt-4">
                          <p className="text-[var(--muted-foreground)] text-xs font-semibold mb-1.5 uppercase tracking-wider">Imagen de Referencia / Diagnóstica</p>
                          <div className="relative group overflow-hidden border border-[var(--border)] rounded-2xl bg-black/5 dark:bg-white/5 p-2 flex items-center justify-center max-w-lg mx-auto shadow-sm">
                            <img src={history.imageUrl} alt="Imagen de referencia médica" className="max-h-60 object-contain rounded-xl transition-all duration-300 group-hover:scale-[1.02] cursor-zoom-in" onClick={() => { setZoomedImage(history.imageUrl); setZoomScale(1); setZoomPosition({ x: 0, y: 0 }); }} referrerPolicy="no-referrer" />
                            <button type="button" onClick={() => { setZoomedImage(history.imageUrl); setZoomScale(1); setZoomPosition({ x: 0, y: 0 }); }} className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 border border-white/10 opacity-0 group-hover:opacity-100 cursor-pointer">
                              <ZoomIn size={14} /> Ampliar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-[var(--border)] pt-4 mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[var(--muted-foreground)] font-semibold uppercase tracking-wider mb-1">Plan de Tratamiento</p>
                        <p className="font-medium text-[var(--foreground)] flex items-center gap-2"><Activity size={16} className="text-primary-500" /> {history.prescribedSessions} sesiones programadas</p>
                      </div>
                      <button onClick={() => setActiveTab('SESIONES')} className="text-primary-500 hover:text-primary-600 font-medium text-sm flex items-center gap-1 group">Ver sesiones <ArrowLeft size={16} className="rotate-180 group-hover:translate-x-1 transition-transform" /></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: HISTORIAL DE ATENCIÓN */}
        {activeTab === 'SESIONES' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-[var(--border)] pb-6">
                <div className="w-full sm:w-auto">
                  <h2 className="text-xl font-bold flex items-center gap-2"><Activity size={22} className="text-primary-500" /> Plan de Sesiones</h2>
                  {history && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-[var(--muted-foreground)] bg-[var(--muted)]/50 border border-[var(--border)] px-4 py-2 rounded-xl w-full sm:w-fit">
                      <FileText size={16} className="opacity-80 text-primary-500 shrink-0" />
                      <span className="font-bold text-primary-700 dark:text-primary-400 shrink-0">{history.cie10Code}</span>
                      <span className="opacity-50 shrink-0">-</span>
                      <span className="font-medium text-[var(--foreground)] truncate">{history.cie10Description}</span>
                      <span className="opacity-50 shrink-0 hidden sm:inline">•</span>
                      <span className="shrink-0 hidden sm:inline">{format(new Date(history.createdAt), 'dd MMM yyyy')}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto sm:justify-end">
                  {currentUser?.role === 'MEDICO' && (
                    <button onClick={() => setShowInvasiveModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center shadow-orange-600/10">
                      <Syringe size={16} /> Procedimiento Invasivo
                    </button>
                  )}
                  {history && (
                    <div className="flex items-center gap-3 w-full sm:w-auto select-none">
                      <div className="text-center px-4 py-1 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm">
                        <p className="text-[10px] text-[var(--muted-foreground)] font-semibold uppercase">Restantes</p>
                        <p className={`text-lg font-bold flex items-baseline justify-center gap-1 ${remainingSessions <= 2 ? 'text-orange-500' : 'text-[var(--foreground)]'}`}>
                          {remainingSessions} <span className="text-xs text-[var(--muted-foreground)] font-medium">/ {history.prescribedSessions}</span>
                        </p>
                      </div>
                      {remainingSessions <= 0 && currentUser?.role === 'MEDICO' && (
                        <button onClick={openNewHistoryModal} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl font-medium text-xs transition-all flex items-center gap-1.5"><FileText size={14} /> Nuevo Paquete</button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {!history && (
                <div className="text-center py-12 text-[var(--muted-foreground)] bg-[var(--muted)]/30 rounded-2xl border border-[var(--border)]">
                  <Activity size={32} className="mx-auto mb-3 opacity-30" />
                  El paciente necesita un Historial Clínico para iniciar sesiones.
                </div>
              )}

              {history && remainingSessions > 0 && !hideNextSession && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8 p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl relative overflow-hidden flex flex-col md:flex-row gap-6 md:items-center justify-between shadow-sm">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary-500 rounded-l-2xl" />
                  <div className="flex-1 relative z-10">
                    <h3 className="text-lg font-bold text-[var(--foreground)] mb-3 flex items-center gap-2"><Sparkles size={22} className="text-secondary-500" /> Sesión de hoy: #{sessions.length + 1}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Técnicas a aplicar</p>
                        <div className="flex flex-wrap gap-1.5">
                          {history.prescribedTechniques?.[sessions.length]?.length > 0 ? (
                            history.prescribedTechniques[sessions.length].map((t: string, idx: number) => (
                              <span key={idx} className="bg-transparent border border-secondary-300 dark:border-secondary-700/50 text-secondary-600 dark:text-secondary-400 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">{t}</span>
                            ))
                          ) : (
                            <span className="text-sm font-medium text-[var(--foreground)]">No especificadas</span>
                          )}
                        </div>
                      </div>
                      {history.prescribedDates?.[sessions.length] && (
                        <div>
                          <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Fecha Programada</p>
                          <p className="font-medium text-[var(--foreground)] flex items-center gap-2"><Clock size={16} className="text-secondary-500" />{format(new Date(history.prescribedDates[sessions.length]), 'dd MMM yyyy')}</p>
                        </div>
                      )}
                      {history.prescribedDescriptions?.[sessions.length] && (
                        <div className="md:col-span-2">
                          <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Instrucciones Médicas</p>
                          <p className="text-sm font-medium text-[var(--foreground)] bg-[var(--muted)]/50 p-3 rounded-lg border border-[var(--border)]">{history.prescribedDescriptions[sessions.length]}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center justify-end w-full md:w-auto relative z-10">
                    <button onClick={() => { setPendingSession(null); setSelectedEvolutionTechniques(history?.prescribedTechniques?.[sessions.length] || []); setShowSessionModal(true); }} className="bg-secondary-500 hover:bg-secondary-600 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-md shadow-secondary-500/20 flex items-center gap-2 w-full md:w-auto justify-center">
                      <Plus size={18} /> Registrar Sesión
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Timeline */}
              {(() => {
                const timelineItems = [
                  ...sessions.map((s: any, originalIdx: number) => ({ type: 'SESSION' as const, data: s, date: new Date(s.signedAt).getTime(), sessionNumber: sessions.length - originalIdx })),
                  ...(invasiveProcedures || []).map((ip: any) => ({ type: 'INVASIVE_PROCEDURE' as const, data: ip, date: new Date(ip.signedAt).getTime(), sessionNumber: 0 }))
                ].sort((a, b) => b.date - a.date);

                if (timelineItems.length === 0) {
                  return history ? (
                    <div className="text-center py-12 text-[var(--muted-foreground)] border border-dashed border-[var(--border)] rounded-2xl">
                      Aún no hay atenciones registradas para este paciente.
                    </div>
                  ) : null;
                }

                return (
                  <div className="relative pl-4 sm:pl-6 border-l-2 border-primary-100 dark:border-primary-900/30 space-y-8 mt-6">
                    {timelineItems.map((item, idx) => {
                      const isLast = idx === 0;
                      if (item.type === 'SESSION') {
                        const s = item.data;
                        const therapist = usersMap.get(s.therapistId);
                        const sessionNumber = item.sessionNumber;
                        return (
                          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={s.id} className="relative">
                            <div className={`absolute -left-[23px] sm:-left-[31px] w-4 h-4 sm:w-5 sm:h-5 rounded-full border-4 border-[var(--card)] ${isLast ? 'bg-primary-500' : 'bg-primary-300'} shadow-sm`} />
                            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:border-primary-300 transition-colors group">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="bg-[var(--muted)] text-[var(--foreground)] font-bold px-2 py-1 rounded-md text-[10px] uppercase tracking-wider shrink-0">SESIÓN {sessionNumber}</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(Array.isArray(s.technique) ? s.technique : [s.technique]).map((t: string, tIdx: number) => (
                                      <span key={tIdx} className="bg-transparent border border-sky-300 dark:border-sky-700/50 text-sky-600 dark:text-sky-400 font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider whitespace-nowrap">{t}</span>
                                    ))}
                                  </div>
                                  {s.isEdited && <span className="flex items-center gap-1 text-[10px] text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-md font-medium border border-orange-200 dark:border-orange-800/50 shrink-0"><Edit3 size={10} /> Editado</span>}
                                </div>
                                <div className="flex flex-col sm:items-end gap-1 text-[var(--muted-foreground)] text-[10px] font-medium w-full sm:w-auto select-none">
                                  <div className="flex items-center sm:justify-end gap-1.5"><CheckCircle2 size={12} className="text-secondary-500 shrink-0" /><span className="whitespace-nowrap">{format(new Date(s.signedAt), 'dd MMM yyyy, HH:mm')}</span></div>
                                  {history?.prescribedDates?.[sessionNumber - 1] && (
                                    <div className="flex items-center sm:justify-end gap-1.5 opacity-70"><Clock size={12} className="shrink-0" /><span className="whitespace-nowrap">Cita: {format(new Date(history.prescribedDates[sessionNumber - 1]), 'dd MMM yyyy')}</span></div>
                                  )}
                                </div>
                              </div>
                              <div className="mb-4">
                                <p className="text-sm font-semibold text-[var(--foreground)] mb-1">Evolución Clínica</p>
                                <p className="text-sm text-[var(--foreground)] leading-relaxed p-3 bg-[var(--muted)]/40 rounded-xl border border-[var(--border)]">{s.description}</p>
                                {s.attentionDescription && (
                                  <div className="mt-3">
                                    <p className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 uppercase tracking-wider">Detalles de Atención</p>
                                    <p className="text-sm text-[var(--foreground)] leading-relaxed p-3 bg-[var(--card)] rounded-xl border border-dashed border-[var(--border)]">{s.attentionDescription}</p>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 flex-wrap gap-3">
                                <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]"><CheckCircle2 size={14} className="text-secondary-500 shrink-0" /><span>Firmado por: <span className="font-medium text-[var(--foreground)]">{therapist?.fullName || 'Desconocido'}</span></span></div>
                                <button onClick={() => { setPendingSession(s); setSignatureTarget('OVERRIDE'); setShowSignatureModal(true); }} className="text-[10px] sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1 text-primary-500 font-medium hover:underline">
                                  <Lock size={12} /> Desbloquear
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      } else {
                        const ip = item.data;
                        const doctor = usersMap.get(ip.doctorId);
                        return (
                          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={ip.id} className="relative">
                            <div className="absolute -left-[23px] sm:-left-[31px] w-4 h-4 sm:w-5 sm:h-5 rounded-full border-4 border-[var(--card)] bg-orange-500 shadow-sm" />
                            <div className="bg-[var(--card)] border border-orange-200/80 dark:border-orange-950/40 rounded-2xl p-5 hover:border-orange-400 transition-colors group relative overflow-hidden">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="bg-[var(--muted)] text-[var(--foreground)] font-bold px-2 py-1 rounded-md text-[10px] uppercase tracking-wider shrink-0">PROCEDIMIENTO</span>
                                  <span className="text-orange-600 dark:text-orange-400 font-black text-[11px] uppercase tracking-wider">{ip.procedureName}</span>
                                </div>
                                <div className="flex items-center sm:justify-end gap-1.5 text-[var(--muted-foreground)] text-[10px] font-medium"><Clock size={12} className="text-orange-500 shrink-0" /><span className="whitespace-nowrap">{format(new Date(ip.signedAt), 'dd MMM yyyy, HH:mm')}</span></div>
                              </div>
                              <div className="mb-4">
                                <p className="text-sm font-semibold text-[var(--foreground)] mb-1">Descripción y Hallazgos</p>
                                <p className="text-sm text-[var(--foreground)] leading-relaxed p-3 bg-orange-50/10 dark:bg-orange-950/5 rounded-xl border border-orange-100/30 dark:border-orange-900/10 whitespace-pre-wrap">{ip.description}</p>
                              </div>
                              <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 flex-wrap gap-3">
                                <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]"><ShieldCheck size={14} className="text-orange-500 shrink-0" /><span>Firmado por Médico: <span className="font-extrabold text-[var(--foreground)]">{doctor?.fullName || 'Dr. Desconocido'}</span></span></div>
                                {currentUser?.role === 'MEDICO' && (
                                  <button type="button" onClick={() => { setIpToDelete(ip); setShowDeleteIpModal(true); }} className="text-[10px] sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1 text-red-500 font-medium hover:underline cursor-pointer">
                                    <Trash2 size={12} /> Eliminar
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      }
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: EDITAR PACIENTE */}
      <AnimatePresence>
        {showEditPatientModal && (
          <Modal onClose={() => setShowEditPatientModal(false)} className="w-full max-w-2xl p-6 rounded-3xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 pr-8"><UserIcon className="text-primary-500" /> Editar Paciente</h2>
              <form onSubmit={handlePatientEdit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1.5">Nombres</label><input required name="firstName" defaultValue={patient.firstName} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500" /></div>
                  <div><label className="block text-sm font-medium mb-1.5">Apellidos</label><input required name="lastName" defaultValue={patient.lastName} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500" /></div>
                  <div><label className="block text-sm font-medium mb-1.5">Teléfono</label><input required name="phone" defaultValue={patient.phone} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500" /></div>
                  <div><label className="block text-sm font-medium mb-1.5">Email</label><input type="email" name="email" defaultValue={patient.email} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500" /></div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Sexo</label>
                    <select required name="gender" defaultValue={patient.gender || ''} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="" disabled>Seleccione...</option>
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMENINO">Femenino</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium mb-1.5">Dirección</label><input required name="address" defaultValue={patient.address} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                  <button type="button" onClick={() => setShowEditPatientModal(false)} className="px-5 py-2.5 rounded-xl border border-[var(--border)] font-medium hover:bg-[var(--muted)] transition-colors">Cancelar</button>
                  <button type="submit" className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors">Guardar Cambios</button>
                </div>
              </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* MODAL: ELIMINAR HISTORIAL */}
      <AnimatePresence>
        {showDeleteHistoryModal && (
          <Modal onClose={() => setShowDeleteHistoryModal(false)} className="w-full max-w-sm p-6 rounded-3xl text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
              <h2 className="text-xl font-bold mb-2">Eliminar Evaluación</h2>
              <p className="text-[var(--muted-foreground)] text-sm mb-4">Para confirmar, ingrese el número de sesiones restantes (<b>{remainingSessions}</b>):</p>
              <input type="text" value={deleteConfirmValue} onChange={e => setDeleteConfirmValue(e.target.value)} autoFocus placeholder={`Escriba ${remainingSessions}`} className="w-full text-center px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-red-500 mb-6 bg-[var(--muted)]/50 font-bold" />
              <div className="flex gap-3 w-full">
                <button type="button" onClick={() => setShowDeleteHistoryModal(false)} className="flex-1 py-3 bg-[var(--muted)] hover:bg-[var(--muted-foreground)]/20 rounded-xl font-medium transition-colors">Cancelar</button>
                <button type="button" onClick={confirmDeleteHistory} disabled={deleteConfirmValue !== remainingSessions.toString()} className="flex-1 py-3 bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600 text-white rounded-xl font-medium transition-colors">Sí, eliminar</button>
              </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* MODAL: ELIMINAR PROCEDIMIENTO INVASIVO */}
      <AnimatePresence>
        {showDeleteIpModal && ipToDelete && (
          <Modal onClose={() => { setShowDeleteIpModal(false); setIpToDelete(null); }} className="w-full max-w-sm p-6 rounded-3xl text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
              <h2 className="text-xl font-bold mb-2">Eliminar Procedimiento</h2>
              <p className="text-[var(--muted-foreground)] text-sm mb-6">¿Eliminar permanentemente <b>"{ipToDelete.procedureName}"</b>? Esta acción no se puede deshacer.</p>
              <div className="flex gap-3 w-full">
                <button type="button" onClick={() => { setShowDeleteIpModal(false); setIpToDelete(null); }} className="flex-1 py-3 bg-[var(--muted)] hover:bg-[var(--muted-foreground)]/20 rounded-xl font-medium transition-colors cursor-pointer">Cancelar</button>
                <button type="button" onClick={confirmDeleteInvasiveProcedure} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors cursor-pointer">Sí, eliminar</button>
              </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* MODAL: HISTORIAL CLÍNICO */}
      <AnimatePresence>
        {showHistoryModal && (
          <Modal onClose={() => setShowHistoryModal(false)} className="w-full max-w-4xl p-8 rounded-[2.5rem]">
              <div className="flex items-center justify-between mb-6 pr-8">
                <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="text-primary-500" /> {(history && !isCreatingNewHistory) ? 'Editar' : 'Nuevo'} Historial Clínico</h2>
                <div className="flex gap-2 items-center text-sm font-black">
                  {[1, 2].map(step => <span key={step} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${historyModalStep === step ? 'bg-primary-500 text-white shadow-md' : 'bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]'}`}>{step}</span>)}
                </div>
              </div>

              {historyModalStep === 1 ? (
                <form onSubmit={handleNextStepHistory} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-2 space-y-4">
                      <h3 className="text-sm font-bold text-primary-500 uppercase tracking-widest flex items-center gap-2 border-b border-[var(--border)] pb-2"><Stethoscope size={16} /> Diagnóstico Médico</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                        <div className="md:col-span-1">
                          <label className="block text-sm font-medium mb-1.5 opacity-70">Código CIE-10</label>
                          <input readOnly value={historyFormData.cie10Code || ''} className="w-full px-4 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-xl outline-none font-medium opacity-70 cursor-not-allowed" placeholder="Ej. M54.5" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1.5">Descripción Diagnóstico</label>
                          <motion.div animate={isCie10Shaking ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }} transition={{ duration: 0.4 }} className="relative">
                            <input required spellCheck="false" autoComplete="off" value={historyFormData.cie10Description || ''} onChange={e => { setHistoryFormData({ ...historyFormData, cie10Description: e.target.value, cie10Code: '' }); handleCie10Search(e.target.value); setCie10Error(''); setShowCie10Options(true); }} onFocus={() => setShowCie10Options(true)} onBlur={() => setTimeout(() => setShowCie10Options(false), 200)} className={`w-full pl-10 pr-4 py-2.5 bg-transparent border ${cie10Error ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-primary-500'} rounded-xl outline-none focus:ring-2`} placeholder="Buscar diagnóstico o código..." />
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                            {cie10Error && <p className="absolute top-full left-0 mt-1 text-red-500 text-[10px] font-medium ml-1">{cie10Error}</p>}
                            <AnimatePresence>
                              {showCie10Options && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute top-full left-0 right-0 mt-2 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                  {cie10Results.length > 0 ? cie10Results.map(ex => (
                                    <button key={ex.code} type="button" onClick={() => { setHistoryFormData({ ...historyFormData, cie10Code: ex.code, cie10Description: ex.desc }); setShowCie10Options(false); }} className="w-full text-left px-4 py-2 hover:bg-primary-50 dark:hover:bg-primary-900/40 hover:text-primary-600 transition-colors border-b border-[var(--border)] last:border-0">
                                      <div className="font-bold">{ex.desc}</div>
                                      <div className="text-xs text-[var(--muted-foreground)]">Código CIE-10: {ex.code}</div>
                                    </button>
                                  )) : <div className="px-4 py-3 text-sm text-[var(--muted-foreground)] text-center">Sin resultados</div>}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                      <h3 className="text-sm font-bold text-primary-500 uppercase tracking-widest flex items-center gap-2 border-b border-[var(--border)] pb-2"><ClipboardList size={16} /> Evaluación Clínica</h3>
                      <div className="md:col-span-2"><label className="block text-sm font-medium mb-1.5">Anamnesis (Motivo de consulta y síntomas)</label><textarea required rows={4} value={historyFormData.anamnesis || ''} onChange={e => setHistoryFormData({ ...historyFormData, anamnesis: e.target.value })} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500 resize-none leading-relaxed" placeholder="Describa el motivo de consulta..." /></div>
                      <div className="md:col-span-2"><label className="block text-sm font-medium mb-1.5">Examen Físico (Postura, ROM, fuerza, palpación)</label><textarea required rows={4} value={historyFormData.physicalExam || ''} onChange={e => setHistoryFormData({ ...historyFormData, physicalExam: e.target.value })} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500 resize-none leading-relaxed" placeholder="Hallazgos de la evaluación física..." /></div>
                      <div className="md:col-span-2"><label className="block text-sm font-medium mb-1.5">Antecedentes (Enfermedades, cirugías, alergias)</label><textarea required rows={4} value={historyFormData.antecedentes || ''} onChange={e => setHistoryFormData({ ...historyFormData, antecedentes: e.target.value })} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500 resize-none leading-relaxed" placeholder="Afecciones previas..." /></div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1.5">Imagen de Referencia (Opcional)</label>
                        <div className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 transition-all relative overflow-hidden group min-h-[160px] ${isHistoryDragging ? 'border-primary-500 bg-primary-500/5' : 'border-[var(--border)] bg-[var(--muted)]/20 hover:border-primary-400'}`}
                          onDragOver={e => { e.preventDefault(); setIsHistoryDragging(true); }} onDragLeave={e => { e.preventDefault(); setIsHistoryDragging(false); }}
                          onDrop={e => { e.preventDefault(); setIsHistoryDragging(false); const file = e.dataTransfer.files?.[0]; if (file?.type.startsWith('image/')) { const reader = new FileReader(); reader.onload = ev => { if (ev.target?.result) setHistoryFormData({ ...historyFormData, imageUrl: ev.target.result as string }); }; reader.readAsDataURL(file); } }}>
                          {historyFormData.imageUrl ? (
                            <div className="relative w-full max-h-72 overflow-hidden rounded-xl flex items-center justify-center p-2">
                              <img src={historyFormData.imageUrl} alt="Vista previa" className="max-h-64 object-contain rounded-lg shadow-sm" referrerPolicy="no-referrer" />
                              <button type="button" onClick={() => setHistoryFormData({ ...historyFormData, imageUrl: '' })} className="absolute top-3 right-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all z-10"><X size={15} /></button>
                            </div>
                          ) : (
                            <label className="cursor-pointer w-full text-center flex flex-col items-center justify-center py-4 select-none">
                              <Upload size={32} className={`mb-2 transition-colors ${isHistoryDragging ? 'text-primary-500 animate-bounce' : 'text-[var(--muted-foreground)] group-hover:text-primary-500'}`} />
                              <span className="text-sm font-semibold text-[var(--foreground)]">arrastra una imagen o <span className="text-primary-500 font-extrabold hover:underline">haz clic para buscarla</span></span>
                              <span className="text-xs text-[var(--muted-foreground)] mt-1.5">Formatos: JPG, PNG, GIF</span>
                              <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = ev => { if (ev.target?.result) setHistoryFormData({ ...historyFormData, imageUrl: ev.target.result as string }); }; reader.readAsDataURL(file); } }} />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border)]">
                    <button type="button" onClick={() => setShowHistoryModal(false)} className="px-5 py-2.5 rounded-xl border border-[var(--border)] font-medium hover:bg-[var(--muted)]">Cancelar</button>
                    <button type="submit" className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2">Siguiente: Plan de Tratamiento <ArrowLeft size={18} className="rotate-180" /></button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSaveHistory} className="space-y-6">
                  <div ref={sessionsContainerRef} className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
                    <div className="sticky top-0 bg-[var(--card)] py-4 border-b border-[var(--border)] z-10 flex items-center justify-between">
                      <h3 className="font-bold text-sm text-[var(--muted-foreground)] uppercase tracking-widest flex items-center gap-2"><Activity size={18} className="text-primary-500" /> Plan de Tratamiento</h3>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--muted)]/50 border border-[var(--border)]">
                        <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Programadas</span>
                        <span className="bg-primary-500 text-white text-xs font-black px-2 py-0.5 rounded-md">{prescribedSessionsCount}</span>
                      </div>
                    </div>
                    {Array.from({ length: prescribedSessionsCount }).map((_, i) => (
                      <div key={i} className="group relative flex flex-col md:flex-row items-center gap-4 p-5 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20 hover:border-primary-300 transition-all">
                        <div className="flex flex-col gap-2 shrink-0 md:self-start">
                          <div className="flex items-center justify-between md:flex-col md:gap-2">
                            <span className="font-black text-[var(--foreground)] w-full md:w-32 bg-[var(--card)] px-4 py-3 rounded-xl border border-[var(--border)] text-xs shadow-sm inline-block text-center uppercase tracking-widest">Sesión {i + 1}</span>
                            {prescribedSessionsCount > 1 && <button type="button" onClick={() => removeSession(i)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"><Trash2 size={16} /></button>}
                          </div>
                        </div>
                        <div className="flex-1 w-full space-y-3">
                          <div className="flex flex-col md:flex-row gap-3">
                            <div className="md:flex-1 w-full space-y-2">
                              <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase ml-2 mb-1">Técnicas</p>
                              <div className="relative">
                                <select className="w-full px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium appearance-none" value="" onChange={e => { const t = e.target.value; const next = [...sessionTechniques]; if (!next[i]?.includes(t)) { next[i] = [...(next[i] || []), t]; setSessionTechniques(next); } }}>
                                  <option value="" disabled>Agregar técnica...</option>
                                  {techniquesOptions.filter(t => !sessionTechniques[i]?.includes(t)).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--muted-foreground)]"><Plus size={16} /></div>
                              </div>
                              <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-[var(--muted)]/30 rounded-xl border border-[var(--border)]/50">
                                {(!sessionTechniques[i] || sessionTechniques[i].length === 0) && <div className="flex items-center justify-center w-full opacity-50 italic text-xs py-1 text-[var(--muted-foreground)]">Ninguna técnica seleccionada</div>}
                                {sessionTechniques[i]?.map(t => (
                                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} key={t} className="bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] pl-3 pr-1 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                                    <span className="text-xs font-semibold">{t}</span>
                                    <button type="button" onClick={() => { const next = [...sessionTechniques]; next[i] = next[i].filter(x => x !== t); setSessionTechniques(next); }} className="w-6 h-6 rounded-md text-[var(--muted-foreground)] flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 w-full md:w-auto shrink-0 md:self-start">
                              <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase ml-2 mb-1">Fecha de Cita</label>
                              <input required type="date" value={sessionDates[i] || ''} onChange={e => { const next = [...sessionDates]; next[i] = e.target.value; setSessionDates(next); }} className="w-full md:w-auto px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium text-[var(--foreground)]" />
                            </div>
                          </div>
                          <input required type="text" placeholder="Descripción o instrucciones..." value={sessionDescriptions[i] || ''} onChange={e => { const next = [...sessionDescriptions]; next[i] = e.target.value; setSessionDescriptions(next); }} className="w-full px-4 py-2.5 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
                        </div>
                      </div>
                    ))}
                    <div className="pt-2">
                      <button type="button" onClick={() => handleSessionsChange(prescribedSessionsCount + 1)} className="w-full flex items-center justify-center gap-3 bg-primary-500 hover:bg-primary-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-primary-500/25">
                        <Plus size={20} /><span>Agregar Nueva Sesión al Tratamiento</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-6 border-t border-[var(--border)]">
                    <button type="button" onClick={() => setHistoryModalStep(1)} className="px-5 py-2.5 rounded-xl border border-[var(--border)] font-medium hover:bg-[var(--muted)]">← Volver</button>
                    <button type="submit" disabled={historySaving} className="bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">{historySaving ? 'Guardando...' : <><Check size={18} /> Guardar Tratamiento</>}</button>
                  </div>
                </form>
              )}
          </Modal>
        )}
      </AnimatePresence>

      {/* MODAL: PROCEDIMIENTO INVASIVO */}
      <AnimatePresence>
        {showInvasiveModal && (
          <Modal onClose={() => setShowInvasiveModal(false)} className="w-full max-w-2xl p-6 sm:p-8 rounded-[2rem]">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6 pr-8"><Syringe className="text-orange-500 animate-pulse" /> Registrar Procedimiento Invasivo</h2>
              <form onSubmit={handleCreateInvasiveProcedure} className="space-y-5">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Tipo de Procedimiento Invasivo</label>
                  <input type="text" required placeholder="Ej. Punción Seca, EPI, Acupuntura Clínica..." value={invasiveFormData.procedureName} onChange={e => setInvasiveFormData({ ...invasiveFormData, procedureName: e.target.value })} className="w-full bg-[var(--muted)]/50 border border-[var(--border)] focus:border-orange-400 p-3 rounded-xl outline-none transition-colors text-sm font-semibold" list="invasive-suggestions" />
                  <datalist id="invasive-suggestions">
                    <option value="Punción Seca de Puntos Gatillo (Miofascial)" />
                    <option value="Electrólisis Percutánea Intratisular (EPI)" />
                    <option value="Acupuntura Clínica Segmentaria" />
                    <option value="Neuromodulación Percutánea Ecoguíada" />
                  </datalist>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['Punción Seca', 'EPI', 'Acupuntura', 'Neuromodulación'].map(opt => (
                      <button key={opt} type="button" onClick={() => setInvasiveFormData({ ...invasiveFormData, procedureName: opt })} className="bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] text-[10px] uppercase font-bold px-2.5 py-1 rounded-md border border-[var(--border)] hover:border-orange-300 transition-colors">{opt}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Descripción, Dosificación y Abordaje Clínico</label>
                  <textarea required rows={4} placeholder="Describa el abordaje realizado, calibre de aguja, zona anatómica, tolerancia del paciente..." value={invasiveFormData.description} onChange={e => setInvasiveFormData({ ...invasiveFormData, description: e.target.value })} className="w-full bg-[var(--muted)]/50 border border-[var(--border)] focus:border-orange-400 p-3 rounded-xl outline-none transition-colors text-sm leading-relaxed resize-none h-32" />
                </div>
                <div className="bg-[var(--muted)]/50 p-4 rounded-xl border border-[var(--border)] text-xs text-[var(--muted-foreground)] leading-relaxed font-semibold">
                  <p className="flex items-start gap-2"><ShieldAlert size={16} className="text-orange-500 shrink-0 mt-0.5 animate-bounce" /><span><strong className="text-[var(--foreground)]">Consentimiento de Bioseguridad:</strong> Al registrar confirma que se obtuvo consentimiento informado del paciente y que el expediente quedará respaldado bajo la firma del médico <strong className="text-[var(--foreground)]">{currentUser?.fullName}</strong>.</span></p>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setShowInvasiveModal(false)} className="bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] font-bold text-sm px-5 py-2.5 rounded-xl transition-colors">Cancelar</button>
                  <button type="submit" disabled={isInvasiveSubmitting} className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2">{isInvasiveSubmitting ? 'Firmando...' : <><Syringe size={16} /> Guardar y Firmar</>}</button>
                </div>
              </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* MODAL: REGISTRAR/EDITAR SESIÓN */}
      <AnimatePresence>
        {showSessionModal && (
          <Modal onClose={() => { setShowSessionModal(false); setPendingOverrideToken(null); }} className="w-full max-w-4xl p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] max-h-[95vh] flex flex-col overflow-hidden">
              <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 shrink-0 pr-8"><Activity className="text-primary-500" /> {pendingSession?.id ? 'Editar Sesión' : `Registro de Evolución (${sessions.length + 1}° Sesión)`}</h2>
              <form onSubmit={handlePrepareSession} className="space-y-4 overflow-y-auto px-4 py-2 pb-4">
                {history && !pendingSession?.id && (
                  <div className="p-4 sm:p-6 bg-[var(--muted)]/20 border border-[var(--border)] rounded-2xl mb-4 text-center shadow-sm">
                    <p className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-3">Instrucciones del Médico</p>
                    <div className="mb-3">
                      <p className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Técnicas a aplicar</p>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {history.prescribedTechniques?.[sessions.length]?.length > 0 ? history.prescribedTechniques[sessions.length].map((t: string, idx: number) => (
                          <span key={idx} className="bg-[var(--card)] text-[var(--foreground)] text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[var(--border)] uppercase">{t}</span>
                        )) : <span className="font-bold text-[var(--muted-foreground)] border border-dashed border-[var(--border)] px-4 py-1.5 rounded-lg text-sm">No especificadas</span>}
                      </div>
                    </div>
                    {history.prescribedDescriptions?.[sessions.length] && (
                      <div className="border-t border-[var(--border)] pt-4 mt-2">
                        <p className="text-xs font-black text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Descripción / Indicaciones</p>
                        <p className="text-base text-[var(--foreground)] font-medium leading-relaxed">{history.prescribedDescriptions[sessions.length]}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Técnicas seleccionadas */}
                <div>
                  <label className="block text-sm font-medium mb-2">Técnicas Aplicadas</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {techniquesOptions.map(t => (
                      <button key={t} type="button" onClick={() => setSelectedEvolutionTechniques(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${selectedEvolutionTechniques.includes(t) ? 'bg-primary-500 text-white border-primary-500' : 'bg-transparent border-[var(--border)] text-[var(--muted-foreground)] hover:border-primary-300'}`}>{t}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Evolución Clínica</label>
                  <textarea required name="description" rows={3} defaultValue={pendingSession?.description || ''} placeholder="Detalle cómo respondió el paciente a la terapia..." className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500 resize-none leading-relaxed" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Descripción Adicional (Opcional)</label>
                  <textarea name="attentionDescription" rows={2} defaultValue={pendingSession?.attentionDescription || ''} placeholder="Observaciones adicionales, incidentes, etc..." className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500 resize-none leading-relaxed" />
                </div>
                <div className="pt-2">
                  {!pendingSession?.id && (
                    <div className="bg-transparent border border-[var(--border)] rounded-xl p-3 mb-6 flex gap-3 text-orange-800 dark:text-orange-400 text-sm">
                      <ShieldAlert size={20} className="shrink-0" />
                      <p>Al guardar, se requerirá tu firma digital (DNI y Contraseña).</p>
                    </div>
                  )}
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => { setShowSessionModal(false); setPendingOverrideToken(null); }} className="px-5 py-2.5 rounded-xl border border-[var(--border)] font-medium hover:bg-[var(--muted)]">Cancelar</button>
                    <button type="submit" className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2">
                      <Check size={18} /> {pendingSession?.id ? 'Guardar Edición' : 'Continuar a Firma'}
                    </button>
                  </div>
                </div>
              </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* MODAL: FIRMA / OVERRIDE */}
      <AnimatePresence>
        {showSignatureModal && (
          <Modal onClose={handleSignatureModalClose} className="w-full max-w-sm p-8 rounded-3xl text-center">
              <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/30 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
                {signatureTarget === 'OVERRIDE' ? <Lock size={32} /> : <FileText size={32} />}
              </div>
              <h2 className="text-xl font-bold mb-2">{signatureTarget === 'OVERRIDE' ? 'Autorización Médica' : 'Firma Digital'}</h2>
              <p className="text-sm text-[var(--muted-foreground)] mb-6">{signatureTarget === 'OVERRIDE' ? 'Ingrese credenciales de MÉDICO para desbloquear edición.' : 'Valide su identidad para firmar esta sesión.'}</p>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setAuthError('');
                const fd = new FormData(e.currentTarget);
                const dni = fd.get('sg_dni') as string;
                const pass = fd.get('sg_pass') as string;

                if (signatureTarget === 'OVERRIDE') {
                  // Para "Desbloquear edición" sólo necesitamos validar que sea MÉDICO.
                  // Hacemos un login efímero para validar credenciales y obtener token.
                  const result = await authAPI.login(dni, pass);
                  if (result.error) { setAuthError('Credenciales incorrectas'); return; }
                  const signerUser = result.data!.user;
                  const signerToken = result.data!.access_token;
                  if (signerUser.role !== 'MEDICO') { setAuthError('Sólo un médico puede autorizar esta acción.'); return; }
                  setPendingOverrideToken(signerToken);
                  setShowSignatureModal(false);
                  setSelectedEvolutionTechniques(Array.isArray(pendingSession?.technique) ? [...pendingSession.technique] : []);
                  setShowSessionModal(true);
                } else {
                  // Firma de sesión: server-side, sin swap de tokens.
                  setShowSignatureModal(false);
                  const result = await submitSignedSession(dni, pass);
                  if (result.error) {
                    setAuthError(result.error);
                    setShowSignatureModal(true);
                  }
                }
              }} className="space-y-4 text-left">
                {authError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200 text-center">{authError}</div>}
                <input required name="sg_dni" autoComplete="new-password" data-lpignore="true" data-form-type="other" placeholder="DNI del profesional" className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-center font-medium" />
                <input required type="password" name="sg_pass" autoComplete="new-password" data-lpignore="true" data-form-type="other" placeholder="Contraseña" className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-center font-medium" />
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={handleSignatureModalClose} className="w-full py-3 rounded-xl border border-[var(--border)] font-medium">Cancelar</button>
                  <button type="submit" className="w-full bg-primary-600 dark:bg-primary-500 text-white font-bold py-3 rounded-xl shadow-lg">Validar</button>
                </div>
              </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* SUCCESS OVERLAY */}
      <AnimatePresence>
        {showSuccessOverlay && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { delay: 1, duration: 1 } }} className="absolute inset-0 bg-emerald-50/90 dark:bg-emerald-950/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.5, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 1.1, opacity: 0, y: -50 }} transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }} className="relative z-10 flex flex-col items-center text-center bg-[var(--card)]/95 backdrop-blur-xl p-10 rounded-2xl shadow-2xl border border-[var(--border)] max-w-sm w-full">
              <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', bounce: 0.6, delay: 0.2 }} className="relative w-20 h-20 bg-emerald-100/40 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6">
                <Sparkles size={18} className="absolute -top-1.5 -right-1.5 text-amber-500 animate-pulse" />
                <Check size={36} strokeWidth={3} className="relative z-10 animate-bounce" style={{ animationDuration: '2s' }} />
              </motion.div>
              <h2 className="text-2xl font-black text-[var(--foreground)] mb-1">¡Buen Trabajo!</h2>
              <p className="text-[var(--muted-foreground)] text-lg font-medium mb-6">{successSignerName}</p>
              <p className="text-emerald-950 dark:text-emerald-300 font-extrabold bg-emerald-100 dark:bg-emerald-950/45 px-5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800/40 w-full text-sm">Atención registrada con éxito</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE SUCCESS */}
      <AnimatePresence>
        {showDeleteSuccessOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 isolate">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-red-950/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.1, opacity: 0 }} transition={{ type: 'spring', bounce: 0.5 }} className="relative z-10 flex flex-col items-center text-center bg-[var(--card)]/90 backdrop-blur-lg p-10 rounded-3xl shadow-2xl border border-[var(--border)] max-w-sm w-full">
              <div className="w-24 h-24 bg-gradient-to-tr from-red-100 to-rose-50 dark:from-red-900/40 dark:to-rose-900/20 text-red-500 rounded-full flex items-center justify-center mb-8"><Trash2 size={48} strokeWidth={3} /></div>
              <h2 className="text-3xl font-black text-red-900 dark:text-red-100 mb-3">Eliminado</h2>
              <p className="text-red-600 dark:text-red-400 font-semibold bg-red-100/50 dark:bg-red-900/30 px-5 py-2.5 rounded-xl border border-red-200/50 dark:border-red-800/40 w-full">La evaluación ha sido eliminada con éxito</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ZOOM MODAL */}
      <AnimatePresence>
        {zoomedImage && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md select-none">
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10 text-white">
              <div className="flex items-center gap-2"><ImageIcon className="text-primary-400" size={18} /><span className="text-sm font-bold">Imagen de Referencia Clínica</span></div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-neutral-900/90 border border-neutral-800 rounded-xl px-2.5 py-1.5 gap-2 shadow-lg backdrop-blur-xl">
                  <button type="button" onClick={() => setZoomScale(s => Math.max(0.25, s - 0.25))} className="p-1 px-2 text-xs font-black rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"><Minus size={14} /></button>
                  <span className="text-xs font-bold font-mono min-w-[45px] text-center">{Math.round(zoomScale * 100)}%</span>
                  <button type="button" onClick={() => setZoomScale(s => Math.min(5, s + 0.25))} className="p-1 px-2 text-xs font-black rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"><Plus size={14} /></button>
                  <div className="w-px h-4 bg-neutral-800" />
                  <button type="button" onClick={() => { setZoomScale(1); setZoomPosition({ x: 0, y: 0 }); }} className="p-1 text-xs font-bold rounded-lg hover:bg-neutral-800 transition-colors text-primary-400 cursor-pointer">Resetear</button>
                </div>
                <button type="button" onClick={() => { setZoomedImage(null); setZoomScale(1); setZoomPosition({ x: 0, y: 0 }); }} className="p-2.5 bg-neutral-900/90 border border-neutral-800 hover:bg-red-600 hover:border-red-500 text-white rounded-xl shadow-lg transition-all cursor-pointer"><X size={18} /></button>
              </div>
            </div>
            <div className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing p-4"
              onMouseDown={e => { e.preventDefault(); setIsDraggingZoom(true); setDragStartZoom({ x: e.clientX - zoomPosition.x, y: e.clientY - zoomPosition.y }); }}
              onMouseMove={e => { if (!isDraggingZoom) return; setZoomPosition({ x: e.clientX - dragStartZoom.x, y: e.clientY - dragStartZoom.y }); }}
              onMouseUp={() => setIsDraggingZoom(false)} onMouseLeave={() => setIsDraggingZoom(false)}
              onWheel={e => setZoomScale(s => Math.min(5, Math.max(0.25, s + (e.deltaY < 0 ? 0.15 : -0.15))))}>
              <motion.img initial={{ scale: 0.9, opacity: 0 }} animate={{ opacity: 1 }} style={{ transform: `translate(${zoomPosition.x}px, ${zoomPosition.y}px) scale(${zoomScale})`, transition: isDraggingZoom ? 'none' : 'transform 0.1s ease-out' }} src={zoomedImage} className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl shadow-2xl select-none pointer-events-none border border-neutral-800/40" alt="Médica Detallada" referrerPolicy="no-referrer" />
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-neutral-950/80 px-5 py-2.5 border border-neutral-800 text-neutral-400 rounded-full text-xs font-semibold shadow-2xl backdrop-blur-md pointer-events-none">💡 Arrastra para mover • Rueda del mouse para zoom</div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const HistorySuccessToast = ({ show }: { show: boolean }) => (
  <AnimatePresence>
    {show && (
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px]" />
        <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] flex flex-col items-center gap-6 bg-[var(--card)] p-10 rounded-[2.5rem] shadow-2xl border border-[var(--border)] text-center min-w-[320px]">
          <div className="w-20 h-20 bg-secondary-50 dark:bg-secondary-900/40 text-secondary-500 rounded-full flex items-center justify-center shadow-lg"><ShieldCheck size={40} strokeWidth={2.5} /></div>
          <div><h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Registro Seguro</h3><p className="text-[var(--muted-foreground)] font-medium">El tratamiento ha sido guardado exitosamente en el historial del paciente.</p></div>
          <div className="flex items-center gap-2 text-secondary-600 dark:text-secondary-400 font-bold bg-secondary-50 dark:bg-secondary-900/30 px-4 py-2 rounded-xl text-sm"><Check size={16} strokeWidth={3} /> Operación Exitosa</div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
