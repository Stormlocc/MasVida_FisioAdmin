export type Role = 'MEDICO' | 'FISIOTERAPEUTA' | 'ADMISION';

export interface User {
  id: string;
  fullName: string;
  dni: string;
  passwordHash: string;
  role: Role;
  active: boolean;
  gender?: string; // MASCULINO, FEMENINO, OTRO
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  email: string;
  address: string;
  birthDate?: string;
  gender?: string; // MASCULINO, FEMENINO, OTRO
  status: 'ACTIVO' | 'FINALIZADO' | 'SUSPENDIDO';
  createdAt: number;
}

export interface ClinicalHistory {
  id: string;
  patientId: string;
  doctorId: string; 
  anamnesis: string;
  antecedentes: string;
  physicalExam: string;
  cie10Code: string;
  cie10Description: string;
  prescribedSessions: number;
  prescribedTechniques: string[][];
  prescribedDescriptions?: string[];
  prescribedDates?: string[];
  createdAt: number;
}

export interface SessionRecord {
  id: string;
  patientId: string;
  historyId: string;
  therapistId: string;
  technique: string[];
  description: string;
  attentionDescription?: string;
  scheduledDate?: string;
  signedAt: number;
  isEdited: boolean;
  editedBy?: string; // Doctor ID
  editReason?: string;
  editDate?: number;
}

export interface InvasiveProcedure {
  id: string;
  patientId: string;
  historyId?: string;
  doctorId: string;
  procedureName: string;
  description: string;
  signedAt: number;
}


// Initial Mock DB State
const MOCK_USERS: User[] = [
  {
    id: 'u-admin-1',
    fullName: 'Dr. Administrador',
    dni: 'admin',
    passwordHash: 'admin',
    role: 'MEDICO',
    active: true,
  },
  {
    id: 'u-fisio-1',
    fullName: 'Lic. Fisioterapeuta',
    dni: 'fisio',
    passwordHash: 'fisio',
    role: 'FISIOTERAPEUTA',
    active: true,
  },
  {
    id: 'u-admision-1',
    fullName: 'Personal de Admisión',
    dni: 'admision',
    passwordHash: 'admision',
    role: 'ADMISION',
    gender: 'FEMENINO',
    active: true,
  },
  {
    id: 'u-fisio-2',
    fullName: 'Lic. Roberto Sánchez',
    dni: 'fisio2',
    passwordHash: 'fisio2',
    role: 'FISIOTERAPEUTA',
    active: true,
  },
  {
    id: 'u-fisio-3',
    fullName: 'Lic. Elena Torres',
    dni: 'fisio3',
    passwordHash: 'fisio3',
    role: 'FISIOTERAPEUTA',
    active: true,
  }
];

const SYNTHETIC_PATIENTS: Patient[] = [
  {
    id: 'p-1',
    firstName: 'Juan',
    lastName: 'Pérez García',
    dni: '12345678',
    phone: '987654321',
    email: 'juan.perez@email.com',
    address: 'Av. Siempre Viva 123, Lima',
    birthDate: '1980-05-15',
    gender: 'MASCULINO',
    status: 'ACTIVO',
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000
  },
  {
    id: 'p-2',
    firstName: 'María',
    lastName: 'González López',
    dni: '87654321',
    phone: '912345678',
    email: 'maria.gonzalez@email.com',
    address: 'Calle Los Pinos 456, Arequipa',
    birthDate: '1992-10-20',
    gender: 'FEMENINO',
    status: 'ACTIVO',
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000
  },
  {
    id: 'p-3',
    firstName: 'Carlos',
    lastName: 'Rojas Díaz',
    dni: '11223344',
    phone: '955443322',
    email: 'carlos.rojas@email.com',
    address: 'Urb. Los Jardines B-12, Trujillo',
    birthDate: '1975-03-12',
    gender: 'MASCULINO',
    status: 'ACTIVO',
    createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000
  },
  {
    id: 'p-4',
    firstName: 'Ana',
    lastName: 'Bermúdez Soto',
    dni: '44332211',
    phone: '944332211',
    email: 'ana.bermudez@email.com',
    address: 'Av. El Sol 789, Cusco',
    birthDate: '1988-12-05',
    gender: 'FEMENINO',
    status: 'ACTIVO',
    createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000
  },
  {
    id: 'p-5',
    firstName: 'Luis',
    lastName: 'Mendoza Ruiz',
    dni: '55667788',
    phone: '966778899',
    email: 'luis.mendoza@email.com',
    address: 'Calle Real 101, Huancayo',
    birthDate: '1960-08-25',
    gender: 'MASCULINO',
    status: 'ACTIVO',
    createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000
  },
  {
    id: 'p-6',
    firstName: 'Rosa',
    lastName: 'Vargas Chang',
    dni: '99887766',
    phone: '988776655',
    email: 'rosa.vargas@email.com',
    address: 'Jr. Ica 234, Lima',
    birthDate: '1995-02-14',
    gender: 'FEMENINO',
    status: 'ACTIVO',
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000
  },
  {
    id: 'p-7',
    firstName: 'Jorge',
    lastName: 'Castro Luna',
    dni: '77665544',
    phone: '977665544',
    email: 'jorge.castro@email.com',
    address: 'Pasaje San Martín 56, Chiclayo',
    birthDate: '1983-06-30',
    gender: 'MASCULINO',
    status: 'ACTIVO',
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
  }
];

const SYNTHETIC_HISTORIES: ClinicalHistory[] = [
  {
    id: 'h-1',
    patientId: 'p-1',
    doctorId: 'u-admin-1',
    anamnesis: 'Paciente refiere dolor lumbar intenso irradiado a miembro inferior derecho tras sobreesfuerzo laboral hace 1 semana. Dificultad para bipedestación prolongada.',
    antecedentes: 'HTA controlada. Sedentarismo. Hernia discal L4-L5 diagnosticada hace 2 años.',
    physicalExam: 'Dolor a la palpación en zona lumbar baja. Maniobra de Lasègue positiva a 45° en MID. Reflejos conservados, sensibilidad levemente disminuida en dermatoma L5 derecho.',
    cie10Code: 'M54.4',
    cie10Description: 'Lumbago con ciática',
    prescribedSessions: 5,
    prescribedTechniques: [
      ['Masoterapia', 'Termoterapia'],
      ['Cinesiterapia', 'Electroterapia'],
      ['Punción Seca', 'Masoterapia'],
      ['Ejercicio Terapéutico'],
      ['Ejercicio Terapéutico', 'Cinesiterapia']
    ],
    prescribedDates: ['2026-05-10', '2026-05-12', '2026-05-14', '2026-05-17', '2026-05-19'],
    prescribedDescriptions: ['Relajar musculatura', 'Bajar dolor', 'Liberar puntos gatillo', 'Fortalecer core', 'Avanzar fortalecimiento'],
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000
  },
  {
    id: 'h-2',
    patientId: 'p-2',
    doctorId: 'u-admin-1',
    anamnesis: 'Dolor cervical y cefalea tensional progresiva de 3 meses de evolución, asociado a estrés y teletrabajo. Empeora al final del día.',
    antecedentes: 'Ninguno de relevancia.',
    physicalExam: 'Contractura evidente en trapecios y ECOM bilateral. Restricción de rotación cervical. Puntos gatillo activos en angular de la escápula.',
    cie10Code: 'M53.1',
    cie10Description: 'Síndrome cervicobraquial',
    prescribedSessions: 5,
    prescribedTechniques: [
      ['Masoterapia', 'Estiramientos'],
      ['Masoterapia', 'Termoterapia'],
      ['Punción Seca', 'Masoterapia'],
      ['Cinesiterapia'],
      ['Ejercicio Terapéutico']
    ],
    prescribedDates: ['2026-05-15', '2026-05-17', '2026-05-19', '2026-05-22', '2026-05-24'],
    prescribedDescriptions: ['Relajación miofascial', 'Continuar masaje', 'Tratar PGM resistentes', 'Movilidad articular', 'Educación postural'],
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000
  },
  {
    id: 'h-3',
    patientId: 'p-3',
    doctorId: 'u-admin-1',
    anamnesis: 'Paciente con esguince de tobillo grado II (derecho) ocurrido hace 48 horas durante práctica deportiva.',
    antecedentes: 'Sin fracturas previas. Deportista amateur.',
    physicalExam: 'Edema marcado en maleolo externo, equimosis lateral. Dolor intenso a la inversión pasiva. Cajón anterior levemente positivo.',
    cie10Code: 'S93.4',
    cie10Description: 'Esguince y torcedura de los ligamentos del tobillo',
    prescribedSessions: 10,
    prescribedTechniques: Array(10).fill(['Crioterapia', 'Vendaje Funcional', 'Magnetoterapia']),
    prescribedDates: Array.from({length: 10}, (_, i) => `2026-05-${12+i}`),
    prescribedDescriptions: Array(10).fill('Control de inflamación y protección articular'),
    createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000
  },
  {
    id: 'h-4',
    patientId: 'p-4',
    doctorId: 'u-admin-1',
    anamnesis: 'Tendinopatía de manguito rotador izquierdo de larga data (6 meses). Dolor nocturno que impide el sueño.',
    antecedentes: 'Trabajo administrativo (mucho uso de mouse).',
    physicalExam: 'Arco doloroso positivo a los 90°. Prueba de Jobe positiva. Limitación en rotación interna.',
    cie10Code: 'M75.1',
    cie10Description: 'Síndrome del manguito rotatorio',
    prescribedSessions: 8,
    prescribedTechniques: Array(8).fill(['Ondas de Choque', 'Cinesiterapia']),
    prescribedDates: Array.from({length: 8}, (_, i) => `2026-05-${10+i*2}`),
    prescribedDescriptions: Array(8).fill('Regeneración tendinosa y movilidad'),
    createdAt: Date.now() - 12 * 24 * 60 * 60 * 1000
  },
  {
    id: 'h-5',
    patientId: 'p-5',
    doctorId: 'u-admin-1',
    anamnesis: 'Post-operado de reemplazo total de cadera derecha hace 3 semanas. Inicia rehabilitación ambulatoria.',
    antecedentes: 'Coxartrosis grado IV.',
    physicalExam: 'Cicatriz bien afrontada. Atrofia de cuádriceps y glúteos. Marcha con andador.',
    cie10Code: 'Z96.6',
    cie10Description: 'Presencia de implantes ortopédicos de articulaciones (Cadera)',
    prescribedSessions: 20,
    prescribedTechniques: Array(20).fill(['Cinesiterapia', 'Fortalecimiento Muscular', 'Reeducación de la Marcha']),
    prescribedDates: Array.from({length: 20}, (_, i) => `2026-04-${10+i}`),
    prescribedDescriptions: Array(20).fill('Recuperar autonomía y fuerza'),
    createdAt: Date.now() - 40 * 24 * 60 * 60 * 1000
  }
];

const SYNTHETIC_SESSIONS: SessionRecord[] = [
  {
    id: 's-1',
    patientId: 'p-1',
    historyId: 'h-1',
    therapistId: 'u-fisio-1',
    technique: ['Masoterapia', 'Termoterapia'],
    description: 'Relajar musculatura',
    attentionDescription: 'Se aplicó termoterapia seguida de masoterapia descontracturante profunda en zona lumbar. Paciente refiere alivio inmediato del 40%.',
    scheduledDate: '2026-05-10',
    signedAt: Date.now() - 19 * 24 * 60 * 60 * 1000,
    isEdited: false
  },
  {
    id: 's-2',
    patientId: 'p-1',
    historyId: 'h-1',
    therapistId: 'u-fisio-1',
    technique: ['Cinesiterapia', 'Electroterapia'],
    description: 'Bajar dolor',
    attentionDescription: 'Aplicación de TENS en dolor lumbar y ejercicios suaves de movilidad pélvica (estiramientos). Tolerancia buena.',
    scheduledDate: '2026-05-12',
    signedAt: Date.now() - 17 * 24 * 60 * 60 * 1000,
    isEdited: false
  },
  {
    id: 's-3',
    patientId: 'p-2',
    historyId: 'h-2',
    therapistId: 'u-fisio-1',
    technique: ['Masoterapia', 'Estiramientos'],
    description: 'Relajación miofascial',
    attentionDescription: 'Masaje miofascial en región cervical y trapecios. Estiramientos pasivos de cuello. Disminución de cefalea al final de la sesión.',
    scheduledDate: '2026-05-15',
    signedAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
    isEdited: false
  },
  {
    id: 's-4',
    patientId: 'p-3',
    historyId: 'h-3',
    therapistId: 'u-fisio-2',
    technique: ['Crioterapia', 'Vendaje Funcional'],
    description: 'Control de inflamación',
    attentionDescription: 'Se aplicó hielo por 15 min y vendaje compresivo. Se instruye reposo y elevación.',
    scheduledDate: '2026-05-12',
    signedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    isEdited: false
  },
  {
    id: 's-5',
    patientId: 'p-4',
    historyId: 'h-4',
    therapistId: 'u-fisio-3',
    technique: ['Ondas de Choque'],
    description: 'Regeneración tendinosa',
    attentionDescription: 'Primera sesión de ondas de choque. Buena tolerancia. Leve dolor post-aplicación esperado.',
    scheduledDate: '2026-05-10',
    signedAt: Date.now() - 9 * 24 * 60 * 60 * 1000,
    isEdited: false
  },
  {
    id: 's-6',
    patientId: 'p-5',
    historyId: 'h-5',
    therapistId: 'u-fisio-1',
    technique: ['Cinesiterapia'],
    description: 'Movilidad temprana',
    attentionDescription: 'Movilizaciones pasivas y asistidas de cadera. Isométricos de cuádriceps.',
    scheduledDate: '2026-04-12',
    signedAt: Date.now() - 37 * 24 * 60 * 60 * 1000,
    isEdited: false
  },
  {
    id: 's-7',
    patientId: 'p-3',
    historyId: 'h-3',
    therapistId: 'u-fisio-2',
    technique: ['Magnetoterapia', 'Crioterapia'],
    description: 'Magnetoterapia',
    attentionDescription: 'Sesión de magnetoterapia para acelerar reparación tisular. Disminución de equimosis.',
    scheduledDate: '2026-05-14',
    signedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    isEdited: false
  }
];

// Helper to interact with LocalStorage
const dbKey = 'fisioclinic_db_v3';

interface DBState {
  users: User[];
  patients: Patient[];
  histories: ClinicalHistory[];
  sessions: SessionRecord[];
  invasiveProcedures?: InvasiveProcedure[];
}

function loadDB(): DBState {
  const data = localStorage.getItem(dbKey);
  if (data) {
    const parsed = JSON.parse(data);
    if (!parsed.invasiveProcedures) {
      parsed.invasiveProcedures = [];
    }
    return parsed;
  }
  const initial = { 
    users: MOCK_USERS, 
    patients: SYNTHETIC_PATIENTS, 
    histories: SYNTHETIC_HISTORIES, 
    sessions: SYNTHETIC_SESSIONS,
    invasiveProcedures: []
  };
  localStorage.setItem(dbKey, JSON.stringify(initial));
  return initial;
}

function saveDB(state: DBState) {
  localStorage.setItem(dbKey, JSON.stringify(state));
}

export const db = {
  // Users
  getUsers: () => loadDB().users,
  getUserById: (id: string) => loadDB().users.find(u => u.id === id),
  getUserByDni: (dni: string) => loadDB().users.find(u => u.dni === dni),
  saveUser: (user: User) => {
    const s = loadDB();
    const idx = s.users.findIndex(u => u.id === user.id);
    if (idx >= 0) s.users[idx] = user;
    else s.users.push(user);
    saveDB(s);
  },
  
  // Patients
  getPatients: () => loadDB().patients,
  getPatientById: (id: string) => loadDB().patients.find(p => p.id === id),
  savePatient: (patient: Patient) => {
    const s = loadDB();
    const idx = s.patients.findIndex(p => p.id === patient.id);
    if (idx >= 0) s.patients[idx] = patient;
    else s.patients.push(patient);
    saveDB(s);
  },

  // Histories
  getHistoriesByPatientId: (patientId: string) => loadDB().histories.filter(h => h.patientId === patientId),
  getCurrentHistory: (patientId: string) => {
    const h = db.getHistoriesByPatientId(patientId);
    return h.sort((a,b) => b.createdAt - a.createdAt)[0];
  },
  saveHistory: (history: ClinicalHistory) => {
    const s = loadDB();
    const idx = s.histories.findIndex(h => h.id === history.id);
    if (idx >= 0) s.histories[idx] = history;
    else s.histories.push(history);
    saveDB(s);
  },
  deleteHistory: (historyId: string) => {
    const s = loadDB();
    s.histories = s.histories.filter(h => h.id !== historyId);
    s.sessions = s.sessions.filter(se => se.historyId !== historyId); // delete associated sessions too
    saveDB(s);
  },

  // Sessions
  getSessionsByPatientId: (patientId: string) => loadDB().sessions.filter(se => se.patientId === patientId).sort((a,b) => b.signedAt - a.signedAt),
  getSessionsByHistoryId: (historyId: string) => loadDB().sessions.filter(se => se.historyId === historyId).sort((a,b) => b.signedAt - a.signedAt),
  saveSession: (session: SessionRecord) => {
    const s = loadDB();
    const idx = s.sessions.findIndex(se => se.id === session.id);
    if (idx >= 0) s.sessions[idx] = session;
    else s.sessions.push(session);
    saveDB(s);
  },

  // Invasive Procedures
  getInvasiveProceduresByPatientId: (patientId: string) => {
    const s = loadDB();
    const list = s.invasiveProcedures || [];
    return list.filter(ip => ip.patientId === patientId).sort((a,b) => b.signedAt - a.signedAt);
  },
  saveInvasiveProcedure: (procedure: InvasiveProcedure) => {
    const s = loadDB();
    if (!s.invasiveProcedures) s.invasiveProcedures = [];
    const idx = s.invasiveProcedures.findIndex(ip => ip.id === procedure.id);
    if (idx >= 0) s.invasiveProcedures[idx] = procedure;
    else s.invasiveProcedures.push(procedure);
    saveDB(s);
  }
};
