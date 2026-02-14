export interface EmployeeData {
  name: string;
  title: string;
  hireDate: string;
  address: string;
  isFunktionaer: boolean; // Is salaried under Funktionærloven
}

export interface TerminationRequest {
  employee: EmployeeData;
  terminationDate: string; // The day the decision is made/letter given
  reason: string;
  notes?: string;
}

export interface TerminationResponse {
  isValidReason: boolean;
  calculatedNoticePeriod: string; // e.g., "3 months"
  lastWorkingDay: string;
  legalReference: string;
  letterContent: string;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
