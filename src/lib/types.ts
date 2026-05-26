// Type definitions previously in mockDb.ts
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
  imageUrl?: string;
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
