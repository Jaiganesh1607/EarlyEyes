export type RiskLevel = 'urgent' | 'monitor' | 'ok';

export type Assessment = {
  id: string;
  timestamp: number;
  risk_level: RiskLevel;
  indicators: string[];
  plain_language?: string;
  tell_doctor?: string;
  facility_id?: string | null;
  language?: string;
  input_type?: string;
  confidence?: number;
};
