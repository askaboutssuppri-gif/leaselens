export interface AnalyzeReport {
  lease_id: string;
  health_score: number;
  summary: string;
  key_terms: {
    monthly_rent: number | null;
    deposit: number | null;
    lease_start: string | null;
    lease_end: string | null;
    late_fee: string | null;
    notice_period_days: number | null;
    pet_policy: string | null;
    utilities_included: string | null;
  };
  findings: {
    severity: 'high' | 'medium' | 'low';
    category: string;
    clause_text: string;
    plain_english: string;
    why_it_matters: string;
    negotiation_tip: string;
  }[];
  state_notes: string[];
  disclaimer: string;
}

export interface ScanSession {
  source: 'camera' | 'pdf';
  title: string;
  pageCount: number;
  imageUris: string[];
}

let currentSession: ScanSession | null = null;

export function setScanSession(session: ScanSession | null) {
  currentSession = session;
}

export function getScanSession(): ScanSession | null {
  return currentSession;
}

export function clearScanSession() {
  currentSession = null;
}

let currentReport: AnalyzeReport | null = null;

export function setAnalyzeReport(report: AnalyzeReport | null) {
  currentReport = report;
}

export function getAnalyzeReport(): AnalyzeReport | null {
  return currentReport;
}

export function clearAnalyzeReport() {
  currentReport = null;
}
