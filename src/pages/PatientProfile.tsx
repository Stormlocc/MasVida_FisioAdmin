import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Patient, ClinicalHistory, SessionRecord, User, InvasiveProcedure } from '../lib/types';
import { apiService } from '../lib/api';
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

const calculateAge = (birthDate?: string) => {
  if (!birthDate) return 'Edad no registrada';
  const age = differenceInYears(new Date(), new Date(birthDate));
  return `${age} años`;
};

const CIE10_EXAMPLES = [
  { code: 'M54.5', desc: 'Lumbago no especificado' },
  { code: 'M54.4', desc: 'Lumbago con ciática' },
  { code: 'M79.1', desc: 'Mialgia' },
  { code: 'M25.5', desc: 'Dolor en articulación' },
  { code: 'M53.2', desc: 'Inestabilidad de la columna vertebral' },
  { code: 'M15.9', desc: 'Poliartrosis, no especificada' },
  { code: 'S33.5', desc: 'Esguince y torcedura de la columna lumbar' },
];

const TECHNIQUES_OPTIONS = ['Masoterapia', 'Crioterapia', 'Electroterapia', 'Kinesioterapia', 'Magnetoterapia', 'Termoterapia'];

const normalizeSearchText = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const levenshtein = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const fuzzyMatchCie10 = (query: string, code: string, desc: string) => {
  const q = normalizeSearchText(query);
  const c = normalizeSearchText(code);
  const d = normalizeSearchText(desc);
  
  if (c.includes(q) || d.includes(q)) return true;
  
  const qWords = q.split(/\s+/).filter(Boolean);
  const dWords = d.split(/\s+/).filter(Boolean);
  
  if (qWords.length === 0) return true;

  // all query words must match somewhere
  return qWords.every(qw => {
    if (c.includes(qw)) return true;
    return dWords.some(dw => {
      if (dw.includes(qw)) return true;
      if (qw.length <= 3) return false;
      return levenshtein(qw, dw) <= 2;
    });
  });
};

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<ClinicalHistory | null>(null);
  const [allHistories, setAllHistories] = useState<ClinicalHistory[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [invasiveProcedures, setInvasiveProcedures] = useState<InvasiveProcedure[]>([]);
  
  // Modals state
  const [showInvasiveModal, setShowInvasiveModal] = useState(false);
  const [invasiveFormData, setInvasiveFormData] = useState({ procedureName: '', description: '' });
  const [isInvasiveSubmitting, setIsInvasiveSubmitting] = useState(false);
  const [showDeleteIpModal, setShowDeleteIpModal] = useState(false);
  const [ipToDelete, setIpToDelete] = useState<InvasiveProcedure | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeleteHistoryModal, setShowDeleteHistoryModal] = useState(false);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState('');
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureTarget, setSignatureTarget] = useState<'SESSION' | 'OVERRIDE'>('SESSION');
  const [pendingSession, setPendingSession] = useState<Partial<SessionRecord> | null>(null);
  
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<'DATOS' | 'SESIONES'>('DATOS');

  // Edit Patient modal
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);

  // History Multi-step State
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
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isDraggingZoom, setIsDraggingZoom] = useState(false);
  const [dragStartZoom, setDragStartZoom] = useState({ x: 0, y: 0 });
  const [selectedEvolutionTechniques, setSelectedEvolutionTechniques] = useState<string[]>([]);
  const sessionsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of sessions list in history modal
  useEffect(() => {
    if (showHistoryModal && historyModalStep === 2 && sessionsContainerRef.current) {
      const container = sessionsContainerRef.current;
      setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [prescribedSessionsCount, showHistoryModal, historyModalStep]);

  // Success overlay state
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [successSignerName, setSuccessSignerName] = useState('');
  const [showDeleteSuccessOverlay, setShowDeleteSuccessOverlay] = useState(false);
  const [showHistorySuccess, setShowHistorySuccess] = useState(false);
  const [hideNextSession, setHideNextSession] = useState(false);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (patientId: string) => {
    try {
      const p = await apiService.getPatientById(patientId);
      if (p) {
        setPatient(p);
        const allH = await apiService.getHistoriesByPatientId(patientId);
        const sortedHistories = allH.sort((a,b) => b.createdAt - a.createdAt);
        setAllHistories(sortedHistories);
        
        // If we already have a selected history, try to keep it selected if it still exists
        const currHistId = history ? history.id : (sortedHistories.length > 0 ? sortedHistories[0].id : null);
        const selectedHist = sortedHistories.find(h => h.id === currHistId) || (sortedHistories.length > 0 ? sortedHistories[0] : null);
        
        setHistory(selectedHist);
        if (selectedHist) {
          const sessions = await apiService.getSessionsByHistoryId(selectedHist.id);
          setSessions(sessions);
        } else {
          setSessions([]);
        }

        const ips = await apiService.getInvasiveProceduresByPatientId(patientId);
        setInvasiveProcedures(ips);
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
    }
  };

  const handleSelectHistory = (h: ClinicalHistory) => {
    setHistory(h);
    setSessions(db.getSessionsByHistoryId(h.id));
  };

  const handleCreateInvasiveProcedure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !currentUser) return;
    
    setIsInvasiveSubmitting(true);
    
    const newIp: InvasiveProcedure = {
      id: 'ip-' + Math.random().toString(36).substr(2, 9),
      patientId: patient.id,
      historyId: history?.id || undefined,
      doctorId: currentUser.id,
      procedureName: invasiveFormData.procedureName,
      description: invasiveFormData.description,
      signedAt: Date.now()
    };
    
    db.saveInvasiveProcedure(newIp);
    
    // Clear and close
    setInvasiveFormData({ procedureName: '', description: '' });
    setShowInvasiveModal(false);
    setIsInvasiveSubmitting(false);
    
    // Toast and reload
    setShowHistorySuccess(true);
    setTimeout(() => setShowHistorySuccess(false), 3000);
    
    loadData(patient.id);
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
    // Initialize techniques array to the saved array or default empty
    if (history && history.prescribedTechniques && history.prescribedTechniques.length === history.prescribedSessions) {
       setSessionTechniques(history.prescribedTechniques.map(t => Array.isArray(t) ? [...t] : [t]));
       setSessionDescriptions(history.prescribedDescriptions ? [...history.prescribedDescriptions] : Array(currentSessions).fill(''));
       setSessionDates(history.prescribedDates ? [...history.prescribedDates] : Array(currentSessions).fill(''));
    } else {
       setSessionTechniques(Array.from({ length: currentSessions }, () => []));
       setSessionDescriptions(Array(currentSessions).fill(''));
       setSessionDates(Array(currentSessions).fill(''));
    }
    setShowHistoryModal(true);
  };

  const openNewHistoryModal = () => {
    setIsCreatingNewHistory(true);
    setHistoryModalStep(1);
    setHistoryFormData({
      cie10Code: '',
      cie10Description: '',
      anamnesis: '',
      antecedentes: '',
      physicalExam: '',
      imageUrl: ''
    });
    setPrescribedSessionsCount(1);
    setSessionTechniques(Array.from({ length: 1 }, () => []));
    setSessionDescriptions(Array(1).fill(''));
    setSessionDates(Array(1).fill(''));
    setShowHistoryModal(true);
  };

  if (!patient) return <div className="p-8">Cargando...</div>;

  const remainingSessions = history ? (history.prescribedSessions - sessions.length) : 0;

  const handleSessionsChange = (val: number) => {
    if (val < 1 || val > 60) return;
    setPrescribedSessionsCount(val);
    setSessionTechniques(prev => {
      const next = [...prev];
      while(next.length < val) next.push([]);
      return next.slice(0, val);
    });
    setSessionDescriptions(prev => {
      const next = [...prev];
      while(next.length < val) next.push('');
      return next.slice(0, val);
    });
    setSessionDates(prev => {
      const next = [...prev];
      while(next.length < val) next.push('');
      return next.slice(0, val);
    });
  };

  const removeSession = (index: number) => {
    if (prescribedSessionsCount <= 1) return;
    setPrescribedSessionsCount(prev => prev - 1);
    setSessionTechniques(prev => prev.filter((_, i) => i !== index));
    setSessionDescriptions(prev => prev.filter((_, i) => i !== index));
    setSessionDates(prev => prev.filter((_, i) => i !== index));
  };

  const handleNextStepHistory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!historyFormData.cie10Code || !CIE10_EXAMPLES.find(ex => ex.code === historyFormData.cie10Code)) {
      setCie10Error('Seleccione un diagnóstico válido de las sugerencias (ej: M54.5)');
      setIsCie10Shaking(true);
      setTimeout(() => setIsCie10Shaking(false), 500);
      return;
    }
    setCie10Error('');
    setHistoryModalStep(2);
  };

  const handleSaveHistory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (prescribedSessionsCount < 1) return;
    const newHist: ClinicalHistory = {
      id: (history && !isCreatingNewHistory) ? history.id : `h-${Date.now()}`,
      patientId: patient.id,
      doctorId: currentUser!.id,
      ...historyFormData,
      prescribedSessions: prescribedSessionsCount,
      prescribedTechniques: sessionTechniques,
      prescribedDescriptions: sessionDescriptions,
      prescribedDates: sessionDates,
      createdAt: (history && !isCreatingNewHistory) ? history.createdAt : Date.now(),
    };
    db.saveHistory(newHist);
    setShowHistoryModal(false);
    loadData(patient.id);
    setHistory(newHist); 
    setShowHistorySuccess(true);
    setTimeout(() => setShowHistorySuccess(false), 3000);
  };

  const openDeleteHistoryModal = () => {
    setDeleteConfirmValue('');
    setShowDeleteHistoryModal(true);
  };

  const confirmDeleteHistory = () => {
    if (!history) return;
    db.deleteHistory(history.id);
    setShowDeleteHistoryModal(false);
    loadData(patient.id);
    setShowDeleteSuccessOverlay(true);
    setTimeout(() => {
      setShowDeleteSuccessOverlay(false);
    }, 3000);
  };

  const confirmDeleteInvasiveProcedure = () => {
    if (!ipToDelete || !patient) return;
    db.deleteInvasiveProcedure(ipToDelete.id);
    setShowDeleteIpModal(false);
    setIpToDelete(null);
    loadData(patient.id);
  };

  const handlePatientEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const updatedPatient: Patient = {
      ...patient,
      firstName: fd.get('firstName') as string,
      lastName: fd.get('lastName') as string,
      dni: fd.get('dni') as string,
      phone: fd.get('phone') as string,
      email: fd.get('email') as string,
      address: fd.get('address') as string,
      birthDate: fd.get('birthDate') as string,
      gender: fd.get('gender') as string,
    };
    db.savePatient(updatedPatient);
    setShowEditPatientModal(false);
    loadData(patient.id);
  };

  const handlePrepareSession = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPendingSession({
      patientId: patient.id,
      historyId: history!.id,
      technique: selectedEvolutionTechniques,
      description: fd.get('description') as string,
      attentionDescription: fd.get('attentionDescription') as string,
      isEdited: false
    });
    setShowSessionModal(false);
    setSignatureTarget('SESSION');
    setShowSignatureModal(true);
  };

  const handleSignatureSuccess = (signer: User) => {
    setShowSignatureModal(false);
    
    if (signatureTarget === 'SESSION' && pendingSession) {
      // Create new session
      const newSess: SessionRecord = {
        ...pendingSession,
        id: `s-${Date.now()}`,
        therapistId: signer.id,
        signedAt: Date.now(),
      } as SessionRecord;
      
      db.saveSession(newSess);
      
      // Update patient status if finished
      if (remainingSessions - 1 <= 0) {
        db.savePatient({ ...patient, status: 'FINALIZADO' });
      } else if (patient.status !== 'ACTIVO') {
        db.savePatient({ ...patient, status: 'ACTIVO' });
      }
      
      setPendingSession(null);
      loadData(patient.id);

      // Trigger success animation
      setSuccessSignerName(signer.fullName);
      setShowSuccessOverlay(true);
      setHideNextSession(true);

      setTimeout(() => {
        setShowSuccessOverlay(false);
        // Delay showing the next session a little longer after the overlay fades
        setTimeout(() => setHideNextSession(false), 2000);
      }, 4000);
      
    } 
    else if (signatureTarget === 'OVERRIDE' && pendingSession) {
      // It's an edit
      const updatedSess: SessionRecord = {
        ...pendingSession,
        isEdited: true,
        editedBy: signer.id,
        editDate: Date.now()
      } as SessionRecord;
      db.saveSession(updatedSess);
      setPendingSession(null);
      loadData(patient.id);
    }
  };

  const handleSignatureModalClose = () => {
    setShowSignatureModal(false);
    setAuthError('');
    if (signatureTarget === 'SESSION') {
      setShowSessionModal(true);
      setSelectedEvolutionTechniques(pendingSession?.technique ? (Array.isArray(pendingSession.technique) ? [...pendingSession.technique] : [pendingSession.technique]) : (history?.prescribedTechniques[sessions.length] || []));
    }
  };

  const initEditSession = (sess: SessionRecord) => {
    setPendingSession(sess);
    setShowSessionModal(true);
    setSelectedEvolutionTechniques(Array.isArray(sess.technique) ? [...sess.technique] : [sess.technique]);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <HistorySuccessToast show={showHistorySuccess} />
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 mb-6 flex flex-col md:flex-row md:items-start justify-between gap-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 p-4 opacity-[0.03] pointer-events-none">
          {patient.gender === 'MASCULINO' ? (
            <MaleIcon className="w-60 h-60" />
          ) : patient.gender === 'FEMENINO' ? (
            <FemaleIcon className="w-60 h-60" />
          ) : (
            <UserIcon size={240} />
          )}
        </div>
        
        <div className="flex items-start gap-5 relative z-10">
          <button onClick={() => navigate(-1)} className="p-2 shrink-0 bg-[var(--background)] border border-[var(--border)] rounded-full hover:bg-[var(--muted)] transition-colors mt-1">
            <ArrowLeft size={18} />
          </button>
          
          <div>
            <div className="flex items-center gap-3 mb-1 cursor-default">
              <h1 className="text-2xl font-bold">
                Paciente: {patient.firstName} {patient.lastName}
              </h1>
              <span className={`text-[10px] uppercase font-black px-2.5 py-1.5 rounded-full tracking-wider border ${patient.status === 'ACTIVO' ? 'bg-secondary-50 text-secondary-600 border-secondary-200 dark:bg-secondary-500/10 dark:border-secondary-500/20' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>
                {patient.status}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3 mb-2 text-xs text-[var(--foreground)] font-bold">
              <div className="flex items-center gap-1.5 bg-[var(--muted)]/50 px-3 py-1.5 rounded-lg border border-[var(--border)]">
                <UserIcon size={14} className="text-primary-500" />
                <span>{calculateAge(patient.birthDate)} <span className="opacity-40 ml-1 mr-1">•</span> {patient.gender || '-'}</span>
              </div>
              
              <div className="flex items-center gap-1.5 bg-[var(--muted)]/50 px-3 py-1.5 rounded-lg border border-[var(--border)]">
                <CreditCard size={14} className="text-primary-500" />
                <span>DNI: {patient.dni}</span>
              </div>

              {patient.phone && (
                <div className="flex items-center gap-1.5 bg-[var(--muted)]/50 px-3 py-1.5 rounded-lg border border-[var(--border)]">
                  <Phone size={14} className="text-primary-500" />
                  <span>{patient.phone}</span>
                </div>
              )}
              
              {patient.email && (
                <div className="flex items-center gap-1.5 bg-[var(--muted)]/50 px-3 py-1.5 rounded-lg border border-[var(--border)]">
                  <Mail size={14} className="text-primary-500" />
                  <span>{patient.email}</span>
                </div>
              )}
              
              {patient.address && (
                <div className="flex items-center gap-1.5 bg-[var(--muted)]/50 px-3 py-1.5 rounded-lg border border-[var(--border)]">
                  <MapPin size={14} className="text-primary-500" />
                  <span className="max-w-[200px] truncate" title={patient.address}>{patient.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {(currentUser?.role === 'MEDICO' || currentUser?.role === 'ADMISION') && (
          <button onClick={() => setShowEditPatientModal(true)} className="flex items-center gap-2 text-sm font-bold text-primary-500 hover:text-primary-600 bg-[var(--card)] hover:bg-[var(--muted)] px-4 py-2.5 rounded-xl transition-colors shrink-0 relative z-10 border border-[var(--border)] shadow-sm">
            <Edit3 size={16} /> Editar Datos
          </button>
        )}
      </div>

      <div className="mb-6 flex gap-2 border-b border-[var(--border)] overflow-x-auto relative z-10">
        <button
          onClick={() => setActiveTab('DATOS')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'DATOS' 
              ? 'border-primary-500 text-primary-500' 
              : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Resumen Clínico
        </button>
        <button
          onClick={() => setActiveTab('SESIONES')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'SESIONES' 
              ? 'border-primary-500 text-primary-500' 
              : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Historial de Atención
          <span className="bg-[var(--muted)] text-[var(--foreground)] text-xs px-2 py-0.5 rounded-full font-bold">
            {sessions.length}
          </span>
        </button>
      </div>

      <div className="mt-6">
        
        {/* Tab: Resumen Clínico */}
        {activeTab === 'DATOS' && (
          <div className="space-y-6 max-w-5xl mx-auto items-start">
          
          <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
            
            {/* LISTA DE HISTORIALES */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 flex flex-col h-fit max-h-[400px] md:h-[550px] md:max-h-none">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-base font-bold flex items-center gap-2"><ClipboardList size={18} className="text-primary-500"/> Historiales</h2>
                 {currentUser?.role === 'MEDICO' && (
                    <button 
                       onClick={() => openNewHistoryModal()}
                       className="bg-primary-500 hover:bg-primary-600 text-white p-2 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                       title="Nuevo Historial"
                    >
                      <Plus size={16} /> <span className="text-xs font-bold px-1">NUEVO</span>
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
                      <div 
                        key={h.id} 
                        onClick={() => handleSelectHistory(h)}
                        className={`p-3 cursor-pointer rounded-xl border transition-all duration-300 ${isSelected ? 'bg-primary-50/40 dark:bg-primary-900/5 border-primary-200 dark:border-primary-800/30 shadow-sm ring-1 ring-primary-500/20 scale-[1.01]' : 'bg-transparent border-[var(--border)] hover:bg-[var(--muted)]/50'}`}
                      >
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

            {/* DETALLE DEL HISTORIAL SELECCIONADO */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 flex flex-col min-h-[550px]">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2"><FileText size={18} className="text-primary-500"/> Detalle de Evaluación Clínica</h2>
                <div className="flex items-center gap-2">
                  {currentUser?.role === 'MEDICO' && history && (
                    <>
                      <button onClick={openHistoryModal} className="text-primary-500 hover:text-primary-600 bg-[var(--card)] hover:bg-[var(--muted)] shadow-sm border border-[var(--border)] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
                        <Edit3 size={14} /> Editar
                      </button>
                      <button onClick={openDeleteHistoryModal} className="text-red-500 hover:text-red-600 bg-[var(--card)] hover:bg-red-50 dark:hover:bg-red-950/20 shadow-sm border border-[var(--border)] px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {!history ? (
                <div className="text-center py-12 text-[var(--muted-foreground)] text-sm border border-dashed border-[var(--border)] rounded-2xl my-auto">
                  Seleccione un historial o cree uno nuevo.
                  {currentUser?.role === 'MEDICO' && (
                    <button onClick={openNewHistoryModal} className="mt-4 bg-primary-500 text-white px-4 py-2 rounded-xl font-medium block mx-auto hover:bg-primary-600 transition-colors">
                      Crear Evaluación Inicial
                    </button>
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
                      <p className="bg-[var(--muted)]/50 p-4 rounded-xl border border-[var(--border)] text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                        {history.anamnesis || 'No registrado'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[var(--muted-foreground)] text-xs font-semibold mb-1.5 uppercase tracking-wider">Examen Físico</p>
                      <p className="bg-[var(--muted)]/50 p-4 rounded-xl border border-[var(--border)] text-[var(--foreground)] leading-relaxed whitespace-pre-wrap h-full">
                        {history.physicalExam || 'No registrado'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[var(--muted-foreground)] text-xs font-semibold mb-1.5 uppercase tracking-wider">Antecedentes</p>
                      <p className="bg-[var(--muted)]/50 p-4 rounded-xl border border-[var(--border)] text-[var(--foreground)] leading-relaxed whitespace-pre-wrap h-full">
                        {history.antecedentes || 'No registrado'}
                      </p>
                    </div>

                    {history.imageUrl && (
                      <div className="md:col-span-2 mt-4">
                        <p className="text-[var(--muted-foreground)] text-xs font-semibold mb-1.5 uppercase tracking-wider">Imagen de Referencia / Diagnóstica</p>
                        <div className="relative group overflow-hidden border border-[var(--border)] rounded-2xl bg-black/5 dark:bg-white/5 p-2 flex items-center justify-center max-w-lg mx-auto shadow-sm">
                          <img 
                            src={history.imageUrl} 
                            alt="Imagen de referencia médica" 
                            className="max-h-60 object-contain rounded-xl transition-all duration-300 group-hover:scale-[1.02] cursor-zoom-in"
                            onClick={() => {
                              setZoomedImage(history.imageUrl || null);
                              setZoomScale(1);
                              setZoomPosition({ x: 0, y: 0 });
                            }}
                            referrerPolicy="no-referrer"
                          />
                          <button 
                            type="button" 
                            onClick={() => {
                              setZoomedImage(history.imageUrl || null);
                              setZoomScale(1);
                              setZoomPosition({ x: 0, y: 0 });
                            }}
                            className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 border border-white/10 opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <ZoomIn size={14} /> Ampliar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t border-[var(--border)] pt-4 mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)] font-semibold uppercase tracking-wider mb-1">Plan de Tratamiento</p>
                      <p className="font-medium text-[var(--foreground)] flex items-center gap-2">
                        <Activity size={16} className="text-primary-500" /> {history.prescribedSessions} sesiones programadas
                      </p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('SESIONES')}
                      className="text-primary-500 hover:text-primary-600 font-medium text-sm flex items-center gap-1 group"
                    >
                      Ver sesiones <ArrowLeft size={16} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        )}

        {/* Tab: Historial de Atención */}
        {activeTab === 'SESIONES' && (
          <div className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-[var(--border)] pb-6">
              <div className="w-full sm:w-auto">
                <h2 className="text-xl font-bold flex items-center gap-2"><Activity size={22} className="text-primary-500"/> Plan de Sesiones</h2>
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
                  <button 
                    onClick={() => setShowInvasiveModal(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center shadow-orange-600/10"
                  >
                    <Syringe size={16} />
                    Procedimiento Invasivo
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
                      <button 
                        onClick={openNewHistoryModal}
                        className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl font-medium text-xs transition-all flex items-center gap-1.5"
                      >
                        <FileText size={14} />
                        Nuevo Paquete
                      </button>
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
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="mb-8 p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl relative overflow-hidden flex flex-col md:flex-row gap-6 md:items-center justify-between shadow-sm"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary-500 rounded-l-2xl" />
                <div className="flex-1 relative z-10">
                  <h3 className="text-lg font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
                    <Sparkles size={22} className="text-secondary-500" /> Sesión de hoy: #{sessions.length + 1}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Técnicas a aplicar</p>
                      <div className="flex flex-wrap gap-1.5">
                        {history.prescribedTechniques[sessions.length] && history.prescribedTechniques[sessions.length].length > 0 ? (
                          history.prescribedTechniques[sessions.length].map((t, idx) => (
                            <span key={idx} className="bg-transparent border border-secondary-300 dark:border-secondary-700/50 text-secondary-600 dark:text-secondary-400 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm font-medium text-[var(--foreground)]">No especificadas</span>
                        )}
                      </div>
                    </div>
                    {history.prescribedDates && history.prescribedDates[sessions.length] && (
                      <div>
                        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Fecha Programada</p>
                        <p className="font-medium text-[var(--foreground)] flex items-center gap-2">
                          <Clock size={16} className="text-secondary-500" />
                          {format(new Date(history.prescribedDates[sessions.length]), 'dd MMM yyyy, HH:mm')}
                        </p>
                      </div>
                    )}
                    {history.prescribedDescriptions && history.prescribedDescriptions[sessions.length] && (
                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Instrucciones Médicas</p>
                        <p className="text-sm font-medium text-[var(--foreground)] bg-[var(--muted)]/50 p-3 rounded-lg border border-[var(--border)]">
                          {history.prescribedDescriptions[sessions.length]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center justify-end w-full md:w-auto relative z-10">
                    <button 
                      onClick={() => { 
                        setPendingSession(null); 
                        setSelectedEvolutionTechniques(history?.prescribedTechniques[sessions.length] || []);
                        setShowSessionModal(true); 
                      }}
                      className="bg-secondary-500 hover:bg-secondary-600 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-md shadow-secondary-500/20 flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                      <Plus size={18} />
                      Registrar Sesión
                    </button>
                </div>
              </motion.div>
            )}

            {/* Unified Clinical Timeline */}
            {(() => {
              const timelineItems = [
                ...sessions.map((s, originalIdx) => ({
                  type: 'SESSION' as const,
                  data: s,
                  date: s.signedAt,
                  sessionNumber: sessions.length - originalIdx
                })),
                ...(invasiveProcedures || []).map(ip => ({
                  type: 'INVASIVE_PROCEDURE' as const,
                  data: ip,
                  date: ip.signedAt,
                  sessionNumber: 0
                }))
              ].sort((a, b) => b.date - a.date);

              if (timelineItems.length === 0) {
                if (history) {
                  return (
                    <div className="text-center py-12 text-[var(--muted-foreground)] border border-dashed border-[var(--border)] rounded-2xl">
                      Aún no hay atenciones (sesiones o procedimientos) registradas para este paciente.
                    </div>
                  );
                }
                return null;
              }

              return (
                <div className="relative pl-4 sm:pl-6 border-l-2 border-primary-100 dark:border-primary-900/30 space-y-8 mt-6">
                  {timelineItems.map((item, idx) => {
                    const isLast = idx === 0;
                    if (item.type === 'SESSION') {
                      const s = item.data;
                      const therapist = db.getUserById(s.therapistId);
                      const sessionNumber = item.sessionNumber;
                      return (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={s.id} 
                          className="relative"
                        >
                          <div className={`absolute -left-[23px] sm:-left-[31px] w-4 h-4 sm:w-5 sm:h-5 rounded-full border-4 border-[var(--card)] ${isLast ? 'bg-primary-500' : 'bg-primary-300'} shadow-sm`} />
                          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:border-primary-300 transition-colors group">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-[var(--muted)] text-[var(--foreground)] font-bold px-2 py-1 rounded-md text-[10px] uppercase tracking-wider shrink-0">
                                  SESIÓN {sessionNumber}
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {Array.isArray(s.technique) ? s.technique.map((t, tIdx) => (
                                    <span key={tIdx} className="bg-transparent border border-sky-300 dark:border-sky-700/50 text-sky-600 dark:text-sky-400 font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider whitespace-nowrap">
                                      {t}
                                    </span>
                                  )) : (
                                    <span className="bg-transparent border border-sky-300 dark:border-sky-700/50 text-sky-600 dark:text-sky-400 font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider whitespace-nowrap">
                                      {s.technique}
                                    </span>
                                  )}
                                </div>
                                {s.isEdited && (
                                  <span className="flex items-center gap-1 text-[10px] text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-md font-medium border border-orange-200 dark:border-orange-800/50 shrink-0">
                                    <Edit3 size={10} /> Editado
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col sm:items-end gap-1 text-[var(--muted-foreground)] text-[10px] font-medium w-full sm:w-auto select-none">
                                <div className="flex items-center sm:justify-end gap-1.5" title="Fecha de consulta (Ejecución)">
                                  <CheckCircle2 size={12} className="text-secondary-500 shrink-0" />
                                  <span className="whitespace-nowrap">{format(new Date(s.signedAt), 'dd MMM yyyy, HH:mm')}</span>
                                </div>
                                {history?.prescribedDates && history.prescribedDates[sessionNumber - 1] && (
                                  <div className="flex items-center sm:justify-end gap-1.5 opacity-70" title="Fecha citada por el médico">
                                    <Clock size={12} className="shrink-0" />
                                    <span className="whitespace-nowrap">Cita: {format(new Date(history.prescribedDates[sessionNumber - 1]), 'dd MMM yyyy, HH:mm')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="mb-4">
                              <p className="text-sm font-semibold text-[var(--foreground)] mb-1">Evolución Clínica</p>
                              <p className="text-sm text-[var(--foreground)] leading-relaxed p-3 bg-[var(--muted)]/40 rounded-xl border border-[var(--border)]">
                                {s.description}
                              </p>
                              {s.attentionDescription && (
                                <div className="mt-3">
                                  <p className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 uppercase tracking-wider">Detalles de Atención</p>
                                  <p className="text-sm text-[var(--foreground)] leading-relaxed p-3 bg-[var(--card)] rounded-xl border border-dashed border-[var(--border)]">
                                    {s.attentionDescription}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 flex-wrap gap-3">
                              <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)] break-words">
                                <CheckCircle2 size={14} className="text-secondary-500 shrink-0" />
                                <span>Firmado por: <span className="font-medium text-[var(--foreground)]">{therapist?.fullName || 'Desconocido'}</span></span>
                              </div>
                              
                              {/* Botón de edición - Solicitará auth override */}
                              <button 
                                onClick={() => {
                                  setPendingSession(s);
                                  setSignatureTarget('OVERRIDE');
                                  setShowSignatureModal(true);
                                }}
                                className="text-[10px] sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1 text-primary-500 font-medium hover:underline"
                              >
                                <Lock size={12} /> Desbloquear
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    } else {
                      const ip = item.data;
                      const doctor = db.getUserById(ip.doctorId);
                      return (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={ip.id} 
                          className="relative"
                        >
                          <div className="absolute -left-[23px] sm:-left-[31px] w-4 h-4 sm:w-5 sm:h-5 rounded-full border-4 border-[var(--card)] bg-orange-500 shadow-sm" />
                          <div className="bg-[var(--card)] border border-orange-200/80 dark:border-orange-950/40 rounded-2xl p-5 hover:border-orange-400 transition-colors group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/[0.02] dark:bg-orange-500/[0.01] rounded-bl-full pointer-events-none" />
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-[var(--muted)] text-[var(--foreground)] font-bold px-2 py-1 rounded-md text-[10px] uppercase tracking-wider shrink-0">
                                  PROCEDIMIENTO
                                </span>
                                <div className="flex flex-wrap items-center">
                                  <span className="text-orange-600 dark:text-orange-400 font-black text-[11px] uppercase tracking-wider whitespace-nowrap">
                                    {ip.procedureName}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col sm:items-end gap-1 text-[var(--muted-foreground)] text-[10px] font-medium w-full sm:w-auto select-none">
                                <div className="flex items-center sm:justify-end gap-1.5" title="Fecha de ejecución">
                                  <Clock size={12} className="text-orange-500 shrink-0" />
                                  <span className="whitespace-nowrap">{format(new Date(ip.signedAt), 'dd MMM yyyy, HH:mm')}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mb-4">
                              <p className="text-sm font-semibold text-[var(--foreground)] mb-1">Descripción y Hallazgos</p>
                              <p className="text-sm text-[var(--foreground)] leading-relaxed p-3 bg-orange-50/10 dark:bg-orange-950/5 rounded-xl border border-orange-100/30 dark:border-orange-900/10 whitespace-pre-wrap">
                                {ip.description}
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 flex-wrap gap-3">
                              <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)] break-words">
                                <ShieldCheck size={14} className="text-orange-500 shrink-0" />
                                <span>Firmado por Médico: <span className="font-extrabold text-[var(--foreground)]">{doctor?.fullName || 'Dr. Desconocido'}</span></span>
                              </div>
                              {currentUser?.role === 'MEDICO' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIpToDelete(ip);
                                    setShowDeleteIpModal(true);
                                  }}
                                  className="text-[10px] sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1 text-red-500 font-medium hover:underline cursor-pointer whitespace-nowrap"
                                  title="Eliminar procedimiento invasivo"
                                >
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

      {/* MODAL: EDITAR PACIENTE (Sólo Médico) */}
      <AnimatePresence>
        {showEditPatientModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--card)] p-6 rounded-3xl w-full max-w-2xl shadow-xl border border-[var(--border)] my-auto"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><UserIcon className="text-primary-500"/> Editar Paciente</h2>
              <form onSubmit={handlePatientEdit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">DNI</label>
                    <input required name="dni" defaultValue={patient.dni} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Teléfono</label>
                    <input required name="phone" defaultValue={patient.phone} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Nombres</label>
                    <input required name="firstName" defaultValue={patient.firstName} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Apellidos</label>
                    <input required name="lastName" defaultValue={patient.lastName} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium mb-1.5">Email</label>
                    <input type="email" name="email" defaultValue={patient.email} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium mb-1.5">Fecha de Nacimiento</label>
                    <input required type="date" name="birthDate" defaultValue={patient.birthDate} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium mb-1.5">Sexo</label>
                    <select required name="gender" defaultValue={patient.gender || ''} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="" disabled>Seleccione...</option>
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMENINO">Femenino</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Dirección</label>
                    <input required name="address" placeholder="Departamento, Provincia, Distrito" defaultValue={patient.address} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                  <button type="button" onClick={() => setShowEditPatientModal(false)} className="px-5 py-2.5 rounded-xl border border-[var(--border)] font-medium hover:bg-[var(--muted)] transition-colors">Cancelar</button>
                  <button type="submit" className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors">Guardar Cambios</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DELETE HISTORIAL CLÍNICO */}
      <AnimatePresence>
        {showDeleteHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--card)] p-6 rounded-3xl w-full max-w-sm shadow-xl border border-[var(--border)] my-auto text-center"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold mb-2 text-[var(--foreground)]">Eliminar Evaluación</h2>
              <p className="text-[var(--muted-foreground)] text-sm mb-4">
                Para confirmar la eliminación, ingrese el número de sesiones restantes (<b>{remainingSessions}</b>):
              </p>
              <input 
                type="text" 
                value={deleteConfirmValue}
                onChange={(e) => setDeleteConfirmValue(e.target.value)}
                autoFocus
                placeholder={`Escriba ${remainingSessions}`}
                className="w-full text-center px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-red-500 mb-6 bg-[var(--muted)]/50 font-bold"
              />
              <div className="flex gap-3 w-full">
                <button type="button" onClick={() => setShowDeleteHistoryModal(false)} className="flex-1 py-3 bg-[var(--muted)] hover:bg-[var(--muted-foreground)]/20 rounded-xl font-medium transition-colors">
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={confirmDeleteHistory} 
                  disabled={deleteConfirmValue !== remainingSessions.toString()}
                  className="flex-1 py-3 bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-md shadow-red-500/20"
                >
                  Sí, eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DELETE PROCEDIMIENTO INVASIVO */}
      <AnimatePresence>
        {showDeleteIpModal && ipToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--card)] p-6 rounded-3xl w-full max-w-sm shadow-xl border border-[var(--border)] my-auto text-center"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold mb-2 text-[var(--foreground)]">Eliminar Procedimiento</h2>
              <p className="text-[var(--muted-foreground)] text-sm mb-6">
                ¿Está seguro de que desea eliminar permanentemente el procedimiento invasivo <b>"{ipToDelete.procedureName}"</b>? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowDeleteIpModal(false);
                    setIpToDelete(null);
                  }} 
                  className="flex-1 py-3 bg-[var(--muted)] hover:bg-[var(--muted-foreground)]/20 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={confirmDeleteInvasiveProcedure} 
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-md shadow-red-500/20 cursor-pointer"
                >
                  Sí, eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: HISTORIAL CLÍNICO (Sólo Médico) */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--card)] p-8 rounded-[2.5rem] w-full max-w-4xl shadow-2xl border border-[var(--border)] my-auto"
            >
              
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="text-primary-500"/> {(history && !isCreatingNewHistory) ? 'Editar' : 'Nuevo'} Historial Clínico</h2>
                <div className="flex gap-2 items-center text-sm font-black">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${historyModalStep === 1 ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]'}`}>1</span>
                  <div className="w-4 h-1 rounded-full bg-[var(--border)]" />
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${historyModalStep === 2 ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]'}`}>2</span>
                </div>
              </div>

              {historyModalStep === 1 ? (
                <form onSubmit={handleNextStepHistory} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* CIE-10 Search */}
                    <div className="md:col-span-2 space-y-4">
                       <h3 className="text-sm font-bold text-primary-500 uppercase tracking-widest flex items-center gap-2 border-b border-[var(--border)] pb-2">
                         <Stethoscope size={16} /> Diagnóstico Médico
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                          <div className="md:col-span-1">
                             <label className="block text-sm font-medium mb-1.5 opacity-70">Código CIE-10</label>
                             <input 
                               readOnly
                               name="cie10Code" 
                               value={historyFormData.cie10Code || ''} 
                               className="w-full px-4 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-xl outline-none font-medium opacity-70 cursor-not-allowed" 
                               placeholder="Ej. M54.5" 
                             />
                          </div>
                          <div className="md:col-span-2">
                             <label className="block text-sm font-medium mb-1.5 focus-within:text-primary-500 transition-colors">Descripción Diagnóstico</label>
                             <motion.div 
                               animate={isCie10Shaking ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }} 
                               transition={{ duration: 0.4 }}
                               className="relative"
                             >
                               <input 
                                 required 
                                 spellCheck="false"
                                 autoComplete="off"
                                 autoCorrect="off"
                                 autoCapitalize="off"
                                 data-form-type="other"
                                 name={Math.random().toString(36).substring(7)}
                                 value={historyFormData.cie10Description || ''} 
                                 onChange={(e) => {
                                   const val = e.target.value;
                                   setHistoryFormData({ ...historyFormData, cie10Description: val });
                                   setCie10Search(val);
                                   setCie10Error('');
                                   setShowCie10Options(true);
                                 }} 
                                 onFocus={() => setShowCie10Options(true)}
                                 onBlur={() => setTimeout(() => setShowCie10Options(false), 200)}
                                 className={`w-full pl-10 pr-4 py-2.5 bg-transparent border ${cie10Error ? 'border-red-500 focus:ring-red-500' : 'border-[var(--border)] focus:ring-primary-500'} rounded-xl outline-none focus:ring-2`} 
                                 placeholder="Buscar diagnóstico o código..." 
                               />
                               <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                               {cie10Error && (
                                 <p className="absolute top-full left-0 mt-1 text-red-500 text-[10px] font-medium ml-1">
                                   {cie10Error}
                                 </p>
                               )}
                               
                               {/* Auto-complete Dropdown */}
                               <AnimatePresence>
                                 {showCie10Options && (
                                   <motion.div 
                                     initial={{ opacity: 0, y: 5 }} 
                                     animate={{ opacity: 1, y: 0 }} 
                                     exit={{ opacity: 0, y: 5 }}
                                     className="absolute top-full left-0 right-0 mt-2 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto"
                                   >
                                     {CIE10_EXAMPLES.filter(ex => fuzzyMatchCie10(cie10Search, ex.code, ex.desc)).length > 0 ? (
                                       CIE10_EXAMPLES.filter(ex => fuzzyMatchCie10(cie10Search, ex.code, ex.desc)).map(ex => (
                                         <button 
                                           key={ex.code} 
                                           type="button"
                                           onClick={() => {
                                             setHistoryFormData({ ...historyFormData, cie10Code: ex.code, cie10Description: ex.desc });
                                             setShowCie10Options(false);
                                           }}
                                           className="w-full text-left px-4 py-2 hover:bg-primary-50 dark:hover:bg-primary-900/40 hover:text-primary-600 transition-colors border-b border-[var(--border)] last:border-0"
                                         >
                                           <div className="font-bold">{ex.desc}</div>
                                           <div className="text-xs text-[var(--muted-foreground)]">Código CIE-10: {ex.code}</div>
                                         </button>
                                       ))
                                     ) : (
                                       <div className="px-4 py-3 text-sm text-[var(--muted-foreground)] text-center">Sin resultados</div>
                                     )}
                                   </motion.div>
                                 )}
                                </AnimatePresence>
                             </motion.div>
                          </div>
                       </div>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                      <h3 className="text-sm font-bold text-primary-500 uppercase tracking-widest flex items-center gap-2 border-b border-[var(--border)] pb-2">
                         <ClipboardList size={16} /> Evaluación Clínica
                       </h3>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1.5 focus-within:text-primary-500 transition-colors">Anamnesis (Motivo de consulta y síntomas vitales)</label>
                        <textarea required name="anamnesis" rows={4} value={historyFormData.anamnesis} onChange={(e) => setHistoryFormData({ ...historyFormData, anamnesis: e.target.value })} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500 resize-none leading-relaxed" placeholder="Describa el motivo de consulta detalladamente..." />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1.5 focus-within:text-primary-500 transition-colors">Examen Físico (Postura, ROM, fuerza, palpación)</label>
                        <textarea required name="physicalExam" rows={4} value={historyFormData.physicalExam} onChange={(e) => setHistoryFormData({ ...historyFormData, physicalExam: e.target.value })} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500 resize-none leading-relaxed" placeholder="Hallazgos de la evaluación física..." />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1.5 focus-within:text-primary-500 transition-colors">Antecedentes (Enfermedades, cirugías, alergias)</label>
                        <textarea required name="antecedentes" rows={4} value={historyFormData.antecedentes} onChange={(e) => setHistoryFormData({ ...historyFormData, antecedentes: e.target.value })} className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500 resize-none leading-relaxed" placeholder="Describa afecciones previas..." />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1.5 focus-within:text-primary-500 transition-colors">Imagen de Referencia o Diagnóstica (Opcional)</label>
                        <div 
                          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 transition-all relative overflow-hidden group min-h-[160px] ${
                            isHistoryDragging 
                              ? 'border-primary-500 bg-primary-500/5 dark:bg-primary-500/10 scale-[0.99]' 
                              : 'border-[var(--border)] bg-[var(--muted)]/20 hover:border-primary-400 dark:hover:border-primary-800'
                          }`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsHistoryDragging(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setIsHistoryDragging(false);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsHistoryDragging(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setHistoryFormData({ ...historyFormData, imageUrl: event.target.result as string });
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        >
                          {historyFormData.imageUrl ? (
                            <div className="relative w-full max-h-72 overflow-hidden rounded-xl flex items-center justify-center bg-black/5 dark:bg-white/5 p-2">
                              <img 
                                src={historyFormData.imageUrl} 
                                alt="Vista previa" 
                                className="max-h-64 object-contain rounded-lg shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                              <button 
                                type="button" 
                                onClick={() => setHistoryFormData({ ...historyFormData, imageUrl: '' })}
                                className="absolute top-3 right-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all transform hover:scale-110 flex items-center justify-center z-10"
                                title="Eliminar imagen"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer w-full text-center flex flex-col items-center justify-center py-4 select-none">
                              <Upload size={32} className={`mb-2 transition-colors duration-200 ${isHistoryDragging ? 'text-primary-500 animate-bounce' : 'text-[var(--muted-foreground)] group-hover:text-primary-500'}`} />
                              <span className="text-sm font-semibold text-[var(--foreground)] block">
                                arrastra una imagen aquí o <span className="text-primary-500 font-extrabold hover:underline">haz clic para buscarla</span>
                              </span>
                              <span className="text-xs text-[var(--muted-foreground)] mt-1.5 block">Formatos: JPG, PNG, GIF (Máx. 5MB)</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      if (event.target?.result) {
                                        setHistoryFormData({ ...historyFormData, imageUrl: event.target.result as string });
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
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
                      <h3 className="font-bold text-sm text-[var(--muted-foreground)] uppercase tracking-widest flex items-center gap-2">
                        <Activity size={18} className="text-primary-500" /> Plan de Tratamiento
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--muted)]/50 border border-[var(--border)] shadow-sm">
                           <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Programadas</span>
                           <span className="bg-primary-500 text-white text-xs font-black px-2 py-0.5 rounded-md">{prescribedSessionsCount}</span>
                        </div>
                      </div>
                    </div>

                    {Array.from({ length: prescribedSessionsCount }).map((_, i) => (
                      <div key={i} className="group relative flex flex-col md:flex-row items-center gap-4 p-5 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20 hover:border-primary-300 transition-all duration-300 hover:shadow-md">
                        <div className="flex flex-col gap-2 shrink-0 md:self-start">
                           <div className="flex items-center justify-between md:flex-col md:gap-2">
                              <span className="font-black text-[var(--foreground)] w-full md:w-32 bg-[var(--card)] px-4 py-3 rounded-xl border border-[var(--border)] text-xs shadow-sm inline-block text-center uppercase tracking-widest">
                                Sesión {i + 1}
                              </span>
                              {prescribedSessionsCount > 1 && (
                                <button 
                                  type="button"
                                  onClick={() => removeSession(i)}
                                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                  title="Eliminar sesión"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                           </div>
                        </div>
                        <div className="flex-1 w-full space-y-3">
                          <div className="flex flex-col md:flex-row gap-3">
                            <div className="md:flex-1 w-full space-y-2">
                              <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase ml-2 mb-1">Técnicas</p>
                              <div className="relative">
                                <select 
                                  className="w-full px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium appearance-none"
                                  value=""
                                  onChange={(e) => {
                                    const t = e.target.value;
                                    const next = [...sessionTechniques];
                                    const current = next[i] || [];
                                    if (!current.includes(t)) {
                                      next[i] = [...current, t];
                                      setSessionTechniques(next);
                                    }
                                  }}
                                >
                                  <option value="" disabled>Agregar técnica...</option>
                                  {TECHNIQUES_OPTIONS.filter(t => !sessionTechniques[i]?.includes(t)).map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--muted-foreground)]">
                                  <Plus size={16} />
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-[var(--muted)]/30 rounded-xl border border-[var(--border)]/50">
                                {(!sessionTechniques[i] || sessionTechniques[i].length === 0) && (
                                  <div className="flex items-center justify-center w-full h-full opacity-50 italic text-xs py-1 text-[var(--muted-foreground)]">
                                    Ninguna técnica seleccionada
                                  </div>
                                )}
                                {sessionTechniques[i]?.map(t => (
                                  <motion.div 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    key={t} className="bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] pl-3 pr-1 py-1.5 rounded-lg flex items-center gap-2 shadow-sm group">
                                    <span className="text-xs font-semibold">{t}</span>
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        const next = [...sessionTechniques];
                                        next[i] = (next[i] || []).filter(x => x !== t);
                                        setSessionTechniques(next);
                                      }}
                                      className="w-6 h-6 rounded-md text-[var(--muted-foreground)] flex items-center justify-center hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/20 transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 w-full md:w-auto shrink-0 md:self-start">
                              <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase ml-2 mb-1">Fecha de Cita</label>
                              <input 
                                required
                                type="date"
                                value={sessionDates[i] || ''}
                                onChange={(e) => {
                                  const next = [...sessionDates];
                                  next[i] = e.target.value;
                                  setSessionDates(next);
                                }}
                                className="w-full md:w-auto px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium text-[var(--foreground)]"
                              />
                            </div>
                          </div>
                          <input 
                            required
                            type="text"
                            placeholder="Descripción o instrucciones para el personal médico..."
                            value={sessionDescriptions[i] || ''}
                            onChange={(e) => {
                              const next = [...sessionDescriptions];
                              next[i] = e.target.value;
                              setSessionDescriptions(next);
                            }}
                            className="w-full px-4 py-2.5 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          />
                        </div>
                      </div>
                    ))}

                    <div className="pt-2">
                      <button 
                        type="button" 
                        onClick={() => handleSessionsChange(prescribedSessionsCount + 1)}
                        className="w-full flex items-center justify-center gap-3 bg-primary-500 hover:bg-primary-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-primary-500/25 active:scale-[0.99]"
                      >
                        <Plus size={20} />
                        <span>Agregar Nueva Sesión al Tratamiento</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-6 border-t border-[var(--border)]">
                    <button type="button" onClick={() => setHistoryModalStep(1)} className="px-5 py-2.5 rounded-xl border border-[var(--border)] font-medium hover:bg-[var(--muted)]">← Volver</button>
                    <button type="submit" className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-primary-500/20 flex items-center gap-2">Guardar Tratamiento <Check size={18} /></button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: PROCEDIMIENTO INVASIVO (Sólo Médico) */}
      <AnimatePresence>
        {showInvasiveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 20 }}
               className="bg-[var(--card)] p-6 sm:p-8 rounded-[2rem] w-full max-w-2xl shadow-2xl border border-[var(--border)] my-auto flex flex-col overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--foreground)]">
                  <Syringe className="text-orange-500 animate-pulse" /> Registrar Procedimiento Invasivo
                </h2>
                <button 
                  type="button"
                  onClick={() => setShowInvasiveModal(false)}
                  className="p-1.5 hover:bg-[var(--muted)] rounded-full transition-colors text-[var(--muted-foreground)]"
                >
                  <Minus size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateInvasiveProcedure} className="space-y-5">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                    Tipo de Procedimiento Invasivo
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Ej. Punción Seca, EPI, Acupuntura Clínica..."
                    value={invasiveFormData.procedureName}
                    onChange={(e) => setInvasiveFormData({ ...invasiveFormData, procedureName: e.target.value })}
                    className="w-full bg-[var(--muted)]/50 border border-[var(--border)] focus:border-orange-400 p-3 rounded-xl outline-none transition-colors text-sm font-semibold text-[var(--foreground)]"
                    list="invasive-suggestions"
                  />
                  <datalist id="invasive-suggestions">
                    <option value="Punción Seca de Puntos Gatillo (Miofascial)" />
                    <option value="Electrólisis Percutánea Intratisular (EPI)" />
                    <option value="Acupuntura Clínica Segmentaria" />
                    <option value="Neuromodulación Percutánea Ecoguíada" />
                    <option value="Infiltración de Corticoides/Colágeno" />
                  </datalist>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['Punción Seca', 'EPI', 'Acupuntura', 'Neuromodulación'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setInvasiveFormData({ ...invasiveFormData, procedureName: opt })}
                        className="bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] text-[10px] uppercase font-bold px-2.5 py-1 rounded-md border border-[var(--border)] hover:border-orange-300 transition-colors"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                    Descripción, Dosificación y Abordaje Clínico
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describa el abordaje realizado, calibre de aguja empleada, zona anatómica exacta, tolerancia del paciente, presencia de respuesta espasmódica local (REl) y medidas de asepsia y bioseguridad tomadas."
                    value={invasiveFormData.description}
                    onChange={(e) => setInvasiveFormData({ ...invasiveFormData, description: e.target.value })}
                    className="w-full bg-[var(--muted)]/50 border border-[var(--border)] focus:border-orange-400 p-3 rounded-xl outline-none transition-colors text-sm leading-relaxed resize-none font-medium h-32 text-[var(--foreground)]"
                  />
                </div>

                <div className="bg-[var(--muted)]/50 p-4 rounded-xl border border-[var(--border)] text-xs text-[var(--muted-foreground)] leading-relaxed font-semibold">
                  <p className="flex items-start gap-2">
                    <ShieldAlert size={16} className="text-orange-500 shrink-0 mt-0.5 animate-bounce" />
                    <span>
                      <strong className="text-[var(--foreground)]">Consentimiento de Bioseguridad:</strong> Al registrar este procedimiento confirma que se ha obtenido el consentimiento informado del paciente, que el abordaje se realiza bajo estrictas condiciones de asepsia y que el expediente médico quedará legalmente respaldado bajo la firma del médico 
                      <strong className="text-[var(--foreground)]"> {currentUser?.fullName}</strong>.
                    </span>
                  </p>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button 
                    type="button"
                    onClick={() => setShowInvasiveModal(false)}
                    className="bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isInvasiveSubmitting}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all shadow-md shadow-orange-600/20 flex items-center gap-2"
                  >
                    {isInvasiveSubmitting ? 'Firmando...' : 'Guardar y Firmar'}
                    <Syringe size={16} />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REGISTRAR/EDITAR SESIÓN */}
      <AnimatePresence>
        {showSessionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 20 }}
               className="bg-[var(--card)] p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] w-full max-w-4xl shadow-2xl border border-[var(--border)] my-auto max-h-[95vh] flex flex-col overflow-hidden"
            >
              <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2 shrink-0"><Activity className="text-primary-500"/> Registro de Evolución ({sessions.length + 1}° Sesión)</h2>
              <form onSubmit={handlePrepareSession} className="space-y-4 overflow-y-auto px-4 py-2 pb-4">
                {history && (
                  <div className="p-4 sm:p-6 bg-[var(--muted)]/20 border border-[var(--border)] rounded-2xl mb-4 sm:mb-6 text-center shadow-sm">
                     <p className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-3 sm:mb-4">Instrucciones del Médico</p>
                     
                     <div className="mb-3 sm:mb-4">
                       <p className="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Técnicas a aplicar</p>
                       <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                         {Array.isArray(history.prescribedTechniques[sessions.length]) && history.prescribedTechniques[sessions.length].length > 0 ? (
                           history.prescribedTechniques[sessions.length].map((t, idx) => (
                             <span key={idx} className="bg-[var(--card)] text-[var(--foreground)] text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-lg border border-[var(--border)] uppercase tracking-tight shadow-sm">
                               {t}
                             </span>
                           ))
                         ) : (
                           <span className="font-bold text-[var(--muted-foreground)] border border-dashed border-[var(--border)] px-4 py-1.5 rounded-lg text-sm">No especificadas</span>
                         )}
                       </div>
                     </div>

                     {history.prescribedDescriptions && history.prescribedDescriptions[sessions.length] && (
                       <div className="border-t border-[var(--border)] pt-4 mt-2">
                         <p className="text-xs font-black text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Descripción / Indicaciones</p>
                         <p className="text-base text-[var(--foreground)] font-medium leading-relaxed max-w-2xl mx-auto">
                           {history.prescribedDescriptions[sessions.length]}
                         </p>
                       </div>
                     )}
                  </div>
                )}
                <div className="text-left">
                  <label className="block text-sm font-medium mb-1.5">Evolución Clínica</label>
                  <textarea required name="description" rows={3} defaultValue={pendingSession?.description} placeholder="Detalle cómo respondió el paciente a la terapia..." className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500 resize-none leading-relaxed" />
                </div>
                <div className="text-left">
                  <label className="block text-sm font-medium mb-1.5">Descripción Adicional de Atención (Opcional)</label>
                  <textarea name="attentionDescription" rows={2} defaultValue={pendingSession?.attentionDescription} placeholder="Observaciones adicionales, incidentes, etc..." className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500 resize-none leading-relaxed" />
                </div>
                <div className="pt-2">
                  <div className="bg-transparent border border-[var(--border)] rounded-xl p-3 mb-6 flex gap-3 text-orange-800 dark:text-orange-400 text-sm">
                    <ShieldAlert size={20} className="shrink-0" />
                    <p>Al guardar, se requerirá tu firma digital (DNI y Contraseña). Este registro quedará inmutable salvo autorización médica.</p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setShowSessionModal(false)} className="px-5 py-2.5 rounded-xl border border-[var(--border)] font-medium hover:bg-[var(--muted)]">Cancelar</button>
                    <button type="submit" className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2">
                      <Check size={18} /> Continuar a Firma
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: AUTENTICACIÓN POR ACCIÓN (FIRMA / OVERRIDE) */}
      <AnimatePresence>
        {showSignatureModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="bg-[var(--card)] p-8 rounded-3xl w-full max-w-sm shadow-2xl border border-[var(--border)] shadow-primary-500/10 text-center"
            >
              <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/30 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
                 {signatureTarget === 'OVERRIDE' ? <Lock size={32} /> : <FileText size={32} />}
              </div>
              <h2 className="text-xl font-bold mb-2">
                {signatureTarget === 'OVERRIDE' ? 'Autorización Médica' : 'Firma Digital'}
              </h2>
              <p className="text-sm text-[var(--muted-foreground)] mb-6">
                {signatureTarget === 'OVERRIDE' 
                  ? 'Ingrese credenciales de MÉDICO para desbloquear edición.'
                  : 'Valide su identidad para firmar esta sesión.'}
              </p>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setAuthError('');
                  const fd = new FormData(e.currentTarget);
                  const dni = fd.get('sg_dni') as string;
                  const pass = fd.get('sg_pass') as string;
                  const u = db.getUserByDni(dni);
                  if (u && u.passwordHash === pass) {
                    if (signatureTarget === 'OVERRIDE' && u.role !== 'MEDICO') {
                      setAuthError('Sólo un médico puede autorizar esta acción.');
                      return;
                    }
                    if (signatureTarget === 'OVERRIDE') {
                      // Authorization granted to open the edit modal
                      setShowSignatureModal(false);
                      setShowSessionModal(true); // Re-open with pendingSession hydrated
                    } else {
                      // Signature granted to save
                      handleSignatureSuccess(u);
                    }
                  } else {
                    setAuthError('Credenciales incorrectas');
                  }
                }} 
                className="space-y-4 text-left"
              >
                {authError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200 text-center">
                    {authError}
                  </div>
                )}
                <div>
                  <input required name="sg_dni" placeholder="DNI del profesional" className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-center font-medium" />
                </div>
                <div>
                  <input required type="password" name="sg_pass" placeholder="Contraseña" className="w-full px-4 py-3 bg-transparent border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-center font-medium" />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={handleSignatureModalClose} className="w-full py-3 rounded-xl border border-[var(--border)] font-medium">Cancelar</button>
                  <button type="submit" className="w-full bg-primary-600 dark:bg-primary-500 text-white font-bold py-3 rounded-xl shadow-lg border-2 border-transparent focus:ring-4 focus:ring-primary-500/50 transition-all">
                    Validar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUCCESS ANIMATION OVERLAY */}
      <AnimatePresence>
        {showSuccessOverlay && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0, transition: { delay: 1, duration: 1 } }}
               className="absolute inset-0 bg-emerald-50/90 dark:bg-emerald-950/90 backdrop-blur-md"
             />
             
             {/* Relaxing Particles Background */}
             <div className="absolute inset-0 overflow-hidden pointer-events-none">
               {[...Array(20)].map((_, i) => (
                 <motion.div
                   key={i}
                   className="absolute bg-white/60 dark:bg-emerald-500/10 rounded-full"
                   style={{
                     width: Math.random() * 60 + 20,
                     height: Math.random() * 60 + 20,
                     left: `${Math.random() * 100}%`,
                     top: `${Math.random() * 100}%`,
                   }}
                   animate={{
                     y: [0, -150 - Math.random() * 150],
                     x: Math.random() * 100 - 50,
                     opacity: [0, 0.6, 0],
                     scale: [0.5, 1.2, 0.8],
                   }}
                   transition={{
                     duration: Math.random() * 4 + 3,
                     repeat: Infinity,
                     ease: "easeInOut",
                     delay: Math.random() * 2
                   }}
                 />
               ))}
             </div>

             <motion.div 
               initial={{ scale: 0.5, opacity: 0, y: 50 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 1.1, opacity: 0, y: -50, transition: { duration: 0.5 } }}
               transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
               className="relative z-10 flex flex-col items-center text-center bg-[var(--card)]/95 backdrop-blur-xl p-10 rounded-2xl shadow-2xl border border-[var(--border)] max-w-sm w-full"
             >
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', bounce: 0.6, delay: 0.2, duration: 0.8 }}
                  className="relative w-20 h-20 bg-emerald-100/40 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-200/30 dark:border-emerald-800/20"
                >
                  <Sparkles size={18} className="absolute -top-1.5 -right-1.5 text-amber-500 dark:text-amber-400 animate-pulse" />
                  <Sparkles size={14} className="absolute -bottom-1 -left-1.5 text-emerald-500 dark:text-teal-400 animate-pulse delay-300" />
                  <Check size={36} strokeWidth={3} className="relative z-10 animate-bounce" style={{ animationDuration: '2s' }} />
                </motion.div>
               
               <h2 className="text-2xl font-black text-[var(--foreground)] mb-1 leading-tight select-none">
                 ¡Buen Trabajo!
               </h2>
               <p className="text-[var(--muted-foreground)] text-lg font-medium mb-6 select-none">
                 {successSignerName}
               </p>
               <p className="text-emerald-950 dark:text-emerald-300 font-extrabold bg-emerald-100 dark:bg-emerald-950/45 px-5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800/40 w-full select-none text-sm shadow-inner">
                 Atención registrada con éxito
               </p>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Success Overlay */}
      <AnimatePresence>
        {showDeleteSuccessOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 isolate">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.6 } }}
              className="absolute inset-0 bg-red-950/20 backdrop-blur-sm"
            />
             <motion.div 
               initial={{ scale: 0.5, opacity: 0, y: 50 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 1.1, opacity: 0, y: -50, transition: { duration: 0.5 } }}
               transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
               className="relative z-10 flex flex-col items-center text-center bg-[var(--card)]/90 backdrop-blur-lg p-10 rounded-3xl shadow-2xl border border-[var(--border)] max-w-sm w-full"
             >
               <motion.div 
                 initial={{ scale: 0, rotate: -180 }}
                 animate={{ scale: 1, rotate: 0 }}
                 transition={{ type: 'spring', bounce: 0.6, delay: 0.2, duration: 0.8 }}
                 className="w-24 h-24 bg-gradient-to-tr from-red-100 to-rose-50 dark:from-red-900/40 dark:to-rose-900/20 text-red-500 rounded-full flex items-center justify-center mb-8 shadow-inner shadow-red-200/50 dark:shadow-none"
               >
                 <Trash2 size={48} strokeWidth={3} className="relative z-10" />
               </motion.div>
               
               <h2 className="text-3xl font-black text-red-900 dark:text-red-100 mb-3 flex items-center gap-2 justify-center leading-tight">
                 Eliminado
               </h2>
               <p className="text-red-600 dark:text-red-400 font-semibold bg-red-100/50 dark:bg-red-900/30 px-5 py-2.5 rounded-xl border border-red-200/50 dark:border-red-800/40 w-full">
                 La evaluación ha sido eliminada con éxito
               </p>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED INTERACTIVE ZOOM MODAL */}
      <AnimatePresence>
        {zoomedImage && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md select-none">
            
            {/* Header with control utilities */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10 text-white">
              <div className="flex items-center gap-2">
                <ImageIcon className="text-primary-400" size={18} />
                <span className="text-sm font-bold tracking-tight">Imagen de Referencia Clínica</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-neutral-900/90 border border-neutral-800 rounded-xl px-2.5 py-1.5 gap-2 shadow-lg backdrop-blur-xl">
                  <button 
                    type="button"
                    onClick={() => setZoomScale(s => Math.max(0.25, s - 0.25))}
                    className="p-1 px-2 text-xs font-black rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Alejar"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-xs font-bold font-mono min-w-[45px] text-center">{Math.round(zoomScale * 100)}%</span>
                  <button 
                    type="button"
                    onClick={() => setZoomScale(s => Math.min(5, s + 0.25))}
                    className="p-1 px-2 text-xs font-black rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Acercar"
                  >
                    <Plus size={14} />
                  </button>
                  <div className="w-px h-4 bg-neutral-800" />
                  <button 
                    type="button"
                    onClick={() => {
                      setZoomScale(1);
                      setZoomPosition({ x: 0, y: 0 });
                    }}
                    className="p-1 text-xs font-bold rounded-lg hover:bg-neutral-800 transition-colors text-primary-400 cursor-pointer"
                    title="Reiniciar Vista"
                  >
                    Resetear
                  </button>
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    setZoomedImage(null);
                    setZoomScale(1);
                    setZoomPosition({ x: 0, y: 0 });
                  }}
                  className="p-2.5 bg-neutral-900/90 border border-neutral-800 hover:bg-red-600 hover:border-red-500 hover:text-white text-white rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center"
                  title="Cerrar Visualizador"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drag & pan canvas */}
            <div 
              className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing p-4"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingZoom(true);
                setDragStartZoom({ x: e.clientX - zoomPosition.x, y: e.clientY - zoomPosition.y });
              }}
              onMouseMove={(e) => {
                if (!isDraggingZoom) return;
                setZoomPosition({
                  x: e.clientX - dragStartZoom.x,
                  y: e.clientY - dragStartZoom.y
                });
              }}
              onMouseUp={() => setIsDraggingZoom(false)}
              onMouseLeave={() => setIsDraggingZoom(false)}
              onWheel={(e) => {
                const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
                setZoomScale(s => Math.min(5, Math.max(0.25, s + zoomDelta)));
              }}
            >
              <motion.img 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ 
                  transform: `translate(${zoomPosition.x}px, ${zoomPosition.y}px) scale(${zoomScale})`,
                  transition: isDraggingZoom ? 'none' : 'transform 0.1s ease-out'
                }}
                src={zoomedImage} 
                className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl shadow-2xl select-none pointer-events-none border border-neutral-800/40"
                alt="Médica Detallada"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Instruction Footer banner */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-neutral-950/80 px-5 py-2.5 border border-neutral-800 text-neutral-400 rounded-full text-xs font-semibold shadow-2xl backdrop-blur-md pointer-events-none flex items-center gap-2">
              <span>💡 Arrastra la imagen para moverla • Usa la rueda del mouse o los botones de zoom</span>
            </div>
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
        {/* Modal-like backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px]"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] flex flex-col items-center gap-6 bg-[var(--card)] p-10 rounded-[2.5rem] shadow-2xl border border-[var(--border)] text-center min-w-[320px]"
        >
          <div className="w-20 h-20 bg-secondary-50 dark:bg-secondary-900/40 text-secondary-500 rounded-full flex items-center justify-center shadow-lg shadow-secondary-500/10">
            <ShieldCheck size={40} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Registro Seguro</h3>
            <p className="text-[var(--muted-foreground)] font-medium">El tratamiento ha sido guardado e incriptado exitosamente en el historial del paciente.</p>
          </div>
          <div className="flex items-center gap-2 text-secondary-600 dark:text-secondary-400 font-bold bg-secondary-50 dark:bg-secondary-900/30 px-4 py-2 rounded-xl text-sm">
            <Check size={16} strokeWidth={3} /> Operación Exitosa
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
