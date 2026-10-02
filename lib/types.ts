export type Severity = 'high' | 'medium' | 'low';

export interface Profile {
  id: string;
  state_code: string | null;
  free_scans_used: number;
  paid_scans_date: string | null;
  paid_scans_used_today: number;
  lease_end_date: string | null;
  renewal_reminder_sent: boolean;
  created_at: string;
}

export interface Lease {
  id: string;
  user_id: string;
  title: string;
  page_count: number | null;
  raw_pdf_path: string | null;
  health_score: number | null;
  summary: string | null;
  state_notes: string[] | null;
  created_at: string;
}

export interface Finding {
  id: string;
  lease_id: string;
  severity: Severity;
  category: string;
  clause_text: string;
  plain_english: string;
  why_it_matters: string;
  negotiation_tip: string;
  created_at: string;
}

export interface KeyTerms {
  lease_id: string;
  monthly_rent: number | null;
  deposit: number | null;
  lease_start: string | null;
  lease_end: string | null;
  late_fee: string | null;
  notice_period_days: number | null;
  pet_policy: string | null;
  utilities_included: string | null;
  created_at: string;
}

export interface Subscription {
  user_id: string;
  status: 'active' | 'expired' | 'canceled';
  plan: 'free' | 'pro';
  expires_at: string | null;
  created_at: string;
}
